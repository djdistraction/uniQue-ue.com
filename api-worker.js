// Cloudflare Worker for API endpoints

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    };

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    // Route handlers
    if (path === '/generate-prompts' && request.method === 'POST') {
      return handlePromptGeneration(request, env, corsHeaders);
    }

    // Default 404 response
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }
};

/**
 * Handle prompt generation using Gemini API
 */
async function handlePromptGeneration(request, env, corsHeaders) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      role = '',
      task = '',
      context = '',
      constraints = '',
      outputFormat = '',
      tone = ''
    } = body;

    // Validate required fields
    if (!task) {
      return new Response(
        JSON.stringify({ error: 'Task parameter is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Check for API key
    if (!env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Construct the prompt for Gemini
    const promptParts = [];
    
    if (role) promptParts.push(`Role: ${role}`);
    promptParts.push(`Task: ${task}`);
    if (context) promptParts.push(`Context: ${context}`);
    if (constraints) promptParts.push(`Constraints: ${constraints}`);
    if (outputFormat) promptParts.push(`Output Format: ${outputFormat}`);
    if (tone) promptParts.push(`Tone: ${tone}`);
    
    promptParts.push('\nPlease generate 3 different prompt variations for this request, along with overall guidance for best results.');

    const prompt = promptParts.join('\n\n');

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate prompts', details: errorText }),
        {
          status: geminiResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const geminiData = await geminiResponse.json();
    
    // Extract the generated content
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the response to extract variations and guidance
    // This is a simplified parser - you may want to enhance this based on actual response format
    const variations = [];
    const lines = generatedText.split('\n');
    
    let currentVariation = '';
    let overallGuidance = '';
    let inGuidanceSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('variation') || 
          trimmedLine.match(/^\d+\./)) {
        if (currentVariation) {
          variations.push({
            modelName: 'gemini-pro',
            content: currentVariation.trim()
          });
        }
        currentVariation = '';
      } else if (trimmedLine.toLowerCase().includes('guidance') || 
                 trimmedLine.toLowerCase().includes('recommendation')) {
        inGuidanceSection = true;
        if (currentVariation) {
          variations.push({
            modelName: 'gemini-pro',
            content: currentVariation.trim()
          });
          currentVariation = '';
        }
      } else if (inGuidanceSection) {
        overallGuidance += line + '\n';
      } else if (trimmedLine) {
        currentVariation += line + '\n';
      }
    }

    // Add the last variation if exists
    if (currentVariation && !inGuidanceSection) {
      variations.push({
        modelName: 'gemini-pro',
        content: currentVariation.trim()
      });
    }

    // If parsing didn't work well, create a single variation with all content
    if (variations.length === 0) {
      variations.push({
        modelName: 'gemini-pro',
        content: generatedText
      });
      overallGuidance = 'Review the generated prompt and adjust based on your specific needs.';
    }

    // Ensure we have guidance
    if (!overallGuidance.trim()) {
      overallGuidance = 'Use these prompt variations as starting points. Adjust the specificity and constraints based on your desired output quality and format.';
    }

    // Return formatted response
    return new Response(
      JSON.stringify({
        variations: variations,
        overallGuidance: overallGuidance.trim()
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in handlePromptGeneration:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
