#!/bin/bash

# Validation script to ensure the solution is working correctly
# This script checks that all files are in place and properly configured

echo "🔍 Validating Cloudflare Workers Solution"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Check if essential files exist
echo "✓ Checking essential files..."

files=(
    "worker.js"
    "worker-huggingface.js"
    "wrangler.toml"
    "test-ai-proxy.html"
    "deploy-worker.sh"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file exists"
    else
        echo "  ❌ $file is missing"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check if documentation exists
echo "✓ Checking documentation..."

docs=(
    "README.md"
    "QUICKSTART.md"
    "CLOUDFLARE_SETUP.md"
    "SOLUTION_COMPARISON.md"
    "DEMONSTRATION.md"
    "ARCHITECTURE.md"
    "PUBLISHER_CONFIG.md"
    "SOLUTION_SUMMARY.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "  ✅ $doc exists"
    else
        echo "  ❌ $doc is missing"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check worker.js content
echo "✓ Checking worker.js implementation..."

if grep -q "env.GITHUB_PAT" worker.js; then
    echo "  ✅ worker.js checks for GITHUB_PAT"
else
    echo "  ❌ worker.js doesn't check for GITHUB_PAT"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "Access-Control-Allow-Origin" worker.js; then
    echo "  ✅ worker.js has CORS support"
else
    echo "  ❌ worker.js missing CORS headers"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "models.github.ai" worker.js; then
    echo "  ✅ worker.js calls GitHub Models API"
else
    echo "  ❌ worker.js doesn't call GitHub Models API"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check worker-huggingface.js content
echo "✓ Checking worker-huggingface.js implementation..."

if grep -q "env.HUGGINGFACE_TOKEN" worker-huggingface.js; then
    echo "  ✅ worker-huggingface.js checks for HUGGINGFACE_TOKEN"
else
    echo "  ❌ worker-huggingface.js doesn't check for HUGGINGFACE_TOKEN"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "api-inference.huggingface.co" worker-huggingface.js; then
    echo "  ✅ worker-huggingface.js calls HuggingFace API"
else
    echo "  ❌ worker-huggingface.js doesn't call HuggingFace API"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check wrangler.toml
echo "✓ Checking wrangler.toml configuration..."

if grep -q 'main = "worker.js"' wrangler.toml; then
    echo "  ✅ wrangler.toml points to worker.js"
else
    echo "  ⚠️  wrangler.toml might be configured for alternative worker"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q 'name = "unique-ue-ai-proxy"' wrangler.toml; then
    echo "  ✅ wrangler.toml has correct worker name"
else
    echo "  ❌ wrangler.toml has incorrect worker name"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check .gitignore
echo "✓ Checking .gitignore for security..."

if [ -f ".gitignore" ]; then
    if grep -q ".wrangler" .gitignore; then
        echo "  ✅ .gitignore excludes .wrangler/"
    else
        echo "  ⚠️  .gitignore doesn't exclude .wrangler/"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q ".env" .gitignore; then
        echo "  ✅ .gitignore excludes .env files"
    else
        echo "  ⚠️  .gitignore doesn't exclude .env files"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ❌ .gitignore doesn't exist"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check for secrets in code (should NOT be present)
echo "✓ Checking for exposed secrets..."

SECRET_PATTERNS=(
    "ghp_"
    "github_pat_"
    "sk-"
    "Bearer ghp"
    "Bearer sk"
)

SECRETS_FOUND=0

for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r "$pattern" worker.js worker-huggingface.js wrangler.toml 2>/dev/null | grep -v "example" | grep -v "YOUR-" | grep -v "..." > /dev/null; then
        echo "  ❌ Found potential secret pattern: $pattern"
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $SECRETS_FOUND -eq 0 ]; then
    echo "  ✅ No secrets found in code (good!)"
fi

echo ""

# Check deploy script
echo "✓ Checking deployment script..."

if [ -x "deploy-worker.sh" ]; then
    echo "  ✅ deploy-worker.sh is executable"
else
    echo "  ⚠️  deploy-worker.sh is not executable"
    echo "     Run: chmod +x deploy-worker.sh"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q "wrangler deploy" deploy-worker.sh; then
    echo "  ✅ deploy-worker.sh includes deployment command"
else
    echo "  ❌ deploy-worker.sh doesn't include deployment"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check test page
echo "✓ Checking test page..."

if grep -q "worker-url" test-ai-proxy.html; then
    echo "  ✅ test-ai-proxy.html has worker URL input"
else
    echo "  ❌ test-ai-proxy.html missing worker URL input"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "testHealthCheck" test-ai-proxy.html; then
    echo "  ✅ test-ai-proxy.html has health check test"
else
    echo "  ❌ test-ai-proxy.html missing health check"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "testChat" test-ai-proxy.html; then
    echo "  ✅ test-ai-proxy.html has chat test"
else
    echo "  ❌ test-ai-proxy.html missing chat test"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Final summary
echo "=========================================="
echo "Validation Summary"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed! Solution is ready."
    echo ""
    echo "Next steps:"
    echo "1. Run: ./deploy-worker.sh"
    echo "   OR"
    echo "   wrangler login && wrangler secret put GITHUB_PAT && wrangler deploy"
    echo ""
    echo "2. Copy the worker URL from output"
    echo ""
    echo "3. Update publisher.html line 269 with your worker URL"
    echo ""
    echo "4. Test with test-ai-proxy.html"
    echo ""
    echo "See QUICKSTART.md for detailed instructions."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Validation passed with $WARNINGS warning(s)"
    echo ""
    echo "The solution should work, but review the warnings above."
    exit 0
else
    echo "❌ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi
