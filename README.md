# **uniQue-ue Website**

The official hub for uniQue-ue projects and directives. This repository hosts the static GitHub Pages site for [www.unique-ue.com](https://www.unique-ue.com).

## 🚀 **Project Status: Under Reconstruction**

This project is currently undergoing a major refactor to a new, more powerful architecture.

## **Architecture**

This project uses a hybrid architecture to provide a secure, real-time AI experience:

1.  **Frontend (GitHub Pages):** The static website (index.html, etc.) is hosted directly from this repository.
2.  **Backend (Cloudflare Workers):** A single worker (`api-worker.js`) securely proxies all API requests for AI, image generation, and the contact form.
3.  **Database & Auth (Firebase):** User accounts, profiles, and data are handled by Firebase Authentication and Firestore.

### **Backend Files**
* `api-worker.js`: The all-in-one Cloudflare Worker.
* `wrangler.toml`: Configuration for the worker.
* `firebase-config.js`: Configuration for connecting to the Firebase project.

## 🏁 Getting Started

### **Prerequisites**
* A Cloudflare account
* A Firebase project
* API keys for: GitHub, Hugging Face, and SendGrid
* `npm` (for installing Wrangler)

### **Deployment**
1.  **Clone the repo:**
    ```bash
    git clone [https://github.com/djdistraction/djdistraction.github.io.git](https://github.com/djdistraction/djdistraction.github.io.git)
    cd djdistraction.github.io
    ```
2.  **Install & Login to Wrangler:**
    ```bash
    npm install -g wrangler
    wrangler login
    ```
3.  **Deploy the Worker:**
    ```bash
    wrangler deploy
    ```
4.  **Set Your Secrets:**
    ```bash
    wrangler secret put GITHUB_PAT
    wrangler secret put HUGGINGFACE_TOKEN
    wrangler secret put SENDGRID_API_KEY
    wrangler secret put TO_EMAIL
    ```
5.  **Commit & Push:**
    ```bash
    git add .
    git commit -m "Refactor to new API worker and Firebase architecture"
    git push
    ```