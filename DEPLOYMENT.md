# Deployment Guide

This guide covers deploying the uniQue-ue platform, including the GitHub Pages site and Cloudflare Workers.

## Overview

The uniQue-ue platform consists of two main components:

1. **Frontend (GitHub Pages)**: Static HTML/CSS/JS hosted automatically from this repository
2. **Backend (Cloudflare Workers)**: Serverless workers for AI proxy functionality

## 🌐 GitHub Pages Deployment

### Automatic Deployment

GitHub Pages automatically deploys from the repository:

- **Source**: Main branch, root directory
- **URL**: https://djdistraction.github.io (or custom domain)
- **Trigger**: Automatic on push to main branch
- **Build Time**: 1-2 minutes

### Manual Steps

1. **Ensure Content is Ready**
   ```bash
   # Test locally by opening HTML files
   open index.html  # or your browser
   ```

2. **Commit and Push**
   ```bash
   git add .
   git commit -m "Update site content"
   git push origin main
   ```

3. **Verify Deployment**
   - Go to repository Settings → Pages
   - Check deployment status
   - Visit your site URL
   - Test all pages and links

### Custom Domain (Optional)

1. Add `CNAME` file with your domain:
   ```bash
   echo "www.unique-ue.com" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

2. Configure DNS with your provider:
   ```
   Type: CNAME
   Name: www
   Value: djdistraction.github.io
   ```

3. Enable HTTPS in repository Settings → Pages

## ⚡ Cloudflare Workers Deployment

### Prerequisites

- Cloudflare account (free tier is sufficient)
- Wrangler CLI installed
- API token configured

### Option 1: Automated Deployment (Recommended)

Use the interactive deployment script:

```bash
./deploy-worker.sh
```

The script will:
1. Check for wrangler installation
2. Verify you're logged in
3. Ask which AI provider you want (GitHub Models or HuggingFace)
4. Guide you through setting secrets
5. Deploy the worker
6. Provide the worker URL

### Option 2: Manual Deployment

#### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

#### Step 2: Login to Cloudflare

```bash
wrangler login
```

This opens your browser for authentication.

#### Step 3: Configure Secrets

For GitHub Models:
```bash
wrangler secret put GITHUB_PAT
```

For HuggingFace:
```bash
# Edit wrangler.toml first
# Change: main = "worker.js" to main = "worker-huggingface.js"

wrangler secret put HUGGINGFACE_TOKEN
```

#### Step 4: Deploy

```bash
wrangler deploy
```

#### Step 5: Get Worker URL

Copy the URL from the deployment output:
```
https://unique-ue-ai-proxy.YOUR-SUBDOMAIN.workers.dev
```

### Option 3: CI/CD Deployment

For automated deployments on push:

1. **Get Cloudflare API Token**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with "Edit Cloudflare Workers" permissions
   - Copy the token

2. **Add GitHub Secret**
   - Go to your repository Settings → Secrets
   - Add `CLOUDFLARE_API_TOKEN` with your token
   - Add `GITHUB_PAT` for the AI proxy (if using GitHub Models)

3. **Create GitHub Actions Workflow**

Create `.github/workflows/deploy-worker.yml`:
```yaml
name: Deploy Worker
on:
  push:
    branches: [main]
    paths:
      - 'worker.js'
      - 'worker-huggingface.js'
      - 'wrangler.toml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Wrangler
        run: npm install -g wrangler
      
      - name: Deploy to Cloudflare Workers
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          wrangler secret put GITHUB_PAT <<< "${{ secrets.GITHUB_PAT }}"
          wrangler deploy
