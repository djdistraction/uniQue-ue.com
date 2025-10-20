#!/bin/bash

# Cloudflare Worker Deployment Script
# This script automates the deployment of the AI proxy worker

set -e

echo "🚀 Cloudflare Worker Deployment Script"
echo "========================================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed."
    echo ""
    echo "Installing wrangler..."
    npm install -g wrangler
    echo "✅ Wrangler installed successfully!"
    echo ""
fi

# Check if user is logged in
echo "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "❌ You are not logged in to Cloudflare."
    echo ""
    echo "Please login to Cloudflare..."
    wrangler login
    echo ""
fi

echo "✅ Cloudflare authentication successful!"
echo ""

# Ask which worker to deploy
echo "Which AI provider do you want to use?"
echo ""
echo "1) GitHub Models (requires GitHub PAT)"
echo "2) HuggingFace (100% free, no GitHub account needed)"
echo ""
read -p "Enter your choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "You chose: GitHub Models"
    echo ""
    echo "You'll need a GitHub Personal Access Token with access to GitHub Models."
    echo "Create one at: https://github.com/settings/tokens"
    echo ""
    read -p "Press Enter when you have your token ready..."
    echo ""
    
    # Check if secret exists
    if wrangler secret list 2>&1 | grep -q "GITHUB_PAT"; then
        echo "⚠️  GITHUB_PAT secret already exists."
        read -p "Do you want to update it? (y/N): " update
        if [ "$update" = "y" ] || [ "$update" = "Y" ]; then
            wrangler secret put GITHUB_PAT
        fi
    else
        echo "Setting GITHUB_PAT secret..."
        wrangler secret put GITHUB_PAT
    fi
    
    WORKER_FILE="worker.js"
    
elif [ "$choice" = "2" ]; then
    echo ""
    echo "You chose: HuggingFace"
    echo ""
    echo "You'll need a HuggingFace token."
    echo "Create one at: https://huggingface.co/settings/tokens"
    echo ""
    read -p "Press Enter when you have your token ready..."
    echo ""
    
    # Check if secret exists
    if wrangler secret list 2>&1 | grep -q "HUGGINGFACE_TOKEN"; then
        echo "⚠️  HUGGINGFACE_TOKEN secret already exists."
        read -p "Do you want to update it? (y/N): " update
        if [ "$update" = "y" ] || [ "$update" = "Y" ]; then
            wrangler secret put HUGGINGFACE_TOKEN
        fi
    else
        echo "Setting HUGGINGFACE_TOKEN secret..."
        wrangler secret put HUGGINGFACE_TOKEN
    fi
    
    WORKER_FILE="worker-huggingface.js"
    
    # Update wrangler.toml to use the HuggingFace worker
    sed -i.bak 's/main = "worker.js"/main = "worker-huggingface.js"/' wrangler.toml
    echo "✅ Updated wrangler.toml to use HuggingFace worker"
else
    echo "❌ Invalid choice. Exiting."
    exit 1
fi

echo ""
echo "🚀 Deploying worker..."
echo ""

# Deploy the worker
wrangler deploy

echo ""
echo "✅ Deployment successful!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Copy your worker URL from the output above"
echo "   (It looks like: https://unique-ue-ai-proxy.YOUR-SUBDOMAIN.workers.dev)"
echo ""
echo "2. Update publisher.html line 269:"
echo "   Change: const AI_FUNCTION_URL = '/.netlify/functions/getAiResponse';"
echo "   To:     const AI_FUNCTION_URL = 'YOUR-WORKER-URL';"
echo ""
echo "3. Test your deployment:"
echo "   Open test-ai-proxy.html in your browser and enter your worker URL"
echo ""
echo "4. Monitor your worker:"
echo "   wrangler tail"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 All done! Your AI proxy is live and secure!"
echo ""
