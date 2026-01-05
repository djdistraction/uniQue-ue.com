// Import Firebase services
import { auth, WORKER_URL } from './firebase-config.js'; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initSubscriptionManager } from './subscription-manager.js';

// Global subscription manager
let globalSubscriptionManager = null;

// --- Main App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadComponents();
  initParticleEffect();
  initWarpDrive();
  
  // Set copyright year in footer (after it's loaded)
  setTimeout(setCopyrightYear, 300);
});


// --- 1. Component Loading ---
async function loadComponents() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  // Load _header.html
  if (headerPlaceholder) {
    try {
      const response = await fetch('_header.html'); 
      if (!response.ok) throw new Error('Failed to load header');
      const headerHTML = await response.text();
      headerPlaceholder.innerHTML = headerHTML;
      // After loading, make them interactive
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
      const response = await fetch('_footer.html'); 
      if (!response.ok) throw new Error('Failed to load footer');
      const footerHTML = await response.text();
      footerPlaceholder.innerHTML = footerHTML;
      setCopyrightYear();
    } catch (error) {
      console.error('Error loading footer:', error);
      footerPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error loading footer.</p>';
    }
  }

  // Load Global AI Host
  const aiHostPlaceholder = document.createElement('div');
  aiHostPlaceholder.id = 'ai-host-global-placeholder';
  document.body.appendChild(aiHostPlaceholder);

  try {
    const response = await fetch('_ai-host.html'); 
    if (!response.ok) throw new Error('Failed to load AI host');
    const aiHostHTML = await response.text();
    aiHostPlaceholder.innerHTML = aiHostHTML;
    initAIHostLogic(); 
  } catch (error) {
    console.error('Error loading AI Host:', error);
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
    const particleCount = Math.floor((canvas.width * canvas.height) / 8000); 
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.7 + 0.3,
      });
    }
  };

  const animateParticles = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.fillStyle = `rgba(0, 246, 255, ${p.opacity})`; 
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animateParticles);
  };

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

  const prefetchLink = (e) => {
    const link = e.target.closest('a');
    if (link) {
      const url = new URL(link.href, window.location.origin);
      if (url.origin === window.location.origin && !prefetchCache.has(url.href)) {
        prefetchCache.set(url.href, fetch(url.href));
      }
    }
  };

  const navigate = (e) => {
    const link = e.target.closest('a');
    
    if (link) {
      const url = new URL(link.href, window.location.origin);
      
      if (url.origin === window.location.origin && 
          url.href !== window.location.href && 
          !url.hash &&
          !link.href.startsWith('mailto:') && 
          !link.href.startsWith('tel:') && 
          !isNavigating) {
            
        e.preventDefault();
        isNavigating = true;
        
        document.body.classList.add('is-navigating');
        
        setTimeout(() => {
          window.location.href = url.href;
        }, 300);
      }
    }
  };

  document.addEventListener('mouseover', prefetchLink, { passive: true });
  document.addEventListener('click', navigate);

  window.addEventListener('load', () => {
    document.body.classList.remove('is-navigating');
  });
}


