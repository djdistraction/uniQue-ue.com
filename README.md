# **djdistraction.github.io**

The official hub for uniQue-ue projects and directives. This repository hosts the static GitHub Pages site for [www.unique-ue.com](https://www.google.com/search?q=http://www.unique-ue.com).

## **Architecture**

This project uses a hybrid architecture to provide a secure, real-time AI chat experience with **ZERO COST**:

1. **Frontend (GitHub Pages):** The static website (index.html, publisher.html, etc.) is hosted directly from this repository using GitHub Pages.
2. **Backend (Cloudflare Workers - RECOMMENDED):** A single, lightweight serverless worker that securely proxies AI requests. **100% free** with 100,000 requests/day.
3. **AI Models:** Choose from multiple free options:
   - **GitHub Models API** (GPT-4o-mini, etc.) - Free during preview
   - **HuggingFace Inference API** - Completely free for open-source models

### **Why Cloudflare Workers?**

✅ **More Reliable than Netlify**: Better uptime and faster cold starts (< 5ms vs 200-500ms)  
✅ **Completely Free**: 100,000 requests/day vs Netlify's 125,000/month  
✅ **Global Edge Network**: Lower latency worldwide  
✅ **Easier Setup**: Simple deployment with `wrangler deploy`  
✅ **Better Security**: Encrypted secrets, never exposed to frontend

## **AI Chat Feature**

The publisher.html page features an AI-powered creative assistant ("Draven").

### **Setup Options**

We provide **THREE FREE OPTIONS** - choose the one that works best for you:

#### **Option 1: Cloudflare Workers (RECOMMENDED) ⭐**

**Why this is best:**
- ✅ 100% free (100,000 requests/day)
- ✅ Most reliable (global edge network)
- ✅ Fastest (< 5ms cold starts)
- ✅ Easiest to deploy

**Setup:**
1. See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for detailed instructions
2. Quick start: `npm install -g wrangler && wrangler login && wrangler deploy`

**Files:** `worker.js`, `wrangler.toml`

---

#### **Option 2: HuggingFace Alternative (100% Free, No GitHub PAT needed)**

Use open-source AI models from HuggingFace instead of GitHub Models.

**Pros:**
- ✅ Completely free forever (no rate limits)
- ✅ No GitHub PAT required
- ✅ Many models to choose from

**Cons:**
- ⚠️ Model quality may vary
- ⚠️ First request has 10-20s loading time (model warm-up)

**Setup:**
1. Create free account at https://huggingface.co
2. Generate token at https://huggingface.co/settings/tokens
3. Use `worker-huggingface.js` instead of `worker.js`
4. Deploy: `wrangler secret put HUGGINGFACE_TOKEN && wrangler deploy`

**Files:** `worker-huggingface.js`, `wrangler.toml`

---

#### **Option 3: Netlify Functions (Legacy)**

The original implementation. Less reliable than Cloudflare Workers.

**Setup:**
1. Create Netlify account
2. Link your GitHub repository
3. Set `GITHUB_PAT` environment variable in Netlify dashboard
4. Netlify will auto-deploy on git push

**Files:** `netlify/functions/getAiResponse.js`, `netlify.toml`

---

### **Recommended Setup**

For the best experience, use **Option 1 (Cloudflare Workers)**:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set your GitHub PAT as a secret
wrangler secret put GITHUB_PAT

# Deploy the worker
wrangler deploy
```

You'll get a URL like: `https://unique-ue-ai-proxy.YOUR-SUBDOMAIN.workers.dev`

Then update line 269 in `publisher.html` with your worker URL.

