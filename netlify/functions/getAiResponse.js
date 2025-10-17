// This function runs on a secure server, not in the browser.
// It includes IP-based rate limiting to prevent abuse.

const fetch = require('node-fetch');

// In-memory store for rate limiting. This is a basic implementation.
// For a larger-scale application, a persistent store like Redis would be more robust.
const ipRequestMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS_PER_WINDOW = 20;

exports.handler = async function (event) {
  // --- Rate Limiting Check ---
  const clientIp = event.headers['x-nf-client-connection-ip'] || 'unknown';
  const now = Date.now();
  
  const requestTimestamps = ipRequestMap.get(clientIp) || [];
  const recentTimestamps = requestTimestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too Many Requests. Please wait a moment.' }),
    };
  }

  recentTimestamps.push(now);
  ipRequestMap.set(clientIp, recentTimestamps);

  // --- Proceed with existing logic ---
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { chatHistory, systemPrompt } = JSON.parse(event.body);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('API key not configured.');
    return { statusCode: 500, body: 'API key not configured.' };
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: chatHistory,
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  try {
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        throw new Error(`API call failed with status: ${apiResponse.status}, body: ${errorBody}`);
    }

    const result = await apiResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get response from AI.' }),
    };
  }
};


  }
};

