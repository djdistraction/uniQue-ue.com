// This function runs on a secure server, not in the browser.
// It includes Redis-based rate limiting, caching, input validation, and API authentication.

const crypto = require('crypto');
const validator = require('validator');

// Redis client setup - with fallback to in-memory for local development
let redisClient = null;
let useRedis = false;

// In-memory fallback for rate limiting and caching
const ipRequestMap = new Map();
const queryCache = new Map();

// Configuration constants
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS_PER_WINDOW = 20;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CHAT_HISTORY_LENGTH = 100;
const MAX_SYSTEM_PROMPT_LENGTH = 5000;
const MAX_MESSAGE_LENGTH = 10000;

// Initialize Redis client if available
async function initRedis() {
  if (process.env.REDIS_URL && !redisClient) {
    try {
      const redis = require('redis');
      redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.warn('Redis connection failed, falling back to in-memory storage');
              useRedis = false;
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });
      
      redisClient.on('error', (err) => {
        console.error('Redis error:', err);
        useRedis = false;
      });
      
      await redisClient.connect();
      useRedis = true;
      console.log('Redis client connected successfully');
    } catch (error) {
      console.warn('Redis initialization failed, using in-memory storage:', error.message);
      useRedis = false;
    }
  }
}

// Validate and sanitize input
function validateInput(chatHistory, systemPrompt) {
  const errors = [];
  
  // Validate chatHistory
  if (!Array.isArray(chatHistory)) {
    errors.push('chatHistory must be an array');
  } else {
    if (chatHistory.length === 0) {
      errors.push('chatHistory cannot be empty');
    }
    if (chatHistory.length > MAX_CHAT_HISTORY_LENGTH) {
      errors.push(`chatHistory exceeds maximum length of ${MAX_CHAT_HISTORY_LENGTH}`);
    }
    
    // Validate each message in chat history
    for (let i = 0; i < chatHistory.length; i++) {
      const message = chatHistory[i];
      if (!message.role || !message.parts) {
        errors.push(`Invalid message structure at index ${i}`);
      } else if (!['user', 'model'].includes(message.role)) {
        errors.push(`Invalid role at index ${i}: ${message.role}`);
      } else if (!Array.isArray(message.parts) || message.parts.length === 0) {
        errors.push(`Invalid parts at index ${i}`);
      } else {
        // Check each part
        message.parts.forEach((part, partIdx) => {
          if (!part.text || typeof part.text !== 'string') {
            errors.push(`Invalid text in message ${i}, part ${partIdx}`);
          } else if (part.text.length > MAX_MESSAGE_LENGTH) {
            errors.push(`Message ${i}, part ${partIdx} exceeds maximum length`);
          }
          // Sanitize the text to prevent injection
          part.text = validator.escape(part.text);
        });
      }
    }
  }
  
  // Validate systemPrompt
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    errors.push('systemPrompt must be a non-empty string');
  } else if (systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    errors.push(`systemPrompt exceeds maximum length of ${MAX_SYSTEM_PROMPT_LENGTH}`);
  }
  
  return errors;
}

// Check rate limit using Redis or in-memory storage
async function checkRateLimit(clientIp) {
  const now = Date.now();
  const key = `rate_limit:${clientIp}`;
  
  if (useRedis && redisClient) {
    try {
      const count = await redisClient.get(key);
      const requests = count ? parseInt(count) : 0;
      
      if (requests >= MAX_REQUESTS_PER_WINDOW) {
        return false;
      }
      
      await redisClient.set(key, requests + 1, {
        PX: RATE_LIMIT_WINDOW_MS,
        NX: !count
      });
      return true;
    } catch (error) {
      console.error('Redis rate limit check failed:', error);
      // Fall back to in-memory
    }
  }
  
  // In-memory fallback
  const requestTimestamps = ipRequestMap.get(clientIp) || [];
  const recentTimestamps = requestTimestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);
  
  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentTimestamps.push(now);
  ipRequestMap.set(clientIp, recentTimestamps);
  return true;
}

