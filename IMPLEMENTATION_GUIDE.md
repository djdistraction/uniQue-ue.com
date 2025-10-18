# Vercel AI SDK Implementation Guide

This guide provides step-by-step instructions for implementing the recommended Vercel AI SDK solution.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Basic Implementation](#basic-implementation)
4. [Advanced Features](#advanced-features)
5. [Migration from Current System](#migration-from-current-system)
6. [Testing](#testing)
7. [Deployment](#deployment)

## Prerequisites

### Required API Keys
1. **Google Gemini API Key** (already have)
   - Get from: https://makersuite.google.com/app/apikey
   
2. **OpenAI API Key** (recommended)
   - Get from: https://platform.openai.com/api-keys
   - Required for GPT-4o mini fallback
   
3. **Anthropic API Key** (optional)
   - Get from: https://console.anthropic.com/
   - Required for Claude models

### Environment Variables
Add these to your `.env` file and Netlify dashboard:

```bash
# Existing
GEMINI_API_KEY=your_gemini_key_here
REDIS_URL=your_redis_url_here
API_AUTH_TOKEN=your_auth_token_here

# New for Vercel AI SDK
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
DEFAULT_AI_PROVIDER=gemini  # Options: gemini, openai, anthropic
```

## Installation

### Step 1: Install Dependencies

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google-generative-ai
```

### Step 2: Update package.json

Your `package.json` should look like this:

```json
{
  "name": "unique-ue-serverless",
  "version": "2.0.0",
  "description": "Serverless functions for the uniQue-ue website with Vercel AI SDK.",
  "dependencies": {
    "ai": "^3.0.0",
    "@ai-sdk/openai": "^0.0.20",
    "@ai-sdk/anthropic": "^0.0.10",
    "@ai-sdk/google-generative-ai": "^0.0.15",
    "node-fetch": "^2.6.7",
    "redis": "^4.6.0",
    "validator": "^13.11.0"
  }
}
```

## Basic Implementation

### Step 3: Create New AI Function with Streaming

Create a new file: `netlify/functions/getAiResponseStream.js`

```javascript
const { streamText } = require('ai');
const { google } = require('@ai-sdk/google-generative-ai');
const { openai } = require('@ai-sdk/openai');
const { anthropic } = require('@ai-sdk/anthropic');

// Provider configuration
const providers = {
  gemini: () => google('models/gemini-1.5-flash'),
  openai: () => openai('gpt-4o-mini'),
  anthropic: () => anthropic('claude-3-haiku-20240307')
};

// Get provider based on environment or fallback
function getProvider() {
  const preferredProvider = process.env.DEFAULT_AI_PROVIDER || 'gemini';
  
  // Check if API key exists for preferred provider
  if (preferredProvider === 'gemini' && process.env.GEMINI_API_KEY) {
    return providers.gemini();
  }
  if (preferredProvider === 'openai' && process.env.OPENAI_API_KEY) {
    return providers.openai();
  }
  if (preferredProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return providers.anthropic();
  }
  
  // Fallback logic
  if (process.env.GEMINI_API_KEY) return providers.gemini();
  if (process.env.OPENAI_API_KEY) return providers.openai();
  if (process.env.ANTHROPIC_API_KEY) return providers.anthropic();
  
  throw new Error('No AI provider API key configured');
}

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { messages, systemPrompt } = JSON.parse(event.body);
    
    // Get the appropriate AI provider
    const model = getProvider();
    
    // Stream the response
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.parts[0].text
      })),
    });

    // Return the Response object directly for Netlify streaming
    return result.toAIStreamResponse();
  } catch (error) {
    console.error('Error in AI streaming:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate AI response',
        details: error.message 
      })
    };
  }
};
```

### Step 4: Update Frontend for Streaming

Update your `publisher.html` JavaScript to handle streaming responses:

```javascript
// Replace the handleSend function with streaming support
const handleSend = async () => {
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  addMessage('user', userMessage);
  chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
  chatInput.value = '';

  // Create AI message container for streaming
  const aiMessageDiv = document.createElement('div');
  aiMessageDiv.className = 'p-3 rounded-lg bg-brand-accent/10 self-start max-w-xs text-sm';
  aiMessageDiv.innerHTML = `<p class="font-bold text-brand-accent">AI Muse</p><p class="text-brand-text-muted" id="streaming-text"></p>`;
  chatContainer.appendChild(aiMessageDiv);
  
  const streamingTextEl = document.getElementById('streaming-text');
  let fullResponse = '';

  try {
    const response = await fetch('/.netlify/functions/getAiResponseStream', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // If using authentication
      },
      body: JSON.stringify({ 
        messages: chatHistory, 
        systemPrompt 
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullResponse += parsed.content;
              streamingTextEl.textContent = fullResponse;
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          } catch (e) {
            // Skip invalid JSON chunks
          }
        }
      }
    }

    // Add complete response to history
    chatHistory.push({ role: 'model', parts: [{ text: fullResponse }] });

  } catch (error) {
    console.error('Error communicating with AI:', error);
    streamingTextEl.textContent = 'Error: Could not connect to AI service.';
  }
};
```

## Advanced Features

### Rate Limiting with Vercel AI SDK

```javascript
// Add to your function
const rateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimit.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 20) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return true;
}
```

### Provider Fallback Logic

```javascript
async function getProviderWithFallback() {
  const providers = [
    { name: 'gemini', key: process.env.GEMINI_API_KEY, fn: () => google('models/gemini-1.5-flash') },
    { name: 'openai', key: process.env.OPENAI_API_KEY, fn: () => openai('gpt-4o-mini') },
    { name: 'anthropic', key: process.env.ANTHROPIC_API_KEY, fn: () => anthropic('claude-3-haiku-20240307') }
  ];

  for (const provider of providers) {
    if (provider.key) {
      try {
        return provider.fn();
      } catch (error) {
        console.warn(`Provider ${provider.name} failed, trying next...`);
      }
    }
  }
  
  throw new Error('All AI providers unavailable');
}
```

### Token Usage Tracking

```javascript
const result = await streamText({
  model,
  system: systemPrompt,
  messages,
  onFinish: async ({ usage }) => {
    console.log('Token usage:', usage);
    // Log to analytics or database
    await logUsage({
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens
    });
  }
});
```

## Migration from Current System

### Option 1: Parallel Run (Recommended)

1. Keep existing `getAiResponse.js` function
2. Deploy new `getAiResponseStream.js` function
3. Update frontend to use new endpoint
4. Monitor for 1 week
5. Deprecate old endpoint

### Option 2: Feature Flag

```javascript
// In your frontend
const useStreaming = localStorage.getItem('useStreaming') === 'true';
const endpoint = useStreaming 
  ? '/.netlify/functions/getAiResponseStream'
  : '/.netlify/functions/getAiResponse';
