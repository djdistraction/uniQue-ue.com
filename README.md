# **djdistraction.github.io**

The official hub for uniQue-ue projects and directives. This repository hosts the static GitHub Pages site for [www.unique-ue.com](https://www.google.com/search?q=http://www.unique-ue.com).

## 🚀 Quick Links

- **[Live Site](https://djdistraction.github.io)** - Visit the deployed website
- **[Documentation Index](DOCS_INDEX.md)** - Navigate all documentation
- **[Quick Start](QUICKSTART.md)** - 5-minute setup guide
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Deployment Guide](DEPLOYMENT.md)** - Deployment instructions

## 📋 Table of Contents

- [Architecture](#architecture)
- [AI Chat Feature](#ai-chat-feature)
- [Pages](#pages)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

## **Architecture**

This project uses a hybrid architecture to provide a secure, real-time AI chat experience with **ZERO COST**:

1. **Frontend (GitHub Pages):** The static website (index.html, ghost-writer.html, etc.) is hosted directly from this repository using GitHub Pages.
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

## 🎨 **AI Image Generation Feature** 🆕

The Graphics Studio page features **Elena**, an AI visual storytelling assistant that generates images using Stable Diffusion.

### **Features**

✨ **Document-Based Image Generation** - Upload documents and get relevant image suggestions  
🤖 **AI-Powered Prompts** - Elena analyzes your content and creates detailed prompts  
🎨 **Real Image Generation** - Uses Stable Diffusion v1.5 via HuggingFace Inference API  
📥 **Download Images** - Save individual or all generated images  
🖼️ **Image Gallery** - View all generated images with their prompts  
⚡ **Free Tier** - Completely free using HuggingFace's Inference API (~1000 images/day)

### **Setup**

To enable image generation, see [IMAGE_GENERATION_SETUP.md](IMAGE_GENERATION_SETUP.md) for complete instructions.

**Quick Setup:**
1. Create free HuggingFace account at https://huggingface.co
2. Generate API token at https://huggingface.co/settings/tokens
3. Set secret: `wrangler secret put HUGGINGFACE_TOKEN`
4. Deploy: `wrangler deploy worker-image-gen.js`
5. Update `AI_FUNCTION_URL` in `graphics-studio.html` with your worker URL

---

## **AI Chat Feature** (Text Generation)

The ghost-writer.html page features an AI-powered creative assistant ("Draven").

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

---

## 📄 Pages

### Live Pages
- **[Home](https://djdistraction.github.io/)** - Main landing page
- **[About](https://djdistraction.github.io/about.html)** - Company vision and mission
- **[Ghost-Writer](https://djdistraction.github.io/ghost-writer.html)** - AI-powered creative writing assistant
- **[Graphics Studio](https://djdistraction.github.io/graphics-studio.html)** - AI-powered image generation 🆕
- **[Blog](https://djdistraction.github.io/blog.html)** - Latest updates and articles
- **[Music History](https://djdistraction.github.io/music-history.html)** - Daily music history posts
- **[Downloads](https://djdistraction.github.io/downloads.html)** - Resources and documentation
- **[Events](https://djdistraction.github.io/events.html)** - Community events
- **[Careers](https://djdistraction.github.io/careers.html)** - Join our team
- **[Investors](https://djdistraction.github.io/investors.html)** - Investor relations
- **[Chimera Tower HQ](https://djdistraction.github.io/chimera-tower.html)** - Virtual headquarters

### Developer Pages
- **[AI Proxy Test](https://djdistraction.github.io/test-ai-proxy.html)** - Test your worker deployment
- **[Ghost-Writer Config Example](https://djdistraction.github.io/publisher-config-example.html)** - Configuration guide

---

## 🏁 Getting Started

### For Users

1. Visit the [live site](https://djdistraction.github.io)
2. Explore the [Ghost-Writer tool](https://djdistraction.github.io/ghost-writer.html)
3. Read the [documentation](DOCS_INDEX.md)

### For Developers

1. **Clone the repository**
   ```bash
   git clone https://github.com/djdistraction/djdistraction.github.io.git
   cd djdistraction.github.io
   ```

2. **Set up Cloudflare Workers** (for AI features)
   ```bash
   ./deploy-worker.sh
   ```
   Or follow the [Quick Start Guide](QUICKSTART.md)

3. **Make changes and test locally**
   - Open HTML files in your browser
   - Edit and refresh to see changes

4. **Deploy**
   - GitHub Pages deploys automatically on push to main
   - See [DEPLOYMENT.md](DEPLOYMENT.md) for details

### For Contributors

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Fork the repository
3. Create a feature branch
4. Submit a pull request

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

Ways to contribute:
- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit code changes
- 🎨 Enhance design

---

## 📚 Documentation

Comprehensive documentation is available:

- **[DOCS_INDEX.md](DOCS_INDEX.md)** - Central hub for all documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design
- **[CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md)** - Detailed Cloudflare setup
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md)** - Overview of the solution
- **[MUSIC_HISTORY_GENERATION_GUIDE.md](MUSIC_HISTORY_GENERATION_GUIDE.md)** - Blog post generation

---

## 🔐 Security

- Secrets are stored encrypted in Cloudflare Workers
- No API keys are exposed in the frontend
- CORS is properly configured
- See [DEMONSTRATION.md](DEMONSTRATION.md) for security details

---

## 📝 License

See [LICENSE.txt](LICENSE.txt) for details.

---

## 🌐 Links

- **Website**: [djdistraction.github.io](https://djdistraction.github.io)
- **Repository**: [github.com/djdistraction/djdistraction.github.io](https://github.com/djdistraction/djdistraction.github.io)
- **Issues**: [Report a bug or request a feature](https://github.com/djdistraction/djdistraction.github.io/issues)

---

**Built with ❤️ by the uniQue-ue team**