// --- 4. Firebase Auth State Listener ---
function initAuthStateListener() {
  const authContainer = document.getElementById('auth-nav-container');
  const mobileAuthContainer = document.getElementById('mobile-auth-nav-container');
  const tierBadgeContainer = document.getElementById('tier-badge-container');
  const mobileTierBadgeContainer = document.getElementById('mobile-tier-badge-container');
  
  onAuthStateChanged(auth, async (user) => {
    if (!authContainer || !mobileAuthContainer) {
      return;
    }

    if (user) {
      // Initialize subscription manager
      globalSubscriptionManager = await initSubscriptionManager();
      
      // User is SIGNED IN
      const displayName = user.email ? user.email.split('@')[0] : 'User';
      const profileButtonHTML = `
        <a href="/profile.html" class="sign-in-button flex items-center gap-2" data-navlink="profile">
          <img src="${user.photoURL || 'https://placehold.co/32x32/10142C/00F6FF?text=' + displayName.charAt(0).toUpperCase()}" alt="Profile" class="h-6 w-6 rounded-full border border-brand-accent/50">
          <span>Profile</span>
        </a>
      `;
      authContainer.innerHTML = profileButtonHTML;
      mobileAuthContainer.innerHTML = profileButtonHTML;
      
      // Show tier badge
      if (tierBadgeContainer && mobileTierBadgeContainer) {
        const badgeHTML = globalSubscriptionManager.getTierBadgeHTML();
        tierBadgeContainer.innerHTML = badgeHTML;
        mobileTierBadgeContainer.innerHTML = badgeHTML;
        tierBadgeContainer.classList.remove('hidden');
        mobileTierBadgeContainer.classList.remove('hidden');
      }
      
    } else {
      // User is SIGNED OUT
      const signInButtonHTML = `
        <a href="/profile.html" class="sign-in-button" data-navlink="profile">
          Sign In
        </a>
      `;
      authContainer.innerHTML = signInButtonHTML;
      mobileAuthContainer.innerHTML = signInButtonHTML;
      
      // Hide tier badge
      if (tierBadgeContainer && mobileTierBadgeContainer) {
        tierBadgeContainer.classList.add('hidden');
        mobileTierBadgeContainer.classList.add('hidden');
      }
    }
    
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
function initAIHost() {
  const aiHostToggle = document.getElementById('ai-host-toggle');
  
  if (aiHostToggle) {
    aiHostToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if(typeof toggleHostWindow === 'function') {
        toggleHostWindow();
      }
    });
  }
}

// --- 7. Global Helper Functions ---

function setCopyrightYear() {
  const yearSpan = document.getElementById('copyright-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-button, .sign-in-button');
  
  navLinks.forEach(link => {
    const linkPage = new URL(link.href, window.location.origin).pathname.split('/').pop() || 'index.html';
    
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// --- Global AI Host Logic ---

let aiHostHistory = [];
let aiHostVisible = false;

function initAIHostLogic() {
  const aiHostWindow = document.getElementById('ai-host-window');
  const aiHostClose = document.getElementById('ai-host-close');
  const aiHostChatContainer = document.getElementById('ai-host-chat-container');
  const aiHostInput = document.getElementById('ai-host-input');
  const aiHostSend = document.getElementById('ai-host-send');
  
  if (aiHostClose) aiHostClose.addEventListener('click', toggleHostWindow);
  if (aiHostSend) aiHostSend.addEventListener('click', handleSendChat);
  if (aiHostInput) aiHostInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendChat();
      }
  });

  // Send a welcome message
  setTimeout(() => {
      const welcomeMsg = "Welcome to uniQue-ue! I'm Nexus, your digital guide. How can I help you today? You can ask me about our resources, our company, or how to get in touch.";
      addMessageToHost('model', welcomeMsg);
      aiHostHistory.push({ role: 'model', parts: [{ text: welcomeMsg }] });
  }, 1000);
}

window.toggleHostWindow = function() {
  const aiHostWindow = document.getElementById('ai-host-window');
  if (!aiHostWindow) return;

  aiHostVisible = !aiHostVisible;
  if (aiHostVisible) {
      aiHostWindow.classList.remove('hidden');
      setTimeout(() => {
        aiHostWindow.classList.remove('translate-y-4', 'opacity-0');
      }, 10);
  } else {
      aiHostWindow.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => {
        aiHostWindow.classList.add('hidden');
      }, 300);
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

  addMessageToHost('model', '...', true);

  try {
      const aiMessage = await callAiHost(userMessage);
      
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

  const systemPrompt = "You are Nexus, the uniQue-ue digital guide. Your job is to welcome visitors and guide them through the site. Be friendly, helpful, and slightly futuristic. Keep your answers concise (1-2 sentences) unless asked for more detail. Help users understand the site (Home, About, Resources, Contact) and its tools (Ghost-Writer with Draven, Graphics Studio with Elena, Rate Advisor).";
  
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
  const senderName = sender === 'user' ? 'You' : 'Nexus';
  const senderColor = sender === 'user' ? 'text-brand-text-muted' : 'text-brand-accent';
  
  let messageContent = '';
  if (isThinking) {
      messageDiv.classList.add('is-thinking');
      messageContent = '<div class="animate-pulse">...</div>';
  } else {
      messageContent = message.replace(/\\n/g, '<br>');
  }
  
  messageDiv.className = `p-3 rounded-lg max-w-[85%] text-sm chat-bubble-3d ${sender === 'user' ? 'bg-brand-primary self-end' : 'bg-brand-secondary self-start'}`;
  messageDiv.innerHTML = `<p class="font-bold ${senderColor} mb-1">${senderName}</p><p class="text-white">${messageContent}</p>`;
  
  aiHostChatContainer.appendChild(messageDiv);
  aiHostChatContainer.scrollTop = aiHostChatContainer.scrollHeight;
}
