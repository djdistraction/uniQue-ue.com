/**
 * Cloudflare Worker - AI Chat & Image Generation Proxy
 * 
 * This worker handles both text chat (via GitHub Models or HuggingFace)
 * and image generation (via HuggingFace Stable Diffusion models).
 * 
 * Endpoints:
 * - POST /chat - Text chat completion
 * - POST /generate-image - Image generation
 * 
 * Setup:
 * 1. Set secrets: 
 *    wrangler secret put GITHUB_PAT (optional, for text chat via GitHub Models)
 *    wrangler secret put HUGGINGFACE_TOKEN (required for image generation)
 * 2. Deploy: wrangler deploy
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

    const url = new URL(request.url);
    const path = url.pathname;

    // Route to appropriate handler
    if (path === '/generate-image' || path.endsWith('/generate-image')) {
      return handleImageGeneration(request, env);
    } else {
      // Default to chat endpoint
      return handleChat(request, env);
    }
  }
};

/**
 * Handle text chat completion
 */
async function handleChat(request, env) {
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

/**
 * Handle image generation using HuggingFace Inference API
 */
async function handleImageGeneration(request, env) {
  // Validate the HuggingFace token is configured
  if (!env.HUGGINGFACE_TOKEN) {
    console.error('FATAL: HUGGINGFACE_TOKEN secret not configured');
    return new Response(JSON.stringify({ 
      error: 'Server configuration error. Image generation API key not configured.',
      details: 'Please set the HUGGINGFACE_TOKEN secret using: wrangler secret put HUGGINGFACE_TOKEN'
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
    const { prompt, negative_prompt = '', width = 512, height = 512 } = body;

    if (!prompt) {
      return new Response(JSON.stringify({
        error: "Missing 'prompt' in request body."
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Use Stable Diffusion model
    // Options: 
    // - runwayml/stable-diffusion-v1-5 (reliable, fast)
    // - stabilityai/stable-diffusion-2-1 (higher quality)
    // - black-forest-labs/FLUX.1-schnell (newest, fastest)
    const model = 'runwayml/stable-diffusion-v1-5';
    
    const apiResponse = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.HUGGINGFACE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: negative_prompt || 'blurry, bad quality, distorted, ugly',
            num_inference_steps: 30,
            guidance_scale: 7.5,
            width: width,
            height: height
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
          details: 'The AI model is starting up. This usually takes 10-20 seconds.',
          loading: true
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': '20'
          }
        });
      }
      
      return new Response(JSON.stringify({
        error: 'Failed to generate image.',
        details: errorBody
      }), {
        status: apiResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // The response is the image binary data
    const imageBuffer = await apiResponse.arrayBuffer();
    
    // Return the image with proper headers
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000'
      }
    });

  } catch (error) {
    console.error('Error processing image generation request:', error);
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
