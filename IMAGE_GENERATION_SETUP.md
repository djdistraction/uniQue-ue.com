# Image Generation Setup Guide

This guide explains how to set up the image generation functionality for the Graphics Studio page.

## Overview

The Graphics Studio uses HuggingFace's free Inference API with Stable Diffusion models to generate images based on text prompts. The image generation is handled by a Cloudflare Worker that securely proxies requests to HuggingFace.

## Prerequisites

1. **HuggingFace Account** (Free)
   - Create an account at https://huggingface.co
   - Generate an API token at https://huggingface.co/settings/tokens
   - Select "Read" permissions (sufficient for Inference API)

2. **Cloudflare Account** (Free)
   - Create an account at https://dash.cloudflare.com
   - No credit card required for free tier

## Setup Instructions

### Option 1: Deploy New Worker with Image Generation Support

If you want a dedicated worker for image generation:

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Create wrangler.toml** (or update existing one)
   ```toml
   name = "unique-ue-image-gen"
   main = "worker-image-gen.js"
   compatibility_date = "2024-01-01"
   
   [env.production]
   name = "unique-ue-image-gen"
   ```

4. **Set Secrets**
   ```bash
   # Required for image generation
   wrangler secret put HUGGINGFACE_TOKEN
   
   # Optional - for text chat (if using GitHub Models)
   wrangler secret put GITHUB_PAT
   ```

5. **Deploy**
   ```bash
   wrangler deploy worker-image-gen.js
   ```

6. **Update Frontend**
   - Copy the worker URL from deployment output
   - Update `AI_FUNCTION_URL` in `graphics-studio.html` to point to your worker

### Option 2: Extend Existing Worker

If you already have a deployed worker for text chat:

1. **Add HuggingFace Token Secret**
   ```bash
   wrangler secret put HUGGINGFACE_TOKEN
   ```

2. **Update Worker Code**
   - Replace your existing `worker.js` with `worker-image-gen.js`
   - Or manually add the `handleImageGeneration` function to your existing worker

3. **Redeploy**
   ```bash
   wrangler deploy
   ```

## Architecture

### Worker Endpoints

The worker provides two endpoints:

1. **POST /** (or **/chat**) - Text chat completion
   - Uses GitHub Models API or HuggingFace for text generation
   - Returns JSON with chat response

2. **POST /generate-image** - Image generation
   - Uses HuggingFace Stable Diffusion
   - Returns binary image data (PNG)

### Image Generation Flow

```
User clicks "Generate" 
  → Frontend asks AI for image prompt
  → Frontend calls /generate-image with prompt
  → Worker forwards to HuggingFace API
  → HuggingFace generates image
  → Worker returns image binary
  → Frontend displays image
```

## Supported Models

The worker is configured to use:
- **Primary**: `runwayml/stable-diffusion-v1-5` (fast, reliable)
- **Alternative**: `stabilityai/stable-diffusion-2-1` (higher quality)
- **Newest**: `black-forest-labs/FLUX.1-schnell` (experimental)

To change models, edit the `model` variable in the `handleImageGeneration` function.

## Configuration Options

### Image Parameters

In `graphics-studio.html`, you can customize:

```javascript
{
  prompt: "your text prompt here",
  negative_prompt: "what to avoid in image",
  width: 512,        // Image width (512, 768, 1024)
  height: 512,       // Image height (512, 768, 1024)
}
```

### Model Parameters (in worker)

```javascript
{
  num_inference_steps: 30,  // More steps = better quality (20-50)
  guidance_scale: 7.5,       // How closely to follow prompt (7-15)
}
```

## Features

### Current Implementation

✅ **Real Image Generation** - Uses Stable Diffusion models  
✅ **AI-Powered Prompts** - Elena suggests detailed prompts based on documents  
✅ **Auto-Retry** - Handles model loading states automatically  
✅ **Download Images** - Save individual or all generated images  
✅ **Image Gallery** - View all generated images with prompts  
✅ **Full-Size Preview** - Click to view images at full resolution  

### User Experience

1. **Upload Document** - User uploads a text document
2. **Chat with Elena** - Discuss what images would enhance the document
3. **Generate** - Click the generate button
4. **Wait** - AI creates detailed prompt and generates image (10-30 seconds)
5. **Review** - Image appears in gallery with prompt
6. **Download** - Save images individually or all at once

## Cost & Limits

### HuggingFace Inference API (Free Tier)

- **Cost**: Completely Free
- **Rate Limits**: 
  - ~1000 requests/day per token
  - ~30 seconds per image generation
  - Concurrent requests may be queued

### Cloudflare Workers (Free Tier)

- **Requests**: 100,000/day
- **CPU Time**: 10ms per request (plenty for proxy)
- **Memory**: 128MB
- **Storage**: Not needed

## Troubleshooting

### Error: "Model is loading"
- **Cause**: Model needs to warm up (first request or after inactivity)
- **Solution**: Wait 20 seconds and try again (automatic retry implemented)

### Error: "API key not configured"
- **Cause**: `HUGGINGFACE_TOKEN` secret not set
- **Solution**: Run `wrangler secret put HUGGINGFACE_TOKEN`

### Error: "Failed to generate image"
- **Cause**: Could be rate limiting, network issue, or invalid prompt
- **Solution**: 
  1. Wait a minute and retry
  2. Check token validity at HuggingFace
  3. Try a simpler prompt

### Images are low quality
- **Solution**: 
  1. Increase `num_inference_steps` to 50 in worker
  2. Use better model like `stabilityai/stable-diffusion-2-1`
  3. Add more detail to prompts

### Slow generation
- **Expected**: First generation takes 30-60 seconds (model loading)
- **Subsequent**: 10-30 seconds per image
- **Improvement**: Use FLUX.1-schnell model (faster but lower quality)

## Security

### Best Practices

✅ **Secrets Management** - API tokens stored securely in Cloudflare  
✅ **CORS Protection** - Limited to allowed origins  
✅ **No Client Exposure** - API keys never sent to browser  
✅ **Rate Limiting** - Cloudflare provides DDoS protection  

### What NOT to Do

❌ Don't commit API tokens to git  
❌ Don't put tokens in frontend code  
❌ Don't share worker URLs publicly (use domain restrictions)  

## Testing

### Local Testing

1. **Test Worker Locally**
   ```bash
   wrangler dev worker-image-gen.js
   ```

2. **Update Frontend URL**
   ```javascript
   const AI_FUNCTION_URL = 'http://localhost:8787';
   ```

3. **Test Image Generation**
   - Upload a document
   - Chat with Elena
   - Click Generate
   - Verify image appears

### Production Testing

1. Deploy worker
2. Update `AI_FUNCTION_URL` in `graphics-studio.html`
3. Test full workflow
4. Verify downloads work

## Future Enhancements

Potential improvements:

- [ ] Multiple image styles (realistic, anime, artistic)
- [ ] Batch generation (multiple images from one prompt)
- [ ] Image editing (variations, upscaling)
- [ ] Custom model selection
- [ ] Image history/gallery persistence
- [ ] Social sharing of generated images
- [ ] Integration with blog post generation

## Support

For issues or questions:
- Review this documentation
- Check Cloudflare Workers logs: `wrangler tail`
- Review browser console for frontend errors
- Consult HuggingFace API docs: https://huggingface.co/docs/api-inference

## License

This implementation uses:
- Stable Diffusion v1.5: CreativeML Open RAIL-M License
- HuggingFace Inference API: Free tier available
- Code: Same license as parent repository
