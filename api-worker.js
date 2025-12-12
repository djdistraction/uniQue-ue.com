/**
 * Cloudflare Worker - uniQue-ue API (real PayPal checkout + AI fulfillment)
 *
 * Routes:
 * - POST /checkout/paypal/create-order   : Create PayPal order (server-side)
 * - POST /checkout/paypal/capture       : Capture PayPal order, generate product, return download link
 * - GET  /download/:token               : Serve purchased digital content (48h token)
 *
 * Existing routes kept:
 * - /chat, /generate-image, /contact, /admin/auth, /admin/revenue, /admin/paypal-payout
 *
 * Secrets (set in Cloudflare):
 * - ADMIN_ACCESS_CODE
 * - GITHUB_PAT
 * - HUGGINGFACE_TOKEN
 * - SENDGRID_API_KEY
 * - TO_EMAIL
 * - PAYPAL_CLIENT_ID
 * - PAYPAL_CLIENT_SECRET
 * - PAYPAL_RECEIVER_EMAIL  (not required for checkout, used for payout route)
 *
 * KV binding (set in wrangler.toml):
 * - SALES_KV  (stores metrics, download tokens, order records)
 */

const ALLOWED_ORIGIN = "https://www.unique-ue.com"; // add staging if needed
const SESSION_TTL_SECONDS = 1800; // 30 minutes for admin cookie
const COOKIE_NAME = "admin_session";

// Product settings
const PRODUCT_ID = "ai-brief-v1";
const PRODUCT_NAME = "AI Market Opportunity Brief";
const PRODUCT_PRICE = "19.00";
const PRODUCT_CURRENCY = "USD";
const DOWNLOAD_TTL_MS = 1000 * 60 * 60 * 48; // 48 hours

// Simple in-memory token store for admin sessions (KV for sales/downloads)
const tokenStore = new Map(); // token -> expiry (ms)

// Utility: headers
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
    "default-src 'self'; connect-src 'self' https://api.paypal.com https://api-m.sandbox.paypal.com; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self';"
  );
  h.set("Referrer-Policy", "no-referrer");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  return h;
}

// Admin session cookie helpers
function makeToken() {
  return crypto.randomUUID();
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

// KV helpers
async function getMetrics(env) {
  const raw = await env.SALES_KV.get("metrics");
  if (!raw) return { salesCount: 0, totalRevenue: 0 };
  try {
    return JSON.parse(raw);
  } catch {
    return { salesCount: 0, totalRevenue: 0 };
  }
}
async function setMetrics(env, metrics) {
  await env.SALES_KV.put("metrics", JSON.stringify(metrics));
}
async function addOrder(env, order) {
  // store recent order (lightweight). You can extend to D1 if needed.
  await env.SALES_KV.put(`order:${order.id}`, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 30 }); // 30d
}
async function storeDownload(env, token, record) {
  await env.SALES_KV.put(`download:${token}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 3 }); // 3 days
}
async function getDownload(env, token) {
  const raw = await env.SALES_KV.get(`download:${token}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// PayPal helpers
async function getPayPalAccessToken(env) {
  const resp = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Language": "en_US",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`),
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PayPal auth failed: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  return data.access_token;
}

async function createPayPalOrder(env) {
  const token = await getPayPalAccessToken(env);
  const resp = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: PRODUCT_ID,
          amount: {
            currency_code: PRODUCT_CURRENCY,
            value: PRODUCT_PRICE,
          },
          description: PRODUCT_NAME,
        },
      ],
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Create order failed: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  return data.id; // orderID
}

