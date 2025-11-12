/*
  Main Application JavaScript
  This file handles all site-wide logic:
  1. Component Loading (Header/Footer)
  2. Particle Background Effect
  3. "Warp Drive" Page Transitions
  4. Firebase Auth State (Sign In / Profile Button)
  5. Mobile Menu Toggle
  6. AI Host Toggle (if AI Host window exists)
  7. Global Helper Functions
*/

// Import Firebase services (we need auth for the header)
// Use relative path for local file testing
// MODIFIED: Added WORKER_URL for Task 3
import { auth, WORKER_URL } from './firebase-config.js'; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Main App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // This is the entry point for all our JS.
  // We wait for the page's HTML to be ready before running.
  
  loadComponents();
  initParticleEffect();
  initWarpDrive();
  
  // Set copyright year in footer (after it's loaded)
  // We use a small delay to ensure _footer.html is in place.
  setTimeout(setCopyrightYear, 300);
});


// --- 1. Component Loading ---
async function loadComponents() {
  // Find the placeholder divs in our HTML pages
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  // Load _header.html
  if (headerPlaceholder) {
    try {
      // Use relative path
      const response = await fetch('_header.html'); 
      if (!response.ok) throw new Error('Failed to load header');
      const headerHTML = await response.text();
      headerPlaceholder.innerHTML = headerHTML;
      // After loading, find the new elements to make them interactive
      initMobileMenu(); 
      initAIHost(); 
      initAuthStateListener();
      setActiveNavLink(); // Highlight the current page
    } catch (error) {
      console.error('Error loading header:', error);
      headerPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error loading header.</p>';
    }
  }

  // Load _footer.html
  if (footerPlaceholder) {
    try {
      // Use relative path
      const response = await fetch('_footer.html'); 
      if (!response.ok) throw new Error('Failed to load footer');
      const footerHTML = await response.text();
      footerPlaceholder.innerHTML = footerHTML;
      // Set copyright year after loading
      setCopyrightYear();
    } catch (error) {
      console.error('Error loading footer:', error);
      footerPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error loading footer.</p>';
    }
  }

  // --- NEW: Load Global AI Host (Task 2) ---
  // This placeholder is created dynamically, not in the HTML
  const aiHostPlaceholder = document.createElement('div');
  aiHostPlaceholder.id = 'ai-host-global-placeholder';
  document.body.appendChild(aiHostPlaceholder);

  try {
    // Use relative path
    const response = await fetch('_ai-host.html'); 
    if (!response.ok) throw new Error('Failed to load AI host');
    const aiHostHTML = await response.text();
    aiHostPlaceholder.innerHTML = aiHostHTML;
    // Now that the HTML is loaded, initialize its logic
    initAIHostLogic(); 
  } catch (error) {
    console.error('Error loading AI Host:', error);
    // You could add a fallback here, but it's non-critical
  }
}

// --- 2. Particle Background Effect ---
function initParticleEffect() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) {
    console.warn('Particle canvas not found. Skipping effect.');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  let particles = [];

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const createParticles = () => {
    particles = [];
    // More particles, based on screen area
    const particleCount = Math.floor((canvas.width * canvas.height) / 8000); 
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        // More varied speed
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1, // Sizes from 1 to 3
        // Brighter, more varied opacity
        opacity: Math.random() * 0.7 + 0.3, // Opacity from 0.3 to 1.0
      });
    }
  };

  const animateParticles = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap particles around edges
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Draw particle
      ctx.beginPath();
      // More vibrant color
      ctx.fillStyle = `rgba(0, 246, 255, ${p.opacity})`; 
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animateParticles);
  };

  // Set up
  window.addEventListener('resize', () => {
    resizeCanvas();
    createParticles();
  });
  resizeCanvas();
  createParticles();
  animateParticles();
}


