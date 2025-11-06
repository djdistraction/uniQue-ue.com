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
import { auth } from 'firebase-config.js'; 
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
        <a href="./profile.html" class="nav-link flex items-center gap-2" data-navlink="profile">
          <img src="${user.photoURL || 'https://placehold.co/32x32/10142C/00F6FF?text=' + displayName.charAt(0).toUpperCase()}" alt="Profile" class="h-6 w-6 rounded-full border border-brand-accent/50">
          <span>Profile</span>
        </a>
      `;
      authContainer.innerHTML = profileButtonHTML;
      mobileAuthContainer.innerHTML = profileButtonHTML;
      
    } else {
      // --- User is SIGNED OUT ---
      const signInButtonHTML = `
        <a href="./profile.html" class="nav-link" data-navlink="profile">
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
function initAIHost() {
  const aiHostToggle = document.getElementById('ai-host-toggle');
  const aiHostWindow = document.getElementById('ai-host-window'); // This ID is in index.html

  if (aiHostToggle && aiHostWindow) {
    aiHostToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      // This is defined in index.html
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