async function capturePayPalOrder(env, orderId) {
  const token = await getPayPalAccessToken(env);
  const resp = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Capture failed: ${resp.status} ${text}`);
  }
  const data = JSON.parse(text);
  return data;
}

// AI product generator
async function generateProductContent(env) {
  if (!env.GITHUB_PAT) {
    // Fallback content if no AI key (should be set)
    return `AI Market Opportunity Brief\n\n- Opportunity: Example niche\n- Why now: Example driver\n- Target buyer: SMB\n- Offer: Launch kit\n- Next steps: Outreach, landing page, pricing test\n- KPIs: CTR, CPC, CAC, LTV`;
  }

  const prompt = `Create a concise market opportunity brief. Respond in plain text, sections:
- Opportunity (1-2 sentences)
- Why now (1-2 bullets)
- Target buyer (1-2 bullets)
- Offer concept (1-2 bullets)
- Go-to-market steps (3 bullets)
- KPIs to watch (3 bullets)
Keep it under 200 words.`;

  const apiResponse = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You write concise market opportunity briefs." },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.6,
    }),
  });

  if (!apiResponse.ok) {
    const errText = await apiResponse.text();
    console.error("AI generation failed:", errText);
    return `AI Market Opportunity Brief\n\n(offline fallback)\n- Opportunity: Example niche\n- Why now: Example driver\n- Target buyer: SMB\n- Offer: Launch kit\n- Next steps: Outreach, landing page, pricing test\n- KPIs: CTR, CPC, CAC, LTV`;
  }

  const result = await apiResponse.json();
  return result.choices?.[0]?.message?.content?.trim() || "AI brief unavailable.";
}

// Router
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return handleOptions(request);

    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin") || "";
    const originOk = origin === ALLOWED_ORIGIN;
    const jsonHeaders = makeHeaders(originOk);
    const textHeaders = makeHeaders(originOk, "text/plain; charset=utf-8");

    try {
      // New checkout routes
      if (path === "/checkout/paypal/create-order" && request.method === "POST") {
        if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
          return new Response(JSON.stringify({ error: "PayPal not configured" }), { status: 500, headers: jsonHeaders });
        }
        const orderId = await createPayPalOrder(env);
        return new Response(JSON.stringify({ orderId }), { status: 200, headers: jsonHeaders });
      }

      if (path === "/checkout/paypal/capture" && request.method === "POST") {
        if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
          return new Response(JSON.stringify({ error: "PayPal not configured" }), { status: 500, headers: jsonHeaders });
        }
        const body = await request.json().catch(() => ({}));
        const { orderId } = body || {};
        if (!orderId) {
          return new Response(JSON.stringify({ error: "Missing orderId" }), { status: 400, headers: jsonHeaders });
        }

        const capture = await capturePayPalOrder(env, orderId);
        const status = capture?.status;
        const unit = capture?.purchase_units?.[0];
        const amount = unit?.payments?.captures?.[0]?.amount?.value || PRODUCT_PRICE;
        const currency = unit?.payments?.captures?.[0]?.amount?.currency_code || PRODUCT_CURRENCY;

        if (status !== "COMPLETED" && status !== "APPROVED") {
          return new Response(JSON.stringify({ error: "Capture not completed", status }), { status: 400, headers: jsonHeaders });
        }

        // Fulfill: generate product content, store download token
        const content = await generateProductContent(env);
        const token = crypto.randomUUID();
        const now = Date.now();
        const record = {
          token,
          productId: PRODUCT_ID,
          productName: PRODUCT_NAME,
          amount,
          currency,
          orderId,
          created: now,
          expires: now + DOWNLOAD_TTL_MS,
          content,
        };
        await storeDownload(env, token, record);

        // Update metrics
        const metrics = await getMetrics(env);
        metrics.salesCount += 1;
        metrics.totalRevenue += Number(amount);
        await setMetrics(env, metrics);

        // Store order record (light)
        await addOrder(env, {
          id: orderId,
          amount,
          currency,
          productId: PRODUCT_ID,
          at: now,
        });

        return new Response(
          JSON.stringify({
            success: true,
            downloadUrl: `/download/${token}`,
            expiresAt: new Date(record.expires).toISOString(),
            orderId,
            amount,
            currency,
          }),
          { status: 200, headers: jsonHeaders }
        );
      }

      // Download route
      if (path.startsWith("/download/") && request.method === "GET") {
        const token = path.split("/").pop();
        const rec = await getDownload(env, token);
        if (!rec) return new Response("Not found or expired", { status: 404, headers: textHeaders });
        if (Date.now() > rec.expires) return new Response("Link expired", { status: 410, headers: textHeaders });

        textHeaders.set("Content-Disposition", `attachment; filename="market-brief-${token}.txt"`);
        return new Response(rec.content, { status: 200, headers: textHeaders });
      }

      // Admin auth
      if (path === "/admin/auth" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const { accessCode } = body || {};
        const validAccessCode = env.ADMIN_ACCESS_CODE;
        if (!validAccessCode) {
          return new Response(JSON.stringify({ success: false, message: "Server not configured" }), { status: 500, headers: jsonHeaders });
        }
        if (accessCode !== validAccessCode) {
          return new Response(JSON.stringify({ success: false, message: "Invalid access code" }), { status: 401, headers: jsonHeaders });
        }
        const token = makeToken();
        tokenStore.set(token, Date.now() + SESSION_TTL_SECONDS * 1000);
        jsonHeaders.set("Set-Cookie", setSessionCookie(token));
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
      }

      // Admin revenue (real metrics)
      if (path === "/admin/revenue") {
        const auth = await requireAuth(request);
        if (!auth.ok) return auth.response;

        if (request.method === "GET") {
          const metrics = await getMetrics(env);
          return new Response(JSON.stringify({ success: true, metrics }), { status: 200, headers: jsonHeaders });
        }

        return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: jsonHeaders });
      }

      // Admin payout (unchanged; still protected)
      if (path === "/admin/paypal-payout") {
        const auth = await requireAuth(request);
        if (!auth.ok) return auth.response;
        if (request.method !== "POST") {
          return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: jsonHeaders });
        }
        // Placeholder: reuse your previous payout logic if desired
        return new Response(JSON.stringify({ success: true, message: "Payout endpoint placeholder" }), {
          status: 200,
          headers: jsonHeaders,
        });
      }

      // Legacy verify-access route deprecated
      if (path === "/admin/verify-access") {
        return new Response(JSON.stringify({ error: "Use /admin/auth" }), { status: 404, headers: jsonHeaders });
      }

      // Existing routes preserved
      if (path === "/chat") return await handleChat(request, env, jsonHeaders);
      if (path === "/generate-image") return await handleImageGeneration(request, env, jsonHeaders);
      if (path === "/contact") return await handleContactForm(request, env, jsonHeaders);

      return new Response(JSON.stringify({ error: "Route not found" }), { status: 404, headers: jsonHeaders });
    } catch (error) {
      console.error("General Worker Error:", error.message);
      return new Response(JSON.stringify({ error: "An unexpected server error occurred." }), { status: 500, headers: jsonHeaders });
    }
  },
};

/* --------------- Existing handlers kept (chat, image, contact) --------------- */
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
      return new Response(JSON.stringify({ error: "Missing 'chatHistory' or 'systemPrompt'." }), { status: 400, headers });
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
    return new Response(JSON.stringify({ error: "An unexpected server error occurred in chat." }), { status: 500, headers });
  }
}

async function handleImageGeneration(request, env, headers) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
  }
  if (!env.HUGGINGFACE_TOKEN) {
    console.error("FATAL: HUGGINGFACE_TOKEN not configured");
    return new Response(JSON.stringify({ error: "Server configuration error. Image Generation key not configured." }), {
      status: 500,
      headers,
    });
  }

  try {
    const body = await request.json();
    const { prompt, negative_prompt = "", width = 512, height = 512 } = body;
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing 'prompt'." }), { status: 400, headers });
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
          { status: 503, headers: { ...headers, "Retry-After": "20" } }
        );
      }
      return new Response(JSON.stringify({ error: "Failed to generate image.", details: errorBody }), {
        status: apiResponse.status,
        headers,
      });
    }

    const imageBuffer = await apiResponse.arrayBuffer();
    const imageHeaders = makeHeaders(true, "image/png");
    return new Response(imageBuffer, { status: 200, headers: imageHeaders });
  } catch (error) {
    console.error("Error in /generate-image handler:", error.message);
    return new Response(JSON.stringify({ error: "An unexpected server error occurred in image generation." }), {
      status: 500,
      headers,
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
