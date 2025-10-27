# Ghost-Writer.html Configuration Guide

After deploying your Cloudflare Worker, you need to update one line in `ghost-writer.html` to use the secure proxy.

## What to Change

### Location
- **File**: `ghost-writer.html`
- **Line**: 269
- **Section**: JavaScript configuration

### Current Code (Netlify - doesn't work)

```javascript
const AI_FUNCTION_URL = '/.netlify/functions/getAiResponse';
```

### New Code (Cloudflare Worker - works!)

```javascript
const AI_FUNCTION_URL = 'https://unique-ue-ai-proxy.YOUR-SUBDOMAIN.workers.dev';
```

**Replace `YOUR-SUBDOMAIN` with your actual Cloudflare Workers subdomain!**

## How to Find Your Worker URL

After running `wrangler deploy`, you'll see output like:

```
✨ Success! Uploaded 1 file (0.12 sec)
✨ Uploaded unique-ue-ai-proxy (0.28 sec)
✨ Published unique-ue-ai-proxy (0.24 sec)
   https://unique-ue-ai-proxy.abc123.workers.dev
   
🌍  Your worker is now live at:
   https://unique-ue-ai-proxy.abc123.workers.dev
```

Copy the URL shown in your terminal!

## Step-by-Step Update

1. **Open ghost-writer.html in your editor**

2. **Find line 269** (in the `<script>` section)
   - Use `Ctrl+G` (or `Cmd+G` on Mac) to "Go to line"
   - Or search for: `const AI_FUNCTION_URL`

3. **Replace the URL**
   ```javascript
   // Before
   const AI_FUNCTION_URL = '/.netlify/functions/getAiResponse';
   
   // After (with your actual worker URL)
   const AI_FUNCTION_URL = 'https://unique-ue-ai-proxy.abc123.workers.dev';
   ```

4. **Save the file**

5. **Test it**
   - Open `test-ai-proxy.html` in your browser
   - Enter your worker URL
   - Run the health check and chat test
   - If all tests pass, your configuration is correct!

6. **Commit and push**
   ```bash
   git add ghost-writer.html
   git commit -m "Update AI endpoint to use Cloudflare Worker"
   git push
   ```

## Full Example

Here's the relevant section of `ghost-writer.html` with the change:

```javascript
// --- State Management ---
let chatHistory = [];

// 👇 THIS IS THE LINE TO CHANGE (Line 269)
const AI_FUNCTION_URL = 'https://unique-ue-ai-proxy.abc123.workers.dev';

const CHAT_SYSTEM_PROMPT = "You are Draven, an AI Muse and creative partner...";
```

## Verification Checklist

Before going live, verify:

- [ ] Worker deployed successfully (`wrangler deploy`)
- [ ] Worker URL copied correctly (no typos!)
- [ ] URL starts with `https://`
- [ ] URL ends with `.workers.dev`
- [ ] Line 269 in `ghost-writer.html` updated
- [ ] File saved
- [ ] `test-ai-proxy.html` tests pass
- [ ] No secrets in git (`git diff` should show only the URL change)
- [ ] Changes committed and pushed

## Testing Your Configuration

### Method 1: Use test-ai-proxy.html

1. Open `test-ai-proxy.html` in your browser
2. Paste your worker URL
3. Click "Run Health Check"
4. Click "Send Message"
5. If both work, you're good!

### Method 2: Test in Ghost-Writer

1. Open `ghost-writer.html` in your browser
2. Type a message in the chat
3. Click send
4. Wait for Draven's response
5. If you get a response, it's working!

### Method 3: Use Browser DevTools

1. Open `ghost-writer.html`
2. Press F12 to open DevTools
3. Go to Network tab
4. Send a message
5. Look for request to your worker URL
6. Check the response (should be 200 OK)

**Important**: In DevTools, you should **NOT** see your `GITHUB_PAT` anywhere!
If you see it, something is wrong and your secret is exposed.

## Troubleshooting

### Error: "Failed to fetch"

**Problem**: Worker URL is wrong or worker not deployed

**Solution**:
1. Check the URL is correct
2. Verify worker is deployed: `wrangler deployments list`
3. Test worker directly: `curl YOUR-WORKER-URL`

### Error: "GITHUB_PAT not configured"

**Problem**: Secret not set in Cloudflare

**Solution**:
```bash
wrangler secret put GITHUB_PAT
```

### Error: "CORS error"

**Problem**: Worker CORS configuration

**Solution**: The worker has `Access-Control-Allow-Origin: *` which should work.
If you're still getting CORS errors, check the browser console for details.

### No response from AI

**Problem**: Worker is running but AI API failing

**Solution**:
1. Check worker logs: `wrangler tail`
2. Verify your GITHUB_PAT is valid
3. Check GitHub Models API status
4. Try the HuggingFace worker instead

## Environment-Specific URLs

### Development (Local Testing)

If you're testing locally with `wrangler dev`:

```javascript
const AI_FUNCTION_URL = 'http://localhost:8787';
```

### Production (Live Site)

After deployment:

```javascript
const AI_FUNCTION_URL = 'https://unique-ue-ai-proxy.abc123.workers.dev';
```

### Custom Domain (Optional)

If you set up a custom domain in Cloudflare:

```javascript
const AI_FUNCTION_URL = 'https://api.unique-ue.com';
```

## Security Best Practices

### ✅ DO:
- Use the worker URL (proxied, secure)
- Test with `test-ai-proxy.html` before going live
- Commit only the URL change, not secrets
- Monitor worker logs for errors

### ❌ DON'T:
- Hardcode your `GITHUB_PAT` in ghost-writer.html
- Commit `.env` files with secrets
- Use direct API calls to GitHub/OpenAI
- Share your worker URL publicly (it's not secret, but limit sharing)

## Additional Configuration (Optional)

If you want to customize the AI model or system prompt, you can also change:

### Line 270: System Prompt
```javascript
const CHAT_SYSTEM_PROMPT = "You are Draven, an AI Muse and creative partner. Your goal is to help users explore their ideas for writing projects...";
```

### Line 343: Model Selection
```javascript
const callAiFunction = async (history, prompt, model = 'openai/gpt-4o-mini') => {
```

Available models:
- `openai/gpt-4o-mini` (default, fast and capable)
- `openai/gpt-4o` (more capable, slower)
- `meta-llama/Llama-3-70b-chat-hf`
- `microsoft/Phi-3-medium-4k-instruct`

## Need Help?

- 📖 Read [QUICKSTART.md](QUICKSTART.md) for basic setup
- 📖 Read [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for detailed guide
- 📖 Read [DEMONSTRATION.md](DEMONSTRATION.md) for security comparison
- 🧪 Use [test-ai-proxy.html](test-ai-proxy.html) to test
- 💬 Open an issue on GitHub
