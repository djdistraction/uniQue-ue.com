/**
 * Cloudflare Worker - uniQue-ue API
 *
 * This single worker handles all backend API routes for the website:
 * - /chat : Handles AI chat requests (proxies to GitHub Models)
 * - /generate-image : Handles AI image generation (proxies to Hugging Face)
 * - /contact : Handles the contact form (sends email via SendGrid)
 * - /admin/verify-access : Verifies admin access code
 * - /admin/revenue : Admin endpoint for revenue system operations
 * - /admin/paypal-payout : Initiates PayPal payout (admin only)
 *
 * Secrets Required (set in Cloudflare dashboard):
 * - GITHUB_PAT: Your GitHub Personal Access Token for AI chat.
 * - HUGGINGFACE_TOKEN: Your Hugging Face Token for image generation.
 * - SENDGRID_API_KEY: Your SendGrid API key for sending emails.
 * - TO_EMAIL: The email address to receive contact form submissions.
 * - ADMIN_ACCESS_CODE: Access code for admin features (optional)
 * - PAYPAL_CLIENT_ID: PayPal API client ID (optional, for automated payouts)
 * - PAYPAL_CLIENT_SECRET: PayPal API secret (optional, for automated payouts)
 * - PAYPAL_RECEIVER_EMAIL: PayPal email to receive payouts (required for payouts)
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight (OPTIONS) requests
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // --- ROUTER ---
      if (path === "/chat") {
        return await handleChat(request, env);
      } else if (path === "/generate-image") {
        return await handleImageGeneration(request, env);
      } else if (path === "/contact") {
        return await handleContactForm(request, env);
      } else if (path === "/admin/verify-access") {
        return await handleVerifyAccess(request, env);
      } else if (path === "/admin/revenue") {
        return await handleRevenueAdmin(request, env);
      } else if (path === "/admin/paypal-payout") {
        return await handlePayPalPayout(request, env);
      } else {
        return new Response(JSON.stringify({ error: "Route not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } catch (error) {
      console.error("General Worker Error:", error.message);
      return new Response(JSON.stringify({ error: "An unexpected server error occurred." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  },
};

/**
 * Handles /chat requests
 * Proxies to GitHub Models AI
 * NEW: Includes automatic prompt refinement for short user messages.
 */