```

## 🔧 Configuration After Deployment

### Update Ghost-Writer HTML

After deploying the worker, update `ghost-writer.html`:

1. Open `ghost-writer.html`
2. Find line ~269:
   ```javascript
   const AI_FUNCTION_URL = '/.netlify/functions/getAiResponse';
   ```
3. Replace with your worker URL:
   ```javascript
   const AI_FUNCTION_URL = 'https://unique-ue-ai-proxy.YOUR-SUBDOMAIN.workers.dev';
   ```
4. Commit and push:
   ```bash
   git add ghost-writer.html
   git commit -m "Update AI proxy URL"
   git push
   ```

### Verify Deployment

Use the test page to verify everything works:

1. Open `test-ai-proxy.html` in your browser
2. Enter your worker URL
3. Click "Run Health Check"
4. Verify all tests pass

## 🔍 Monitoring

### Cloudflare Dashboard

Monitor your worker:
- Go to Cloudflare Dashboard → Workers & Pages
- Select your worker
- View Analytics tab for:
  - Request count
  - Success rate
  - Errors
  - CPU time

### Real-Time Logs

Stream logs from your worker:
```bash
wrangler tail
```

This shows:
- Incoming requests
- Console logs
- Errors
- Response times

### Usage Tracking

Check your free tier limits:
```bash
wrangler whoami
```

View current usage in Cloudflare Dashboard.

## 🚨 Troubleshooting

### GitHub Pages Not Updating

1. Check GitHub Actions tab for build status
2. Verify branch is set to `main` in Settings → Pages
3. Clear browser cache
4. Wait 2-5 minutes for propagation

### Worker Deployment Fails

1. **Not logged in**:
   ```bash
   wrangler login
   ```

2. **Secret not set**:
   ```bash
   wrangler secret list  # Check what's set
   wrangler secret put GITHUB_PAT  # Set missing secret
   ```

3. **Syntax error in worker**:
   ```bash
   # Test locally first
   wrangler dev
   ```

### Worker Returns Errors

1. **Check logs**:
   ```bash
   wrangler tail
   ```

2. **Verify secret**:
   ```bash
   wrangler secret list
   # Should show: GITHUB_PAT or HUGGINGFACE_TOKEN
   ```

3. **Test the AI API directly** to ensure tokens are valid

### Ghost-Writer Not Connecting

1. Verify worker URL in `ghost-writer.html` is correct
2. Check browser console for CORS errors
3. Verify worker is deployed: visit URL directly
4. Use `test-ai-proxy.html` to debug

## 🔄 Rolling Back

### GitHub Pages

```bash
git revert HEAD  # Revert last commit
git push origin main
```

### Cloudflare Worker

```bash
# Re-deploy previous version
git checkout previous-commit-hash worker.js
wrangler deploy
git checkout main  # Return to current version
```

Or use Cloudflare Dashboard:
- Workers & Pages → Your Worker → Deployments
- Select previous version
- Click "Rollback to this deployment"

## 📊 Performance Optimization

### GitHub Pages

- Minimize image sizes
- Use CDN for libraries (like Tailwind)
- Enable browser caching
- Minimize HTTP requests

### Cloudflare Workers

- Keep worker code small (< 1MB)
- Minimize external requests
- Use edge caching when possible
- Monitor CPU time usage

## 🔐 Security Best Practices

1. **Never commit secrets** to git
2. Use Cloudflare's secret storage for API keys
3. Validate all input in workers
4. Keep dependencies updated
5. Use HTTPS everywhere
6. Implement rate limiting (if needed)

## 📋 Deployment Checklist

Before going live:

- [ ] All tests pass locally
- [ ] Worker deployed successfully
- [ ] Secrets configured correctly
- [ ] Ghost-Writer.html updated with worker URL
- [ ] Test page verifies functionality
- [ ] All navigation links work
- [ ] Mobile responsiveness verified
- [ ] SEO meta tags in place
- [ ] Accessibility tested
- [ ] Browser compatibility checked
- [ ] Error handling tested
- [ ] Monitoring set up
- [ ] Documentation updated

## 🆘 Getting Help

If you encounter issues:

1. Check [QUICKSTART.md](QUICKSTART.md) for basic setup
2. Review [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for detailed instructions
3. Use [test-ai-proxy.html](test-ai-proxy.html) to diagnose issues
4. Run [validate-solution.sh](validate-solution.sh) to check configuration
5. Check Cloudflare logs with `wrangler tail`
6. Open an issue on GitHub with details

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- Project Documentation: [DOCS_INDEX.md](DOCS_INDEX.md)

---

**Need help?** Open an issue or contact us through the [website](index.html#contact).
