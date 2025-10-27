# Cloudflare Worker Setup Guide

This document explains how to deploy the AI proxy using Cloudflare Workers (100% free, more reliable than Netlify).

## Why Cloudflare Workers?

1. **Completely Free**: 100,000 requests per day on the free tier
2. **More Reliable**: Better uptime than Netlify's free tier
3. **Faster**: Global edge network with lower latency
4. **Easier Setup**: Simple deployment process
5. **Secure**: Environment variables (secrets) are encrypted and never exposed

## Setup Instructions

### Step 1: Create a Cloudflare Account

1. Go to [https://cloudflare.com](https://cloudflare.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 3: Login to Cloudflare

```bash
wrangler login
```

This will open your browser to authenticate.

### Step 4: Set Your GitHub Personal Access Token

You need a GitHub PAT with access to GitHub Models. Create one at:
https://github.com/settings/tokens

Then set it as a secret:

```bash
wrangler secret put GITHUB_PAT
```

When prompted, paste your token (it starts with `ghp_` or `github_pat_`).

### Step 5: Deploy the Worker

```bash
wrangler deploy
```

This will deploy your worker and give you a URL like:
`https://unique-ue-ai-proxy.YOUR-SUBDOMAIN.workers.dev`

### Step 6: Update Your Frontend

In `ghost-writer.html`, change line 269 from:

```javascript
const AI_FUNCTION_URL = '/.netlify/functions/getAiResponse';
```

To:

```javascript
const AI_FUNCTION_URL = 'https://unique-ue-ai-proxy.YOUR-SUBDOMAIN.workers.dev';
```

Replace `YOUR-SUBDOMAIN` with your actual Cloudflare Workers subdomain.

## Testing Your Deployment

You can test the worker with curl:

```bash
curl -X POST https://unique-ue-ai-proxy.YOUR-SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "chatHistory": [],
    "systemPrompt": "You are a helpful assistant.",
    "model": "openai/gpt-4o-mini"
  }'
```

## Monitoring

1. Log into Cloudflare Dashboard
2. Go to Workers & Pages
3. Click on your worker
4. View analytics and logs

## Cost

**$0.00** - The free tier includes:
- 100,000 requests per day
- 10ms CPU time per request
- More than enough for most use cases

## Security

- Your GitHub PAT is stored as an encrypted secret in Cloudflare
- It's never exposed to the frontend
- All requests are logged for debugging (but secrets are redacted)
- CORS is configured to allow only necessary origins

## Troubleshooting

**Worker not responding?**
- Check that you deployed: `wrangler deploy`
- Verify the secret is set: `wrangler secret list`

**GitHub API errors?**
- Ensure your PAT has the correct permissions
- Check if GitHub Models is available in your region

**CORS errors?**
- The worker allows all origins (`*`) for development
- In production, you should restrict this to your domain

## Alternative: Local Development

For local testing:

```bash
wrangler dev
```

This runs the worker locally at `http://localhost:8787`

## Comparison with Netlify

| Feature | Cloudflare Workers | Netlify Functions |
|---------|-------------------|------------------|
| Free Tier | 100K req/day | 125K req/month |
| Cold Starts | < 5ms | 200-500ms |
| Global Edge | Yes | Limited |
| Setup | Simple | Complex |
| Reliability | Excellent | Good |

## Next Steps

Once deployed, your ghost-writer.html page will work with the AI assistant without exposing any secrets!