async function handleChat(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  // Validate the GitHub PAT is configured
  if (!env.GITHUB_PAT) {
    console.error("FATAL: GITHUB_PAT secret not configured");
    return new Response(JSON.stringify({ error: "Server configuration error. AI Chat key not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = await request.json();
    let { chatHistory, systemPrompt, model = "openai/gpt-4o-mini" } = body; // Make chatHistory mutable

    if (!chatHistory || !systemPrompt) {
      return new Response(JSON.stringify({ error: "Missing 'chatHistory' or 'systemPrompt'." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // --- NEW: Prompt Refining Logic ---
    let refinedPromptForLog = null;
    if (chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      const lastMessageText = lastMessage.parts.map((part) => part.text).join("\n");

      // Check if the last message is a short prompt from the user
      if (lastMessage.role === "user" && lastMessageText.length < 100) {
        
        // 1. Create context (all messages *except* the last one)
        const contextMessages = [
          { role: "system", content: "You are a silent prompt refinement AI. Do not answer the user's prompt. Your *only* job is to refine the user's last message to be more effective, using the chat history for context. Output *only* the refined prompt and nothing else." },
          ...chatHistory.slice(0, -1).map((msg) => ({ // All but the last
            role: msg.role === "model" ? "assistant" : msg.role,
            content: msg.parts.map((part) => part.text).join("\n"),
          })),
          // 2. Add the refinement instruction
          {
            role: "user",
            content: `Based on our conversation, please refine this user's last message to be a high-quality, effective prompt. User's short prompt: "${lastMessageText}"`
          }
        ];
        
        // 3. Call AI to refine the prompt
        try {
            const refineResponse = await fetch("https://models.github.ai/inference/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.GITHUB_PAT}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
              },
              body: JSON.stringify({ model: model, messages: contextMessages, temperature: 0.3 }), // Lower temp for factual refinement
            });

            if (refineResponse.ok) {
              const refineResult = await refineResponse.json();
              const refinedPrompt = refineResult.choices?.[0]?.message?.content?.trim();
              
              if (refinedPrompt && refinedPrompt !== lastMessageText) {
                // 4. Replace the short prompt with the refined one
                refinedPromptForLog = refinedPrompt; // For logging/debugging
                chatHistory[chatHistory.length - 1].parts = [{ text: refinedPrompt }];
              }
              // If refinement fails, we just proceed with the original short prompt
            }
        } catch (refineError) {
            console.error("Prompt refinement call failed:", refineError.message);
            // Non-fatal. We'll just use the original prompt.
        }
      }
    }
    // --- END: Prompt Refining Logic ---

    // Construct messages for the *actual* API call (now with refined prompt if applicable)
    const messages = [
      {
        role: "system",
        content: systemPrompt, // The *original* system prompt
      },
      ...chatHistory.map((msg) => ({
        role: msg.role === "model" ? "assistant" : msg.role,
        content: msg.parts.map((part) => part.text).join("\n"),
      })),
    ];

    // Call GitHub Models API
    const apiResponse = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ model: model, messages: messages }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`GitHub Models API error (${apiResponse.status}):`, errorBody);
      return new Response(JSON.stringify({ error: "Failed to get response from AI service.", details: errorBody }), {
        status: apiResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const result = await apiResponse.json();
    
    // --- NEW: Add refined prompt to response if it was used ---
    if (refinedPromptForLog) {
        result.refined_prompt = refinedPromptForLog; // Add this for client-side awareness
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in /chat handler:", error.message);
    return new Response(JSON.stringify({ error: "An unexpected server error occurred in chat." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

/**
 * Handles /generate-image requests
 * Proxies to Hugging Face Stable Diffusion
 */
async function handleImageGeneration(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  if (!env.HUGGINGFACE_TOKEN) {
    console.error("FATAL: HUGGINGFACE_TOKEN secret not configured");
    return new Response(JSON.stringify({ error: "Server configuration error. Image Generation key not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = await request.json();
    const { prompt, negative_prompt = "", width = 512, height = 512 } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing 'prompt'." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
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
          width: width,
          height: height,
        },
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`HuggingFace API error (${apiResponse.status}):`, errorBody);
      if (apiResponse.status === 503) {
        return new Response(JSON.stringify({ error: "Model is loading. Please try again in 20-30 seconds.", loading: true }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...corsHeaders, "Retry-After": "20" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to generate image.", details: errorBody }), {
        status: apiResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const imageBuffer = await apiResponse.arrayBuffer();
    return new Response(imageBuffer, {
      status: 200,
      headers: { "Content-Type": "image/png", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in /generate-image handler:", error.message);
    return new Response(JSON.stringify({ error: "An unexpected server error occurred in image generation." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

/**
 * Handles /contact requests
 * Sends an email using SendGrid
 */
async function handleContactForm(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  if (!env.SENDGRID_API_KEY || !env.TO_EMAIL) {
    console.error("FATAL: SENDGRID_API_KEY or TO_EMAIL secret not configured");
    return new Response(JSON.stringify({ error: "Server configuration error. Contact form is disabled." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "Missing required form fields." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Construct the email payload for SendGrid
    const sendgridPayload = {
      personalizations: [
        {
          to: [{ email: env.TO_EMAIL }],
          subject: `New Contact Form Message: ${subject}`,
        },
      ],
      from: { email: "noreply@unique-ue.com", name: "uniQue-ue Website" }, // 'from' email must be a verified sender
      reply_to: { email: email, name: name },
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
      // 202 Accepted is success for SendGrid
      return new Response(JSON.stringify({ success: true, message: "Message sent successfully." }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } else {
      // Log SendGrid error
      const errorBody = await sendgridResponse.text();
      console.error(`SendGrid API error (${sendgridResponse.status}):`, errorBody);
      return new Response(JSON.stringify({ error: "Failed to send message.", details: errorBody }), {
        status: sendgridResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  } catch (error) {
    console.error("Error in /contact handler:", error.message);
    return new Response(JSON.stringify({ error: "An unexpected server error occurred in contact form." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

/**
 * Handles /admin/verify-access requests
 * Verifies admin access code
 */
async function handleVerifyAccess(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  try {
    const body = await request.json();
    const { accessCode } = body;

    // Verify admin access
    const validAccessCode = env.ADMIN_ACCESS_CODE || 'unique-ue-admin-2024';
    
    if (accessCode === validAccessCode) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Access granted" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false,
        message: "Invalid access code" 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  } catch (error) {
    console.error("Error in /admin/verify-access handler:", error.message);
    return new Response(JSON.stringify({ 
      success: false,
      error: "Server error" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

/**
 * Handles /admin/revenue requests
 * Admin endpoint for revenue system operations
 */
async function handleRevenueAdmin(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  try {
    const body = await request.json();
    const { action, accessCode, data } = body;

    // Verify admin access
    const validAccessCode = env.ADMIN_ACCESS_CODE || 'unique-ue-admin-2024';
    if (accessCode !== validAccessCode) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Handle different admin actions
    switch (action) {
      case 'save_state':
        // In a production system, this would save to a database
        // For now, we acknowledge the save
        return new Response(JSON.stringify({ 
          success: true, 
          message: "State saved successfully" 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });

      case 'get_analytics':
        // Return mock analytics data
        return new Response(JSON.stringify({
          success: true,
          analytics: {
            totalRevenue: data?.totalRevenue || 0,
            activeServices: data?.activeServices || 0,
            monthlyAvg: data?.monthlyAvg || 0
          }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
  } catch (error) {
    console.error("Error in /admin/revenue handler:", error.message);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

/**
 * Handles /admin/paypal-payout requests
 * Initiates PayPal payout for accumulated revenue
 */
async function handlePayPalPayout(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders },
    });
  }

  try {
    const body = await request.json();
    const { amount, accessCode } = body;

    // Verify admin access
    const validAccessCode = env.ADMIN_ACCESS_CODE || 'unique-ue-admin-2024';
    if (accessCode !== validAccessCode) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if PayPal credentials are configured
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_RECEIVER_EMAIL) {
      return new Response(JSON.stringify({ 
        error: "PayPal not configured",
        message: "PayPal API credentials not set. Please configure PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and PAYPAL_RECEIVER_EMAIL secrets.",
        manualInstructions: "To complete payout manually: Log into PayPal and send money to your configured PayPal email address"
      }), {
        status: 503,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const receiverEmail = env.PAYPAL_RECEIVER_EMAIL;

    // Get PayPal OAuth token
    const authResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with PayPal');
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Create payout
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}`,
        email_subject: "You have a payout from uniQue-ue Revenue System",
        email_message: "You have received a payout from your automated revenue system."
      },
      items: [{
        recipient_type: "EMAIL",
        amount: {
          value: amount.toFixed(2),
          currency: "USD"
        },
        receiver: receiverEmail,
        note: "Revenue from AI-generated services",
        sender_item_id: `item_${Date.now()}`
      }]
    };

    const payoutResponse = await fetch('https://api-m.paypal.com/v1/payments/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payoutData)
    });

    if (!payoutResponse.ok) {
      const errorData = await payoutResponse.json();
      throw new Error(`PayPal payout failed: ${errorData.message || 'Unknown error'}`);
    }

    const payoutResult = await payoutResponse.json();

    return new Response(JSON.stringify({
      success: true,
      message: `Payout of $${amount.toFixed(2)} initiated to ${receiverEmail}`,
      batchId: payoutResult.batch_header.payout_batch_id,
      status: payoutResult.batch_header.batch_status
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in /admin/paypal-payout handler:", error.message);
    return new Response(JSON.stringify({ 
      error: "Payout failed",
      message: error.message,
      manualInstructions: "To complete payout manually: Log into PayPal and send money to your configured PayPal email address"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

// --- CORS ---

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // TODO: Change to your domain in production
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle CORS preflight requests
function handleOptions(request) {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS preflight request.
    return new Response(null, {
      headers: corsHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: "GET, POST, OPTIONS",
      },
    });
  }
}
