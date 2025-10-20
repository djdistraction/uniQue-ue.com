/**
 * Cloudflare Worker - AI Chat Proxy
 * 
 * This worker runs on Cloudflare's edge network and securely proxies
 * requests to the GitHub Models API, keeping the GITHUB_PAT secret.
 * 
 * Free tier: 100,000 requests per day
 * 
 * Setup:
 * 1. Create a Cloudflare account (free)
 * 2. Install Wrangler CLI: npm install -g wrangler
 * 3. Login: wrangler login
 * 4. Set secret: wrangler secret put GITHUB_PAT
 * 5. Deploy: wrangler deploy
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate the GitHub PAT is configured
    if (!env.GITHUB_PAT) {
      console.error('FATAL: GITHUB_PAT secret not configured');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error. API key not configured.' 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    try {
      // Parse request body
      const body = await request.json();
      const { chatHistory, systemPrompt, model = 'openai/gpt-4o-mini' } = body;

      if (!chatHistory || !systemPrompt) {
        return new Response(JSON.stringify({
          error: "Missing 'chatHistory' or 'systemPrompt' in request body."
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Construct messages for the API
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...chatHistory.map(msg => ({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.parts.map(part => part.text).join('\n')
        }))
      ];

      // Call GitHub Models API
      const apiResponse = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GITHUB_PAT}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          model: model,
          messages: messages
        })
      });

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error(`GitHub Models API error (${apiResponse.status}):`, errorBody);
        return new Response(JSON.stringify({
          error: 'Failed to get response from AI service.',
          details: errorBody
        }), {
          status: apiResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      const result = await apiResponse.json();

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('Error processing request:', error);
      return new Response(JSON.stringify({
        error: 'An unexpected server error occurred.',
        details: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