```

### Option 3: Gradual Rollout

```javascript
// Route percentage of users to new endpoint
const useNewEndpoint = Math.random() < 0.1; // 10% of users
```

## Testing

### Unit Tests

```javascript
// test/aiFunction.test.js
const { handler } = require('../netlify/functions/getAiResponseStream');

test('should handle valid chat request', async () => {
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      systemPrompt: 'You are helpful'
    })
  };
  
  const response = await handler(event);
  expect(response.statusCode).toBe(200);
});
```

### Integration Tests

```bash
# Test streaming endpoint
curl -X POST https://yoursite.netlify.app/.netlify/functions/getAiResponseStream \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","parts":[{"text":"Hello"}]}],"systemPrompt":"You are helpful"}'
```

### Load Testing

```javascript
// Use Artillery or k6 for load testing
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  const response = http.post(
    'https://yoursite.netlify.app/.netlify/functions/getAiResponseStream',
    JSON.stringify({
      messages: [{ role: 'user', parts: [{ text: 'Test message' }] }],
      systemPrompt: 'You are helpful'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
}
```

## Deployment

### Step 1: Environment Variables

Add to Netlify dashboard:
- Site Settings → Environment variables
- Add: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEFAULT_AI_PROVIDER`

### Step 2: Deploy to Netlify

```bash
# Install dependencies
npm install

# Test locally
netlify dev

# Deploy to production
git add .
git commit -m "Implement Vercel AI SDK with streaming support"
git push origin main
```

### Step 3: Monitor

- Check Netlify function logs
- Monitor error rates
- Track token usage
- Monitor response times

## Troubleshooting

### "No AI provider API key configured"
- Verify environment variables in Netlify dashboard
- Check variable names are correct (case-sensitive)
- Redeploy site after adding variables

### Streaming not working
- Check browser console for errors
- Verify Content-Type headers
- Test with simple fetch without streaming first

### High API costs
- Implement better caching strategy
- Use cheaper models (Gemini or GPT-4o mini)
- Add more aggressive rate limiting

## Best Practices

1. **Always use streaming** for better UX
2. **Implement fallback providers** for reliability
3. **Monitor token usage** to control costs
4. **Cache repeated queries** when possible
5. **Rate limit aggressively** to prevent abuse
6. **Log errors** for debugging
7. **Test thoroughly** before production deployment

## Resources

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Anthropic API Reference](https://docs.anthropic.com/)
- [Google Gemini API Reference](https://ai.google.dev/docs)

---

**Need help?** Check the troubleshooting section or review Netlify function logs for detailed error messages.
