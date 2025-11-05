import os

# --- Configuration ---

# This dictionary holds the new files to create (or overwrite).
# The key is the filename, and the value is the full content.
new_file_content = {
    
    "api-worker.js": """
/**
 * Cloudflare Worker - uniQue-ue API
 *
 * This single worker handles all backend API routes for the website:
 * - /chat : Handles AI chat requests (proxies to GitHub Models)
 * - /generate-image : Handles AI image generation (proxies to Hugging Face)
 * - /contact : Handles the contact form (sends email via SendGrid)
 *
 * Secrets Required (set in Cloudflare dashboard):
 * - GITHUB_PAT: Your GitHub Personal Access Token for AI chat.
 * - HUGGINGFACE_TOKEN: Your Hugging Face Token for image generation.
 * - SENDGRID_API_KEY: Your SendGrid API key for sending emails.
 * - TO_EMAIL: The email address to receive contact form submissions.
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
      const lastMessageText = lastMessage.parts.map((part) => part.text).join("\\n"); // <-- FIX HERE

      // Check if the last message is a short prompt from the user
      if (lastMessage.role === "user" && lastMessageText.length < 100) {
        
        // 1. Create context (all messages *except* the last one)
        const contextMessages = [
          { role: "system", content: "You are a silent prompt refinement AI. Do not answer the user's prompt. Your *only* job is to refine the user's last message to be more effective, using the chat history for context. Output *only* the refined prompt and nothing else." },
          ...chatHistory.slice(0, -1).map((msg) => ({ // All but the last
            role: msg.role === "model" ? "assistant" : msg.role,
            content: msg.parts.map((part) => part.text).join("\\n"), // <-- FIX HERE
          })),
          // 2. Add the refinement instruction
          {
            role: "user",
            content: `Based on our conversation, please refine this user's last message to be a high-quality, effective prompt. User's short prompt: "${lastMessageText}"`
          }
        ];
        
        // 3. Call AI to refine the prompt
        try {
            const refineResponse = await fetch("https.models.github.ai/inference/chat/completions", {
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
        content: msg.parts.map((part) => part.text).join("\\n"), // <-- FIX HERE
      })),
    ];

    // Call GitHub Models API
    const apiResponse = await fetch("https.models.github.ai/inference/chat/completions", {
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

    const sendgridResponse = await fetch("https.api.sendgrid.com/v3/mail/send", {
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
""",

    "firebase-config.js": """
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, enablePersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG OBJECT HERE ---
// This config was copied from your canvas.
const firebaseConfig = {
    apiKey: "AIzaSyC2A5a83w_XAv1XT4_ES5S2jNRkPci9w5U",
    authDomain: "unique-ue-website.firebaseapp.com",
    projectId: "unique-ue-website",
    storageBucket: "unique-ue-website.firebasestorage.app",
    messagingSenderId: "26306347057",
    appId: "1:26306347057:web:a2f5c0e893cb99f5585510",
    measurementId: "G-5K4TBEBTB3"
  };

// ---------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence (for Ghost-Writer)
// This will cache data locally so users don't lose work if they go offline
(async () => {
  try {
    await enablePersistence(db);
    console.log("Firebase Offline Persistence enabled.");
  } catch (error) {
    if (error.code == 'failed-precondition') {
      console.warn("Firebase Persistence failed (multiple tabs open?).");
    } else if (error.code == 'unimplemented') {
      console.log("Firebase Persistence is not available in this browser.");
    }
  }
})();

// Export the initialized services
export { app, auth, db };
""",

    "wrangler.toml": """
name = "unique-ue-api"
main = "api-worker.js"
compatibility_date = "2024-01-01"

[env.production]
name = "unique-ue-api"

# We will set these secrets using the 'wrangler secret put' command
# This just tells the worker what to expect
[vars]
TO_EMAIL = "your-email@example.com" # This is just a default, the secret will override it

# Secrets:
# GITHUB_PAT
# HUGGINGFACE_TOKEN
# SENDGRID_API_KEY
# TO_EMAIL
""",
    
    "README.md": """
# **uniQue-ue Website**

The official hub for uniQue-ue projects and directives. This repository hosts the static GitHub Pages site for [www.unique-ue.com](https://www.unique-ue.com).

## 🚀 **Project Status: Under Reconstruction**

This project is currently undergoing a major refactor to a new, more powerful architecture.

## **Architecture**

This project uses a hybrid architecture to provide a secure, real-time AI experience:

1.  **Frontend (GitHub Pages):** The static website (index.html, etc.) is hosted directly from this repository.
2.  **Backend (Cloudflare Workers):** A single worker (`api-worker.js`) securely proxies all API requests for AI, image generation, and the contact form.
3.  **Database & Auth (Firebase):** User accounts, profiles, and data are handled by Firebase Authentication and Firestore.

### **Backend Files**
* `api-worker.js`: The all-in-one Cloudflare Worker.
* `wrangler.toml`: Configuration for the worker.
* `firebase-config.js`: Configuration for connecting to the Firebase project.

## 🏁 Getting Started

### **Prerequisites**
* A Cloudflare account
* A Firebase project
* API keys for: GitHub, Hugging Face, and SendGrid
* `npm` (for installing Wrangler)

### **Deployment**
1.  **Clone the repo:**
    ```bash
    git clone [https://github.com/djdistraction/djdistraction.github.io.git](https://github.com/djdistraction/djdistraction.github.io.git)
    cd djdistraction.github.io
    ```
2.  **Install & Login to Wrangler:**
    ```bash
    npm install -g wrangler
    wrangler login
    ```
3.  **Deploy the Worker:**
    ```bash
    wrangler deploy
    ```
4.  **Set Your Secrets:**
    ```bash
    wrangler secret put GITHUB_PAT
    wrangler secret put HUGGINGFACE_TOKEN
    wrangler secret put SENDGRID_API_KEY
    wrangler secret put TO_EMAIL
    ```
5.  **Commit & Push:**
    ```bash
    git add .
    git commit -m "Refactor to new API worker and Firebase architecture"
    git push
    ```
""",

    # --- New Placeholder HTML Files ---

    "contact.html": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us - uniQue-ue</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Add global styles and fonts here -->
</head>
<body class="bg-brand-primary text-brand-text">
    <!-- TODO: Add new site-wide header -->
    <div class="container mx-auto p-8">
        <h1 class="text-4xl font-display mb-4">Contact Us</h1>
        <p class="mb-8">Have a question or want to get in touch? Send us a message.</p>
        
        <form id="contact-form" class="max-w-xl">
            <!-- Form fields: Name, Email, Subject, Message -->
            <button typeD="submit">Send Message</button>
        </form>
        <p id="form-status" class="mt-4"></p>
        
        <h2 class="text-3xl font-display mt-12 mb-4">Frequently Asked Questions (FAQ)</h2>
        <!-- TODO: Add FAQ content -->
    </div>
    
    <!-- TODO: Add new site-wide footer -->
    
    <!-- Import Firebase and our contact form logic -->
    <script type="module">
        import { auth, db } from './firebase-config.js';
        // TODO: Add contact form submission logic
        // This will POST to our '/contact' worker endpoint
    </script>
</body>
</html>
""",

    "profile.html": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Profile - uniQue-ue</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Add global styles and fonts here -->
</head>
<body class="bg-brand-primary text-brand-text">
    <!-- TODO: Add new site-wide header -->
    <div class="container mx-auto p-8">
        <h1 class="text-4xl font-display mb-8">Your Profile</h1>
        
        <div id="auth-container">
            <!-- This content will be shown/hidden based on auth state -->
            <p>Please log in to view your profile.</p>
        </div>
        
        <div id="profile-content" class="hidden">
            <p>Welcome, <span id="user-name">...</span></p>
            <!-- TODO: Add profile fields: picture, user ID, etc. -->
            
            <h2 class="text-3xl font-display mt-12 mb-4">Your Subscriptions</h2>
            <!-- TODO: Add subscription management -->
            
            <button id="logout-button">Log Out</button>
        </div>
    </div>
    
    <!-- TODO: Add new site-wide footer -->
    
    <script type="module">
        import { auth, db } from './firebase-config.js';
        import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

        const authContainer = document.getElementById('auth-container');
        const profileContent = document.getElementById('profile-content');
        const userName = document.getElementById('user-name');
        const logoutButton = document.getElementById('logout-button');

        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                authContainer.classList.add('hidden');
                profileContent.classList.remove('hidden');
                userName.textContent = user.displayName || user.email;
            } else {
                // User is signed out
                authContainer.classList.remove('hidden');
                profileContent.classList.add('hidden');
                // Redirect to login page or show login form
            }
        });

        // Log out
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log('User signed out');
            } catch (error) {
                console.error('Sign out error', error);
            }
        });
    </script>
</body>
</html>
""",

    "privacy.html": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - uniQue-ue</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Add global styles and fonts here -->
</head>
<body class="bg-brand-primary text-brand-text">
    <!-- TODO: Add new site-wide header -->
    <div class="container mx-auto p-8 prose prose-invert">
        <h1 class="text-4xl font-display mb-4">Privacy Policy</h1>
        <p>Last updated: [Date]</p>
        
        <p>TODO: Add placeholder legal text for a Privacy Policy.</p>
        <p>This policy must explain:</p>
        <ul>
            <li>What data we collect (email, name, usage data, etc.)</li>
            <li>How we use that data (to provide services, improve app, etc.)</li>
            <li>How we store and protect that data (using Firebase, etc.)</li>
            <li>User rights (access, deletion, etc.)</li>
        </ul>
    </div>
    <!-- TODO: Add new site-wide footer -->
</body>
</html>
""",

    "terms.html": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=devisce-width, initial-scale=1.0">
    <title>Terms of Use - uniQue-ue</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Add global styles and fonts here -->
</head>
<body class="bg-brand-primary text-brand-text">
    <!-- TODO: Add new site-wide header -->
    <div class="container mx-auto p-8 prose prose-invert">
        <h1 class="text-4xl font-display mb-4">Terms of Use</h1>
        <p>Last updated: [Date]</p>
        
        <p>TODO: Add placeholder legal text for Terms of Use.</p>
        <p>This document must explain:</p>
        <ul>
            <li>User responsibilities</li>
            <li>Subscription terms (payment, cancellations)</li>
            <li>Acceptable use policies</li>
            <li>Limitation of liability</li>
            <li>Intellectual property rights</li>
        </ul>
    </div>
    <!-- TODO: Add new site-wide footer -->
</body>
</html>
""",

    "resources.html": """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resources - uniQue-ue</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Add global styles and fonts here -->
</head>
<body class="bg-brand-primary text-brand-text">
    <!-- TODO: Add new site-wide header -->
    <div class="container mx-auto p-8">
        <h1 class="text-4xl font-display mb-8">Resources</h1>
        
        <p class="mb-8">Explore our suite of AI-powered creative tools.</p>
        
        <div class="grid md:grid-cols-2 gap-8">
            <!-- Card for Ghost-Writer -->
            <div class="border border-brand-accent/30 p-6 rounded-lg">
                <h2 class="text-2xl font-display mb-4">Ghost-Writer</h2>
                <p class="text-brand-text-muted mb-4">AI-powered creative writing assistant.</p>
                <a href="ghost-writer.html" class="text-brand-accent hover:underline">Launch Tool &rarr;</a>
            </div>
            
            <!-- Card for Graphics Studio -->
            <div class="border border-brand-accent/30 p-6 rounded-lg">
                <h2 class="text-2xl font-display mb-4">Graphics Studio</h2>
                <p class="text-brand-text-muted mb-4">AI-powered visual and image generation.</p>
                <a href="graphics-studio.html" class="text-brand-accent hover:underline">Launch Tool &rarr;</a>
            </div>
            
            <!-- TODO: Add cards for subscriptions/upgrades -->
        </div>
    </div>
    
    <!-- TODO: Add new site-wide footer -->
    
    <script type="module">
        import { auth, db } from './firebase-config.js';
        // This page can check auth state to show different content
        // (e.g., "Manage Subscription" vs "View Plans")
    </script>
</body>
</html>
"""
}

