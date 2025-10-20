# Quick Start Guide - 5 Minutes to Secure AI

This is the fastest way to get your AI-powered publisher working securely.

## Option A: GitHub Models (Recommended)

### Prerequisites
- GitHub account with access to GitHub Models
- 5 minutes of your time

### Steps

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```
   This opens your browser - create a free account if needed.

3. **Get your GitHub PAT**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (or just use GitHub Models access)
   - Copy the token (starts with `ghp_`)

4. **Set the secret**
   ```bash
   wrangler secret put GITHUB_PAT
   ```
   Paste your token when prompted.

5. **Deploy**
   ```bash
   wrangler deploy
   ```
   
6. **Copy your worker URL** from the output:
   ```
   https://unique-ue-ai-proxy.YOUR-SUBDOMAIN.workers.dev
   ```

7. **Test it**
   - Open `test-ai-proxy.html` in your browser
   - Paste your worker URL
   - Click "Run Health Check"

8. **Update publisher.html**
   - Edit line 269
   - Change: `const AI_FUNCTION_URL = '/.netlify/functions/getAiResponse';`
   - To: `const AI_FUNCTION_URL = 'YOUR-WORKER-URL';`

Done! 🎉

---

## Option B: HuggingFace (100% Free Forever)

### Prerequisites
- HuggingFace account (free)
- 5 minutes of your time

### Steps

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Get your HuggingFace token**
   - Go to https://huggingface.co/settings/tokens
   - Click "New token"
   - Copy the token

4. **Update wrangler.toml**
   - Change `main = "worker.js"` to `main = "worker-huggingface.js"`

5. **Set the secret**
   ```bash
   wrangler secret put HUGGINGFACE_TOKEN
   ```
   Paste your token when prompted.

6. **Deploy**
   ```bash
   wrangler deploy
   ```

7. **Copy your worker URL** and update `publisher.html` (same as Option A, step 8)

Done! 🎉

---

## Automated Setup (Even Easier!)

Just run:

```bash
./deploy-worker.sh
```

This script will:
- ✅ Install wrangler if needed
- ✅ Login to Cloudflare
- ✅ Ask which AI provider you want
- ✅ Guide you through setting secrets
- ✅ Deploy the worker
- ✅ Give you the next steps

---

## Troubleshooting

### "wrangler: command not found"
```bash
npm install -g wrangler
```

### "Not logged in"
```bash
wrangler login
```

### "GITHUB_PAT not configured"
```bash
wrangler secret put GITHUB_PAT
```

### "Model is loading" (HuggingFace)
Wait 10-20 seconds and try again. First request wakes up the model.

### Still having issues?
1. Check [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for detailed docs
2. Read [SOLUTION_COMPARISON.md](SOLUTION_COMPARISON.md) to understand the architecture
3. Open an issue on GitHub

---

## Monitoring Your Worker

### View logs in real-time
```bash
wrangler tail
```

### Check usage statistics
Go to Cloudflare Dashboard → Workers & Pages → Your Worker → Analytics

### View secrets
```bash
wrangler secret list
```

---

## Cost

**$0.00**

Free tier includes:
- 100,000 requests per day
- 10ms CPU time per request
- Unlimited workers

That's about 3 million requests per month - plenty for most projects!

---

## Security Checklist

- ✅ Secrets stored in Cloudflare (encrypted)
- ✅ Secrets never in git
- ✅ Secrets never exposed to frontend
- ✅ CORS configured properly
- ✅ Input validation in worker
- ✅ Error messages don't leak secrets

---

## What You Get

✅ **Secure**: API keys never exposed  
✅ **Fast**: < 5ms cold starts  
✅ **Free**: 100K requests/day  
✅ **Reliable**: 99.99% uptime  
✅ **Global**: 300+ edge locations  

---

## Next Steps After Setup

1. ✅ Test with `test-ai-proxy.html`
2. ✅ Update `publisher.html` with your worker URL
3. ✅ Commit and push to GitHub
4. ✅ Your publisher is now live with secure AI!

---

**Need help?** Read the detailed docs:
- [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) - Complete setup guide
- [SOLUTION_COMPARISON.md](SOLUTION_COMPARISON.md) - Why this is better than alternatives
- [README.md](README.md) - Project overview

**Questions?** Open an issue on GitHub!