// --- 3. "Warp Drive" Page Transitions ---
function initWarpDrive() {
  const prefetchCache = new Map();
  let isNavigating = false;

  // 1. Pre-fetch on hover
  const prefetchLink = (e) => {
    if (e.target.tagName === 'A') {
      const url = new URL(e.target.href, window.location.origin);
      // Check if it's an internal link and not already cached
      if (url.origin === window.location.origin && !prefetchCache.has(url.href)) {
        prefetchCache.set(url.href, fetch(url.href));
      }
    }
  };

  // 2. Handle navigation click
  const navigate = (e) => {
    if (e.target.tagName === 'A') {
      const url = new URL(e.target.href, window.location.origin);
      // Only for internal links, not hashes, and not already navigating
      if (url.origin === window.location.origin && url.href !== window.location.href && !url.hash && !isNavigating) {
        e.preventDefault(); // Stop the browser's default navigation
        isNavigating = true;
        
        // Add "navigating" class to fade out
        document.body.classList.add('is-navigating');
        
        // Wait for the fade-out, then change page
        setTimeout(() => {
          window.location.href = url.href;
        }, 300); // 300ms matches the CSS transition
      }
    }
  };

  // Add listeners to the document
  document.addEventListener('mouseover', prefetchLink, { passive: true });
  document.addEventListener('click', navigate);

  // On page load, fade in
  window.addEventListener('load', () => {
    document.body.classList.remove('is-navigating');
  });
}


// --- 4. Firebase Auth State Listener ---
function initAuthStateListener() {
  const authContainer = document.getElementById('auth-nav-container');
  const mobileAuthContainer = document.getElementById('mobile-auth-nav-container');
  
  // This function runs every time the auth state changes (login/logout)
  onAuthStateChanged(auth, (user) => {
    if (!authContainer || !mobileAuthContainer) {
      // Header might not be loaded yet.
      return;
    }

    if (user) {
      // --- User is SIGNED IN ---
      const displayName = user.email ? user.email.split('@')[0] : 'User';
      const profileButtonHTML = `
        <a href="/profile.html" class="nav-link flex items-center gap-2" data-navlink="profile">
          <img src="${user.photoURL || 'https://placehold.co/32x32/10142C/00F6FF?text=' + displayName.charAt(0).toUpperCase()}" alt="Profile" class="h-6 w-6 rounded-full border border-brand-accent/50">
          <span>Profile</span>
        </a>
      `;
      authContainer.innerHTML = profileButtonHTML;
      mobileAuthContainer.innerHTML = profileButtonHTML;
      
    } else {
      // --- User is SIGNED OUT ---
      const signInButtonHTML = `
        <a href="/profile.html" class="nav-link" data-navlink="profile">
          Sign In
        </a>
      `;
      authContainer.innerHTML = signInButtonHTML;
      mobileAuthContainer.innerHTML = signInButtonHTML;
    }
    
    // Re-highlight the active link after updating header HTML
    setActiveNavLink();
  });
}


// --- 5. Mobile Menu Toggle ---
function initMobileMenu() {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('hidden');
    });
  }
}

// --- 6. AI Host Toggle ---
// MODIFIED: This now just finds the button. The window is loaded globally.
function initAIHost() {
  const aiHostToggle = document.getElementById('ai-host-toggle');
  
  if (aiHostToggle) { // We no longer need to check for aiHostWindow
    aiHostToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      // This is defined in initAIHostLogic() which is now at window scope
      if(typeof toggleHostWindow === 'function') {
        toggleHostWindow();
      }
    });
  }
}

// --- 7. Global Helper Functions ---

// Sets the copyright year in the footer
function setCopyrightYear() {
  const yearSpan = document.getElementById('copyright-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

// Highlights the active navigation link
function setActiveNavLink() {
  // Use a relative path to get the current page, default to index.html
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const linkPage = new URL(link.href, window.location.origin).pathname.split('/').pop() || 'index.html';
    
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// --- NEW: Global AI Host Logic (Moved from index.html - Task 2) ---

let aiHostHistory = [];
let aiHostVisible = false;

// This function is now global and will be called by loadComponents
function initAIHostLogic() {
  // --- DOM Elements ---
  const aiHostWindow = document.getElementById('ai-host-window');
  const aiHostClose = document.getElementById('ai-host-close');
  const aiHostChatContainer = document.getElementById('ai-host-chat-container');
  const aiHostInput = document.getElementById('ai-host-input');
  const aiHostSend = document.getElementById('ai-host-send');
  
  // The toggle button is in the header, its listener is set in initAIHost()
  
  // --- Event Listeners ---
  if (aiHostClose) aiHostClose.addEventListener('click', toggleHostWindow);
  if (aiHostSend) aiHostSend.addEventListener('click', handleSendChat);
  if (aiHostInput) aiHostInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendChat();
      }
  });

  // Send a welcome message when the page loads
  setTimeout(() => {
      const welcomeMsg = "Welcome to uniQue-ue! I'm the site's AI Host. How can I help you today? You can ask me about our resources, our company, or how to get in touch.";
      addMessageToHost('model', welcomeMsg);
      aiHostHistory.push({ role: 'model', parts: [{ text: welcomeMsg }] });
  }, 1000); // Welcome after 1 second
}

