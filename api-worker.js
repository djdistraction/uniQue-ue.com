/**
 * Cloudflare Worker - uniQue-ue API (hardened)
 *
 * Handles:
 * - /chat                : AI chat (GitHub Models)  [public]
 * - /generate-image      : Image gen (Hugging Face) [public]
 * - /contact             : Contact form (SendGrid)  [public]
 * - /admin/auth          : Issues admin session cookie (Secure, HttpOnly)
 * - /admin/revenue       : Admin (requires session cookie)
 * - /admin/paypal-payout : Admin (requires session cookie)
 *
 * Secrets required:
 * - GITHUB_PAT
 * - HUGGINGFACE_TOKEN
 * - SENDGRID_API_KEY
 * - TO_EMAIL
 * - ADMIN_ACCESS_CODE
 * - PAYPAL_CLIENT_ID
 * - PAYPAL_CLIENT_SECRET
 * - PAYPAL_RECEIVER_EMAIL
 */

const ALLOWED_ORIGIN = "https://www.unique-ue.com"; // change if you have a staging domain
const SESSION_TTL_SECONDS = 1800; // 30 minutes
const COOKIE_NAME = "admin_session";

// Simple token store (for production, use KV or Durable Object)
const tokenStore = new Map(); // token -> expiry (ms)

function makeToken() {
  return crypto.randomUUID();
}

function makeHeaders(originOk = false, contentType = "application/json") {
  const h = new Headers();
  h.set("Content-Type", contentType);
  if (originOk) {
    h.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    h.set("Access-Control-Allow-Credentials", "true");
    h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  h.set(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' https://api.paypal.com https://api-m.sandbox.paypal.com; " +
      "frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self';"
  );
  h.set("Referrer-Policy", "no-referrer");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  return h;
}

function setSessionCookie(token) {
  const expires = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toUTCString();
  return `${COOKIE_NAME}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Expires=${expires}`;
}

function getSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const parts = cookie.split(";").map((c) => c.trim());
  for (const part of parts) {
    if (part.startsWith(COOKIE_NAME + "=")) {
      return part.substring(COOKIE_NAME.length + 1);
    }
  }
  return null;
}

function validateSession(token) {
  if (!token) return false;
  const exp = tokenStore.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    tokenStore.delete(token);
    return false;
  }
  return true;
}

async function requireAuth(request) {
  const token = getSessionToken(request);
  if (!validateSession(token)) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        status: 401,
        headers: makeHeaders(false),
      }),
    };
  }
  return { ok: true };
}

// CORS preflight
function handleOptions(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = makeHeaders(origin === ALLOWED_ORIGIN);
  return new Response("", { status: 204, headers });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin") || "";
    const originOk = origin === ALLOWED_ORIGIN;
    const jsonHeaders = makeHeaders(originOk);
    const imageHeaders = makeHeaders(originOk, "image/png");

    try {
      // --- ROUTER ---
      if (path === "/chat") return await handleChat(request, env, jsonHeaders);
      if (path === "/generate-image") return await handleImageGeneration(request, env, imageHeaders, jsonHeaders);
      if (path === "/contact") return await handleContactForm(request, env, jsonHeaders);
      if (path === "/admin/auth") return await handleAuth(request, env, jsonHeaders);
      if (path === "/admin/revenue") return await handleRevenueAdmin(request, env, jsonHeaders);
      if (path === "/admin/paypal-payout") return await handlePayPalPayout(request, env, jsonHeaders);

      // legacy route deprecated
      if (path === "/admin/verify-access") {
        return new Response(JSON.stringify({ error: "Use /admin/auth" }), { status: 404, headers: jsonHeaders });
      }

      return new Response(JSON.stringify({ error: "Route not found" }), { status: 404, headers: jsonHeaders });
    } catch (error) {
      console.error("General Worker Error:", error.message);
      return new Response(JSON.stringify({ error: "An unexpected server error occurred." }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
  },
};

/* ---------------------- HANDLERS ---------------------- */

async function handleAuth(request, env, headers) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }

  const body = await request.json().catch(() => ({}));
  const { accessCode } = body || {};
  const validAccessCode = env.ADMIN_ACCESS_CODE;
  if (!validAccessCode) {
    return new Response(JSON.stringify({ success: false, message: "Server not configured" }), { status: 500, headers });
  }
  if (accessCode !== validAccessCode) {
    return new Response(JSON.stringify({ success: false, message: "Invalid access code" }), { status: 401, headers });
  }

  const token = makeToken();
  tokenStore.set(token, Date.now() + SESSION_TTL_SECONDS * 1000);
  headers.set("Set-Cookie", setSessionCookie(token));
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}

