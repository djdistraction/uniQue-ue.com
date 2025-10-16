// This function runs on a secure server, not in the browser.
// It keeps your API key safe.

// In-memory store for IP-based rate limiting
const ipRequestStore = new Map();

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

// Helper function to check rate limit
function checkRateLimit(ip) {
  const now = Date.now();
  
  if (!ipRequestStore.has(ip)) {
    ipRequestStore.set(ip, [now]);
    return true;
  }
  
  const timestamps = ipRequestStore.get(ip);
  
  // Filter out timestamps older than the rate limit window
  const recentTimestamps = timestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  
  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  // Add current timestamp and update the store
  recentTimestamps.push(now);
  ipRequestStore.set(ip, recentTimestamps);
  
  return true;
}

// Helper function to verify reCAPTCHA token
async function verifyRecaptcha(token, ip, secretKey) {
  const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
  
  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
    remoteip: ip
  });
  
  try {
    const response = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
}

exports.handler = async function (event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Get the user's IP address from Netlify headers
  const clientIp = event.headers['x-nf-client-connection-ip'];
  
  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    };
  }

  // Get the chat history, system prompt, and captcha token from the request body
  const { chatHistory, systemPrompt, captchaToken } = JSON.parse(event.body);
  
  // Get the secret keys from environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: 'API key not configured.' };
  }

  if (!recaptchaSecretKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'reCAPTCHA secret key not configured.' }),
    };
  }

  // Verify reCAPTCHA token
  const isRecaptchaValid = await verifyRecaptcha(captchaToken, clientIp, recaptchaSecretKey);
  
  if (!isRecaptchaValid) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'reCAPTCHA verification failed.' }),
    };
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
        throw new Error(`API call failed with status: ${apiResponse.status}`);
    }

    const result = await apiResponse.json();

    // Send the AI's response back to the website
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