// Generate cache key for query
function generateCacheKey(chatHistory, systemPrompt) {
  const content = JSON.stringify({ chatHistory, systemPrompt });
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Check cache for existing response
async function getFromCache(cacheKey) {
  if (useRedis && redisClient) {
    try {
      const cached = await redisClient.get(`cache:${cacheKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Redis cache get failed:', error);
    }
  }
  
  // In-memory fallback
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

// Store response in cache
async function storeInCache(cacheKey, data) {
  if (useRedis && redisClient) {
    try {
      await redisClient.set(`cache:${cacheKey}`, JSON.stringify(data), {
        PX: CACHE_TTL_MS
      });
      return;
    } catch (error) {
      console.error('Redis cache set failed:', error);
    }
  }
  
  // In-memory fallback
  queryCache.set(cacheKey, { data, timestamp: Date.now() });
  
  // Clean up old entries
  if (queryCache.size > 100) {
    const entries = Array.from(queryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    queryCache.delete(entries[0][0]);
  }
}

// Verify API token authentication
function verifyApiToken(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const expectedToken = process.env.API_AUTH_TOKEN;
  
  // If no token is configured, skip authentication (for backwards compatibility)
  if (!expectedToken) {
    return true;
  }
  
  if (!authHeader) {
    return false;
  }
  
  // Support both "Bearer token" and direct token formats
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;
  
  return token === expectedToken;
}

// Main handler
exports.handler = async function (event) {
  // Initialize Redis on first request
  if (!redisClient && process.env.REDIS_URL) {
    await initRedis();
  }
  
  // Check HTTP method
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }
  
  // Verify API token if configured
  if (!verifyApiToken(event)) {
    console.warn('Unauthorized access attempt');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized. Invalid or missing API token.' })
    };
  }
  
  // Extract client IP for rate limiting
  const clientIp = event.headers['x-nf-client-connection-ip'] || 
                   event.headers['x-forwarded-for'] || 
                   'unknown';
  
  // Check rate limit
  const rateLimitOk = await checkRateLimit(clientIp);
  if (!rateLimitOk) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return {
      statusCode: 429,
      body: JSON.stringify({ 
        error: 'Too Many Requests. Please wait a moment before trying again.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
      })
    };
  }
  
  // Parse and validate request body
  let chatHistory, systemPrompt;
  try {
    const body = JSON.parse(event.body);
    chatHistory = body.chatHistory;
    systemPrompt = body.systemPrompt;
  } catch (error) {
    console.error('Invalid JSON in request body:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    };
  }
  
  // Validate input
  const validationErrors = validateInput(chatHistory, systemPrompt);
  if (validationErrors.length > 0) {
    console.warn('Input validation failed:', validationErrors);
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'Input validation failed',
        details: validationErrors
      })
    };
  }
  
  // Check API key configuration
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.error('GEMINI_API_KEY not configured or empty');
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Server configuration error. API key not configured.' })
    };
  }
  
  // Check cache for existing response
  const cacheKey = generateCacheKey(chatHistory, systemPrompt);
  const cachedResponse = await getFromCache(cacheKey);
  if (cachedResponse) {
    console.log('Returning cached response for key:', cacheKey);
    return {
      statusCode: 200,
      headers: { 'X-Cache': 'HIT' },
      body: JSON.stringify(cachedResponse)
    };
  }
  
  // Prepare API request
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: chatHistory,
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };
  
  // Call Gemini API
  try {
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    // Handle different HTTP status codes
    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`Gemini API error: ${apiResponse.status}`, errorBody);
      
      switch (apiResponse.status) {
        case 400:
          return {
            statusCode: 400,
            body: JSON.stringify({ 
              error: 'Bad Request. The request was invalid.',
              details: errorBody
            })
          };
        case 401:
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: 'Server configuration error. Invalid API key.' 
            })
          };
        case 403:
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: 'Server configuration error. API access forbidden.' 
            })
          };
        case 429:
          return {
            statusCode: 429,
            body: JSON.stringify({ 
              error: 'API rate limit exceeded. Please try again later.' 
            })
          };
        case 500:
        case 502:
        case 503:
          return {
            statusCode: 503,
            body: JSON.stringify({ 
              error: 'AI service temporarily unavailable. Please try again later.' 
            })
          };
        default:
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: 'Failed to get response from AI service.',
              status: apiResponse.status
            })
          };
      }
    }
    
    const result = await apiResponse.json();
    
    // Store successful response in cache
    await storeInCache(cacheKey, result);
    
    return {
      statusCode: 200,
      headers: { 'X-Cache': 'MISS' },
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Handle network errors
    if (error.name === 'FetchError' || error.code === 'ENOTFOUND') {
      return {
        statusCode: 503,
        body: JSON.stringify({ 
          error: 'Unable to reach AI service. Please check your connection.' 
        })
      };
    }
    
    // Handle timeout errors
    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      return {
        statusCode: 504,
        body: JSON.stringify({ 
          error: 'Request to AI service timed out. Please try again.' 
        })
      };
    }
    
    // Generic error
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'An unexpected error occurred while processing your request.' 
      })
    };
  }
};