# List of old files to delete
files_to_delete = [
    # Old workers
    "worker.js",
    "worker-huggingface.js",
    "worker-image-gen.js",
    
    # Old pages we are replacing/removing
    "downloads.html",
    "events.html",
    "chimera-tower.html",
    "careers.html",
    "investors.html",
    
    # Old scripts and configs
    "deploy-worker.sh",
    "validate-solution.sh",
    "package.json",
    "package-lock.json",
    
    # Old test/example files
    "test-ai-proxy.html",
    "publisher-config-example.html",
    
    # Old documentation
    "CLOUDFLARE_SETUP.md",
    "DEMONSTRATION.md",
    "PUBLISHER_CONFIG.md",
    "SOLUTION_COMPARISON.md",
    "SOLUTION_SUMMARY.md",
    "PROJECT_SUMMARY.md",
    "IMPLEMENTATION_SUMMARY.md",
    "IMAGE_GENERATION_SETUP.md",
    "README.md" # We are replacing this with a new one
]

def main():
    print("🚀 Starting project update...")
    
    # Get the directory where this script is located
    # This assumes you are running the script from the root of your project
    project_dir = os.getcwd()
    print(f"Running in: {project_dir}\n")

    # --- 1. Delete old files ---
    print("--- Deleting old files ---")
    for filename in files_to_delete:
        file_path = os.path.join(project_dir, filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"✅ DELETED: {filename}")
            except Exception as e:
                print(f"❌ ERROR: Could not delete {filename}. {e}")
        else:
            print(f"ℹ️  SKIPPED: {filename} (does not exist)")
    
    print("\n--- Creating/Updating new files ---")
    
    # --- 2. Create/Update new files ---
    for filename, content in new_file_content.items():
        file_path = os.path.join(project_dir, filename)
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                # .strip() removes the extra newlines at the start/end
                f.write(content.strip())
            print(f"✅ CREATED/UPDATED: {filename}")
        except Exception as e:
            print(f"❌ ERROR: Could not write {filename}. {e}")

    print("\n🎉 Project update complete!")
    print("\n--- IMPORTANT NEXT STEPS ---")
    print("1. Your local files are now updated.")
    print("2. Run 'wrangler deploy' in your terminal to upload the new 'api-worker.js'.")
    print("3. Run 'wrangler secret put ...' for all 4 secrets (see wrangler.toml).")
    print("4. Commit all these changes (new files, deleted files) to your GitHub repo.")

if __name__ == "__main__":
    main()

