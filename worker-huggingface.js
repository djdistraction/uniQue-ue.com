/**
 * Alternative Cloudflare Worker - HuggingFace Inference API Proxy
 * 
 * This worker uses HuggingFace's free Inference API as an alternative to GitHub Models.
 * 
 * Benefits:
 * - Completely free (no rate limits for most models)
 * - No GitHub PAT required
 * - Simple API
 * - Many open-source models available
 * 
 * Setup:
 * 1. Create a free HuggingFace account at https://huggingface.co
 * 2. Generate an API token at https://huggingface.co/settings/tokens
 * 3. Set secret: wrangler secret put HUGGINGFACE_TOKEN
 * 4. Deploy: wrangler deploy
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

    // Validate the HuggingFace token is configured
    if (!env.HUGGINGFACE_TOKEN) {
      console.error('FATAL: HUGGINGFACE_TOKEN secret not configured');
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
      const { chatHistory, systemPrompt } = body;

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

      // Build the conversation context
      let conversationText = `${systemPrompt}\n\n`;
      
      for (const msg of chatHistory) {
        const role = msg.role === 'model' ? 'Assistant' : 'User';
        const content = msg.parts.map(part => part.text).join('\n');
        conversationText += `${role}: ${content}\n\n`;
      }
      
      conversationText += 'Assistant:';

      // Use a free HuggingFace model (e.g., microsoft/DialoGPT-large or google/flan-t5-large)
      // For better quality, use: mistralai/Mistral-7B-Instruct-v0.1
      const model = 'mistralai/Mistral-7B-Instruct-v0.1';
      
      const apiResponse = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.HUGGINGFACE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: conversationText,
            parameters: {
              max_new_tokens: 1000,
              temperature: 0.7,
              top_p: 0.9,
              return_full_text: false
            }
          })
        }
      );

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error(`HuggingFace API error (${apiResponse.status}):`, errorBody);
        
        // If model is loading, return a friendly message
        if (apiResponse.status === 503) {
          return new Response(JSON.stringify({
            error: 'Model is loading. Please try again in a moment.',
            details: 'The AI model is starting up. This usually takes 10-20 seconds.'
          }), {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
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
      
      // Format response to match the expected structure
      const formattedResult = {
        choices: [{
          message: {
            content: result[0]?.generated_text || result.generated_text || 'No response generated'
          }
        }]
      };

      return new Response(JSON.stringify(formattedResult), {
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