// Make toggleHostWindow global so initAIHost() can find it
// Note: This is now attached to the window object to be globally accessible
window.toggleHostWindow = function() {
  const aiHostWindow = document.getElementById('ai-host-window');
  if (!aiHostWindow) return; // Guard clause

  aiHostVisible = !aiHostVisible;
  if (aiHostVisible) {
      aiHostWindow.classList.remove('hidden');
      setTimeout(() => {
        aiHostWindow.classList.remove('translate-y-4', 'opacity-0');
      }, 10); // Start transition
  } else {
      aiHostWindow.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => {
        aiHostWindow.classList.add('hidden');
      }, 300); // Hide after transition
  }
}

async function handleSendChat() {
  const aiHostInput = document.getElementById('ai-host-input');
  const aiHostSend = document.getElementById('ai-host-send');
  if (!aiHostInput || !aiHostSend) return;

  const userMessage = aiHostInput.value.trim();
  if (!userMessage) return;

  addMessageToHost('user', userMessage);
  aiHostInput.value = '';
  aiHostInput.disabled = true;
  aiHostSend.disabled = true;

  // Add thinking indicator
  addMessageToHost('model', '...', true);

  try {
      const aiMessage = await callAiHost(userMessage);
      
      // Remove thinking indicator
      const aiHostChatContainer = document.getElementById('ai-host-chat-container');
      const thinkingIndicator = aiHostChatContainer.querySelector('.is-thinking');
      if (thinkingIndicator) thinkingIndicator.remove();

      addMessageToHost('model', aiMessage);

  } catch (error) {
      console.error("AI Host Error:", error);
      addMessageToHost('model', "Sorry, I seem to be having trouble connecting. Please try again in a moment.");
  } finally {
      aiHostInput.disabled = false;
      aiHostSend.disabled = false;
      aiHostInput.focus();
  }
}

async function callAiHost(userMessage) {
  aiHostHistory.push({ role: 'user', parts: [{ text: userMessage }] });

  const systemPrompt = "You are the uniQue-ue AI Host. Your job is to welcome visitors and guide them. Be friendly, helpful, and slightly futuristic. Keep your answers concise (1-2 sentences) unless asked for more detail. Help users understand the site (Home, About, Resources, Contact) and its tools (Ghost-Writer, Graphics Studio).";
  
  // Uses the global WORKER_URL constant
  const response = await fetch(`${WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          chatHistory: aiHostHistory,
          systemPrompt: systemPrompt,
          model: 'openai/gpt-4o-mini'
      })
  });

  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || `Server error: ${response.status}`);
  }

  const result = await response.json();
  const aiMessage = result.choices[0].message.content;

  aiHostHistory.push({ role: 'model', parts: [{ text: aiMessage }] });
  return aiMessage;
}

function addMessageToHost(sender, message, isThinking = false) {
  const aiHostChatContainer = document.getElementById('ai-host-chat-container');
  if (!aiHostChatContainer) return;

  const messageDiv = document.createElement('div');
  const senderName = sender === 'user' ? 'You' : 'AI Host';
  const senderColor = sender === 'user' ? 'text-brand-text-muted' : 'text-brand-accent';
  
  let messageContent = '';
  if (isThinking) {
      messageDiv.classList.add('is-thinking');
      messageContent = '<div class="animate-pulse">...</div>';
  } else {
      messageContent = message.replace(/\\n/g, '<br>'); // Format newlines
  }
  
  messageDiv.className = `p-3 rounded-lg max-w-[85%] text-sm chat-bubble-3d ${sender === 'user' ? 'bg-brand-primary self-end' : 'bg-brand-secondary self-start'}`;
  messageDiv.innerHTML = `<p class="font-bold ${senderColor} mb-1">${senderName}</p><p class="text-white">${messageContent}</p>`;
  
  aiHostChatContainer.appendChild(messageDiv);
  aiHostChatContainer.scrollTop = aiHostChatContainer.scrollHeight;
}
