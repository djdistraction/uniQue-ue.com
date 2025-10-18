# djdistraction.github.io
The official hub for our projects and directives. uniQue-ue: A cybernetics consortium specializing in web architecture, neuro-interface design, and decentralized solutions. Redefining what it is to be alive. uniQue-ue is exploring the frontiers of intelligence and technology through pioneering cybernetic projects.

## AI Chat Feature

This repository includes a serverless AI chat function powered by Google's Gemini API. The function includes advanced features for security, performance, and reliability.

### 🆕 Recommended Upgrade: Vercel AI SDK

For enhanced functionality and better user experience, we recommend upgrading to the **Vercel AI SDK** with multi-provider support.

**📚 Start Here:**
- **[QUICK_START.md](QUICK_START.md)** - ⏱️ 5-minute overview and decision guide
- **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - Executive overview and business case
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Step-by-step technical implementation
- **[AI_PROVIDERS_COMPARISON.md](AI_PROVIDERS_COMPARISON.md)** - Detailed provider comparison chart
- **[AI_INTEGRATION_RECOMMENDATION.md](AI_INTEGRATION_RECOMMENDATION.md)** - Comprehensive technical analysis
- **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)** - Visual architecture and data flows

**Key Benefits:**
- ✅ **Streaming Support** - Display responses as they're generated (60% faster perceived performance)
- ✅ **Multi-Provider Support** - Use OpenAI, Anthropic, or Google Gemini with the same code
- ✅ **Better Developer Experience** - TypeScript support, better error handling, modern APIs
- ✅ **Future-Proof** - Easy to switch providers as the AI landscape evolves
- ✅ **Higher Reliability** - Automatic fallback between providers (99.9% uptime)

### Features

- **Redis-based Rate Limiting**: Prevents abuse with configurable rate limits (20 requests per 60 seconds by default)
- **Query Caching**: Reduces API calls by caching repeated queries for 5 minutes
- **Input Validation**: Comprehensive validation and sanitization to prevent injection attacks
- **API Token Authentication**: Optional authentication to restrict endpoint access
- **Granular Error Handling**: Detailed error responses with appropriate HTTP status codes
- **Automatic Fallbacks**: Falls back to in-memory storage if Redis is unavailable

### Setup Instructions

#### 1. Environment Variables

Set up the following environment variables in your Netlify dashboard or `.env` file:

**Required:**
- `GEMINI_API_KEY`: Your Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

**Optional:**
- `REDIS_URL`: Redis connection URL for production rate limiting and caching (e.g., `redis://username:password@host:port`)
- `API_AUTH_TOKEN`: Bearer token for API authentication (if not set, authentication is disabled for backwards compatibility)

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Local Development

For local development without Redis:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run locally
netlify dev
```

The function will automatically fall back to in-memory storage if Redis is not configured.

#### 4. Deploy to Netlify

1. Push your changes to GitHub
2. Connect your repository to Netlify
3. Set environment variables in Netlify dashboard:
   - Go to Site settings → Environment variables
   - Add `GEMINI_API_KEY` and optionally `REDIS_URL` and `API_AUTH_TOKEN`
4. Deploy!

### Usage

#### Making a Request

```javascript
const response = await fetch('/.netlify/functions/getAiResponse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Include if API_AUTH_TOKEN is configured
    'Authorization': 'Bearer YOUR_API_TOKEN'
  },
  body: JSON.stringify({
    chatHistory: [
      {
        role: 'user',
        parts: [{ text: 'Hello, how are you?' }]
      }
    ],
    systemPrompt: 'You are a helpful AI assistant.'
  })
});

const result = await response.json();
```

#### Request Format

- `chatHistory` (required): Array of message objects with `role` ('user' or 'model') and `parts` (array of text objects)
- `systemPrompt` (required): String containing instructions for the AI

#### Response Format

**Success (200):**
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "AI response here" }]
    }
  }]
}
```

**Cache Hit:**
Response includes `X-Cache: HIT` header when served from cache.

**Error Responses:**
- `400`: Bad Request - Invalid input format or validation failed
- `401`: Unauthorized - Invalid or missing API token
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Server Error - Configuration or internal error
- `503`: Service Unavailable - AI service temporarily unavailable
- `504`: Gateway Timeout - Request to AI service timed out

### Configuration

The function includes several configurable constants in `netlify/functions/getAiResponse.js`:

```javascript
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // Rate limit window (60 seconds)
const MAX_REQUESTS_PER_WINDOW = 20;     // Max requests per window
const CACHE_TTL_MS = 5 * 60 * 1000;     // Cache TTL (5 minutes)
const MAX_CHAT_HISTORY_LENGTH = 100;    // Max messages in history
const MAX_SYSTEM_PROMPT_LENGTH = 5000;  // Max system prompt length
const MAX_MESSAGE_LENGTH = 10000;       // Max individual message length
```

### Security Features

1. **Input Validation**: All inputs are validated for type, length, and structure
2. **Input Sanitization**: Text content is escaped to prevent injection attacks
3. **Rate Limiting**: Prevents abuse with IP-based rate limiting
4. **API Authentication**: Optional token-based authentication
5. **Error Sanitization**: Sensitive error details are not exposed to clients

### Troubleshooting

#### "API key not configured" error
- Ensure `GEMINI_API_KEY` is set in your environment variables
- Check that the environment variable is not empty or whitespace-only
- Redeploy your site after adding environment variables

#### Rate limit exceeded
- Default limit is 20 requests per 60 seconds per IP
- Wait for the rate limit window to expire
- Consider implementing client-side request throttling
- For higher limits, adjust `MAX_REQUESTS_PER_WINDOW` in the code

#### Redis connection issues
- The function automatically falls back to in-memory storage
- Check `REDIS_URL` format: `redis://[username:password@]host:port`
- Verify Redis server is accessible from Netlify
- Check Redis logs for connection errors

#### Validation errors
- Ensure `chatHistory` is an array of valid message objects
- Check that message roles are either 'user' or 'model'
- Verify message lengths don't exceed limits
- Ensure `systemPrompt` is a non-empty string

#### Cache not working
- Cache requires Redis for production environments
- In local development, in-memory cache is used
- Cache TTL is 5 minutes by default
- Cache keys are generated from request content (identical requests share cache)

#### Authentication failing
- If `API_AUTH_TOKEN` is set, include `Authorization` header
- Format: `Authorization: Bearer YOUR_TOKEN`
- Token must match exactly (case-sensitive)
- If authentication isn't needed, remove `API_AUTH_TOKEN` from environment

### Performance Optimization

1. **Enable Redis**: Set `REDIS_URL` for distributed caching and rate limiting
2. **Use Caching**: Identical queries are cached for 5 minutes
3. **Batch Requests**: Minimize API calls by batching user interactions
4. **Monitor Limits**: Track rate limit usage to optimize client behavior

### Development

To modify the AI chat function:

1. Edit `netlify/functions/getAiResponse.js`
2. Test locally with `netlify dev`
3. Commit and push changes
4. Netlify will automatically redeploy

### Dependencies

- `node-fetch`: HTTP client for API requests
- `redis`: Redis client for caching and rate limiting
- `validator`: Input validation and sanitization
- `crypto`: Hashing for cache keys (Node.js built-in)

### Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Netlify function logs for detailed error messages
3. Verify all environment variables are correctly set
4. Ensure dependencies are properly installed

