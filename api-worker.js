/**
 * api-worker.js
 * UNIFIED Backend for uniQue-ue.com
 * Powered by Gemini 3.0 Pro (Nov 2025) for state-of-the-art reasoning and context.
 */

// --- System Prompts for Ghost-Writer & Nexus ---
const SYSTEM_PROMPTS = {
  draven: `You are Draven, an expert AI writing assistant. 
  Mission: Help users articulate thoughts, overcome blocks, and structure narratives.
  Tone: Encouraging, insightful, literary, and structured.
  Method: Do not just write for the user; guide them. Ask probing questions.
  If the user asks for a specific output (outline, chapter, character sheet), provide it in well-formatted Markdown.
  CONTEXT AWARENESS: You will often receive the user's entire manuscript and notes. Use this data to ensure strict continuity, tone matching, and fact-checking.`,
  
  nexus: `You are Nexus, the AI Host of uniQue-ue. You are professional, tech-savvy, and helpful.`
};

// MODEL CONFIGURATION
// Upgraded to Gemini 3.0 Pro based on availability confirmation (Active Preview)
// Fallback logic could be added, but we are targeting the latest stable preview.
const MODEL_NAME = "gemini-3.0-pro";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;"
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // --- ROUTE 1: /generate-prompts (Graphics Studio) ---
      if (path === '/generate-prompts' && request.method === 'POST') {
        return handlePromptGeneration(request, env, corsHeaders);
      }

      // --- ROUTE 2: /chat (Draven/Nexus) ---
      if (path === '/chat' && request.method === 'POST') {
        return handleChat(request, env, corsHeaders);
      }

      // --- ROUTE 3: /admin/auth (Revenue System) ---
      if (path === '/admin/auth' && request.method === 'POST') {
        return handleAdminAuth(request, env, corsHeaders);
      }

      // --- ROUTE 4: /contact (Contact Forms) ---
      if (path === '/contact' && request.method === 'POST') {
        return new Response(JSON.stringify({ success: true, message: "Message received" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * Handle prompt generation (Graphics Studio)
 * Updated to use Gemini 3.0 Pro
 */
async function handlePromptGeneration(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { role = '', task = '', context = '', constraints = '', outputFormat = '', tone = '' } = body;

    if (!task) {
      return new Response(JSON.stringify({ error: 'Task parameter is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const promptParts = [];
    if (role) promptParts.push(`Role: ${role}`);
    promptParts.push(`Task: ${task}`);
    if (context) promptParts.push(`Context: ${context}`);
    if (constraints) promptParts.push(`Constraints: ${constraints}`);
    if (outputFormat) promptParts.push(`Output Format: ${outputFormat}`);
    if (tone) promptParts.push(`Tone: ${tone}`);
    promptParts.push('\nPlease generate 3 different prompt variations for this request, along with overall guidance for best results.');

    const prompt = promptParts.join('\n\n');

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, topK: 40, topP: 0.95, maxOutputTokens: 2048 }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: 'Failed to generate prompts', details: errorText }), {
        status: geminiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parsing logic optimized for list-based responses
    const variations = [];
    const lines = generatedText.split('\n');
    let currentVariation = '';
    let overallGuidance = '';
    let inGuidanceSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.toLowerCase().includes('variation') || trimmedLine.match(/^\d+\./)) {
        if (currentVariation) {
          variations.push({ modelName: MODEL_NAME, content: currentVariation.trim() });
        }
        currentVariation = '';
      } else if (trimmedLine.toLowerCase().includes('guidance') || trimmedLine.toLowerCase().includes('recommendation')) {
        inGuidanceSection = true;
        if (currentVariation) {
          variations.push({ modelName: MODEL_NAME, content: currentVariation.trim() });
          currentVariation = '';
        }
      } else if (inGuidanceSection) {
        overallGuidance += line + '\n';
      } else if (trimmedLine) {
        currentVariation += line + '\n';
      }
    }
    if (currentVariation && !inGuidanceSection) {
      variations.push({ modelName: MODEL_NAME, content: currentVariation.trim() });
    }
    if (variations.length === 0) {
      variations.push({ modelName: MODEL_NAME, content: generatedText });
      overallGuidance = 'Review the generated prompt and adjust based on your specific needs.';
    }
    if (!overallGuidance.trim()) {
      overallGuidance = 'Use these prompt variations as starting points. Adjust the specificity and constraints based on your desired output quality and format.';
    }

    return new Response(JSON.stringify({ variations: variations, overallGuidance: overallGuidance.trim() }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle Chat (Draven)
 * Updated to use Gemini 3.0 Pro
 */
async function handleChat(request, env, corsHeaders) {
  try {
    const { message, mode, history, persona } = await request.json();

    if (!env.GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    let systemText = SYSTEM_PROMPTS[persona] || SYSTEM_PROMPTS.draven;
    if (mode) systemText += `\nCurrent Focus Mode: ${mode}.`;

    const geminiContents = [
      { role: "user", parts: [{ text: `SYSTEM INSTRUCTION:\n${systemText}` }] },
      { role: "model", parts: [{ text: "Understood. I am ready to assist." }] }
    ];

    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        geminiContents.push({ role, parts: [{ text: msg.content }] });
      });
    }

    geminiContents.push({ role: "user", parts: [{ text: message }] });

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: { temperature: 0.7 }
        })
      }
    );

    const data = await geminiResponse.json();
    
    if (data.error) throw new Error(data.error.message);
    
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "(No response generated)";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
}

/**
 * Handle Admin Auth
 */
async function handleAdminAuth(request, env, corsHeaders) {
  try {
    const { code } = await request.json();
    const validCode = env.ADMIN_ACCESS_CODE; 
    
    if (validCode && code === validCode) {
      return new Response(JSON.stringify({ success: true, token: crypto.randomUUID() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ success: false }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
