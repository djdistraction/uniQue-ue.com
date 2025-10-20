// This function runs on a secure Netlify server, not in the browser.
// It securely forwards requests from the website to the GitHub Models API.

const fetch = require('node-fetch');

// The official GitHub Models API endpoint
const MODELS_API_URL = 'https://models.github.ai/inference/chat/completions';

/**
 * Main serverless function handler.
 */
exports.handler = async function (event) {
  
  // --- 1. Security & Validation ---
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // Get the GitHub PAT from Netlify's secret environment variables.
  // This is the crucial security step. The token is never exposed to the public.
  const { GITHUB_PAT } = process.env;
  if (!GITHUB_PAT) {
    console.error('FATAL: GITHUB_PAT environment variable not configured.');
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Server configuration error. API key not configured.' })
    };
  }

  // --- 2. Request Parsing ---

  let chatHistory, systemPrompt, model;
  try {
    const body = JSON.parse(event.body);
    chatHistory = body.chatHistory;
    systemPrompt = body.systemPrompt;
    model = body.model || 'openai/gpt-4o-mini'; // Default to a capable and cost-effective model

    if (!chatHistory || !systemPrompt) {
        throw new Error("Missing 'chatHistory' or 'systemPrompt' in request body.");
    }

  } catch (error) {
    console.error('Invalid JSON in request body:', error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body: ' + error.message })
    };
  }

  // --- 3. API Payload Construction ---

  // Construct the message payload required by the GitHub Models API.
  // This includes the system prompt and the user's conversation history.
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    // Map the frontend chat history to the format the API expects.
    ...chatHistory.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : msg.role, // Convert 'model' to 'assistant'
      content: msg.parts.map(part => part.text).join('\n')
    }))
  ];
  
  const payload = {
    model: model,
    messages: messages
  };

  // --- 4. Secure API Call ---
  try {
    const apiResponse = await fetch(MODELS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_PAT}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify(payload)
    });

    // Handle errors from the GitHub Models API itself
    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`GitHub Models API error (${apiResponse.status}):`, errorBody);
      return {
        statusCode: apiResponse.status,
        body: JSON.stringify({ error: 'Failed to get response from AI service.', details: errorBody })
      };
    }

    const result = await apiResponse.json();

    // --- 5. Return Success Response ---
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Error calling GitHub Models API:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'An unexpected server error occurred.' 
      })
    };
  }
};

