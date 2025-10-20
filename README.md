djdistraction.github.io

The official hub for uniQue-ue projects and directives. This repository hosts the static GitHub Pages site for www.unique-ue.com.

Architecture

This project uses a hybrid architecture to provide a secure, real-time AI chat experience:

Frontend (GitHub Pages): The static website (index.html, publisher.html, etc.) is hosted directly from this repository using GitHub Pages.

Backend (Netlify Functions): A single, lightweight serverless function (netlify/functions/getAiResponse.js) is hosted on Netlify's free tier.

AI (GitHub Models): The AI chat is powered by models from the GitHub Models catalog (e.g., openai/gpt-4o-mini).

Why this architecture?

Security: The serverless function acts as a secure proxy. It holds the secret GITHUB_PAT (GitHub Personal Access Token) and makes API calls to GitHub Models. This prevents the secret token from being exposed in the public frontend JavaScript.

Cost: This entire stack is free by utilizing the GitHub Pages free tier and the Netlify free tier for serverless functions.

Performance: Serverless functions provide a fast, real-time API endpoint necessary for a chat application.

AI Chat Feature

The publisher.html page features an AI-powered creative assistant.

Function: netlify/functions/getAiResponse.js

Endpoint: /.netlify/functions/getAiResponse

Method: POST

Setup Instructions

1. Environment Variable

To run this function, a GitHub Personal Access Token (PAT) must be created with the repo scope.

This token must be stored as a secret environment variable in the Netlify dashboard:

Key: GITHUB_PAT

Value: ghp_... (Your token)

2. Install Dependencies

npm install


3. Local Development

You must use the Netlify CLI to test the function locally, as it provides the necessary serverless environment.

# Install Netlify CLI
npm install -g netlify-cli

# Run locally
netlify dev