async function handleChat(request, env, headers) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }
  if (!env.GITHUB_PAT) {
    console.error("FATAL: GITHUB_PAT not configured");
    return new Response(JSON.stringify({ error: "Server configuration error. AI Chat key not configured." }), {
      status: 500,
      headers,
    });
  }

  try {
    const body = await request.json();
    let { chatHistory, systemPrompt, model = "openai/gpt-4o-mini" } = body;

    if (!chatHistory || !systemPrompt) {
      return new Response(JSON.stringify({ error: "Missing 'chatHistory' or 'systemPrompt'." }), {
        status: 400,
        headers,
      });
    }

    let refinedPromptForLog = null;
    if (chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      const lastMessageText = lastMessage.parts.map((part) => part.text).join("\n");

      if (lastMessage.role === "user" && lastMessageText.length < 100) {
        const contextMessages = [
          {
            role: "system",
            content:
              "You are a silent prompt refinement AI. Do not answer the user's prompt. Your only job is to refine the user's last message to be more effective, using the chat history for context. Output only the refined prompt.",
          },
          ...chatHistory.slice(0, -1).map((msg) => ({
            role: msg.role === "model" ? "assistant" : msg.role,
            content: msg.parts.map((part) => part.text).join("\n"),
          })),
          {
            role: "user",
            content: `Based on our conversation, refine this user's last message to be a high-quality, effective prompt. User's short prompt: "${lastMessageText}"`,
          },
        ];

        try {
          const refineResponse = await fetch("https://models.github.ai/inference/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.GITHUB_PAT}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify({ model, messages: contextMessages, temperature: 0.3 }),
          });

          if (refineResponse.ok) {
            const refineResult = await refineResponse.json();
            const refinedPrompt = refineResult.choices?.[0]?.message?.content?.trim();
            if (refinedPrompt && refinedPrompt !== lastMessageText) {
              refinedPromptForLog = refinedPrompt;
              chatHistory[chatHistory.length - 1].parts = [{ text: refinedPrompt }];
            }
          }
        } catch (refineError) {
          console.error("Prompt refinement call failed:", refineError.message);
        }
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.map((msg) => ({
        role: msg.role === "model" ? "assistant" : msg.role,
        content: msg.parts.map((part) => part.text).join("\n"),
      })),
    ];

    const apiResponse = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`GitHub Models API error (${apiResponse.status}):`, errorBody);
      return new Response(JSON.stringify({ error: "Failed to get response from AI service.", details: errorBody }), {
        status: apiResponse.status,
        headers,
      });
    }

    const result = await apiResponse.json();
    if (refinedPromptForLog) result.refined_prompt = refinedPromptForLog;

    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    console.error("Error in /chat handler:", error.message);
    return new Response(JSON.stringify({ error: "An unexpected server error occurred in chat." }), {
      status: 500,
      headers,
    });
  }
}

async function handleImageGeneration(request, env, imageHeaders, jsonHeaders) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: jsonHeaders });
  }
  if (!env.HUGGINGFACE_TOKEN) {
    console.error("FATAL: HUGGINGFACE_TOKEN not configured");
    return new Response(JSON.stringify({ error: "Server configuration error. Image Generation key not configured." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  try {
    const body = await request.json();
    const { prompt, negative_prompt = "", width = 512, height = 512 } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing 'prompt'." }), { status: 400, headers: jsonHeaders });
    }

    const model = "runwayml/stable-diffusion-v1-5";
    const apiResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: negative_prompt || "blurry, bad quality, distorted, ugly, deformed",
          num_inference_steps: 30,
          guidance_scale: 7.5,
          width,
          height,
        },
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`HuggingFace API error (${apiResponse.status}):`, errorBody);
      if (apiResponse.status === 503) {
        return new Response(
          JSON.stringify({ error: "Model is loading. Please try again in 20-30 seconds.", loading: true }),
          {
            status: 503,
            headers: { ...jsonHeaders, "Retry-After": "20" },
          }
        );
      }
      return new Response(JSON.stringify({ error: "Failed to generate image.", details: errorBody }), {
        status: apiResponse.status,
        headers: jsonHeaders,
      });
    }

    const imageBuffer = await apiResponse.arrayBuffer();
    return new Response(imageBuffer, { status: 200, headers: imageHeaders });
  } catch (error) {
    console.error("Error in /generate-image handler:", error.message);
    return new Response(JSON.stringify({ error: "An unexpected server error occurred in image generation." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}

async function handleContactForm(request, env, headers) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }
  if (!env.SENDGRID_API_KEY || !env.TO_EMAIL) {
    console.error("FATAL: SENDGRID_API_KEY or TO_EMAIL not configured");
    return new Response(JSON.stringify({ error: "Server configuration error. Contact form is disabled." }), {
      status: 500,
      headers,
    });
  }

  try {
    const { name, email, subject, message } = await request.json();
    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "Missing required form fields." }), { status: 400, headers });
    }

    const sendgridPayload = {
      personalizations: [
        {
          to: [{ email: env.TO_EMAIL }],
          subject: `New Contact Form Message: ${subject}`,
        },
      ],
      from: { email: "noreply@unique-ue.com", name: "uniQue-ue Website" },
      reply_to: { email, name },
      content: [
        {
          type: "text/plain",
          value: `You have a new message from the uniQue-ue website contact form:

Name: ${name}
Email: ${email}
Subject: ${subject}
Message:
${message}
          `,
        },
      ],
    };

    const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendgridPayload),
    });

    if (sendgridResponse.status === 202) {
      return new Response(JSON.stringify({ success: true, message: "Message sent successfully." }), {
        status: 200,
        headers,
      });
    } else {
      const errorBody = await sendgridResponse.text();
      console.error(`SendGrid API error (${sendgridResponse.status}):`, errorBody);
      return new Response(JSON.stringify({ error: "Failed to send message.", details: errorBody }), {
        status: sendgridResponse.status,
        headers,
      });
    }
  } catch (error) {
    console.error("Error in /contact handler:", error.message);
    return new Response(JSON.stringify({ error: "An unexpected server error occurred in contact form." }), {
      status: 500,
      headers,
    });
  }
}

async function handleRevenueAdmin(request, env, headers) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }

  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "save_state":
        return new Response(JSON.stringify({ success: true, message: "State saved successfully" }), {
          status: 200,
          headers,
        });

      case "get_analytics":
        return new Response(
          JSON.stringify({
            success: true,
            analytics: {
              totalRevenue: data?.totalRevenue || 0,
              activeServices: data?.activeServices || 0,
              monthlyAvg: data?.monthlyAvg || 0,
            },
          }),
          { status: 200, headers }
        );

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers });
    }
  } catch (error) {
    console.error("Error in /admin/revenue handler:", error.message);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers });
  }
}

async function handlePayPalPayout(request, env, headers) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }

  try {
    const body = await request.json();
    const { amount } = body;

    if (typeof amount !== "number" || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers });
    }

    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_RECEIVER_EMAIL) {
      return new Response(
        JSON.stringify({
          error: "PayPal not configured",
          message: "Configure PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_RECEIVER_EMAIL.",
          manualInstructions: "To complete payout manually: log into PayPal and send money to your configured PayPal email address.",
        }),
        { status: 503, headers }
      );
    }

    const receiverEmail = env.PAYPAL_RECEIVER_EMAIL;

    const authResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en_US",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`),
      },
      body: "grant_type=client_credentials",
    });

    if (!authResponse.ok) throw new Error("Failed to authenticate with PayPal");

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}`,
        email_subject: "You have a payout from uniQue-ue Revenue System",
        email_message: "You have received a payout from your automated revenue system.",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: { value: amount.toFixed(2), currency: "USD" },
          receiver: receiverEmail,
          note: "Revenue from AI-generated services",
          sender_item_id: `item_${Date.now()}`,
        },
      ],
    };

    const payoutResponse = await fetch("https://api-m.paypal.com/v1/payments/payouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payoutData),
    });

    if (!payoutResponse.ok) {
      const errorData = await payoutResponse.json().catch(() => ({}));
      throw new Error(`PayPal payout failed: ${errorData.message || "Unknown error"}`);
    }

    const payoutResult = await payoutResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payout of $${amount.toFixed(2)} initiated to ${receiverEmail}`,
        batchId: payoutResult.batch_header.payout_batch_id,
        status: payoutResult.batch_header.batch_status,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Error in /admin/paypal-payout handler:", error.message);
    return new Response(
      JSON.stringify({
        error: "Payout failed",
        message: error.message,
        manualInstructions: "To complete payout manually: log into PayPal and send money to your configured PayPal email address.",
      }),
      { status: 500, headers }
    );
  }
}
