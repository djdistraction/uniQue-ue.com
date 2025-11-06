import os

# --- Configuration ---

# This dictionary holds the new frontend shell files to create.
# The key is the filename, and the value is the full content.
new_file_content = {
    
    "_header.html": """
<!--
  This is the new global header.
  We will use JavaScript to load this file into every page.
  This way, we only have to edit this one file to update the nav bar everywhere.
-->
<header class="fixed top-0 left-0 right-0 z-50 bg-brand-primary/80 backdrop-blur-md border-b border-brand-accent/20 shadow-lg">
  <div class="container mx-auto px-6 h-20 flex justify-between items-center">
    <!-- Logo -->
    <a href="index.html" class="flex items-center gap-3">
      <!-- We'll use the small logo in the header -->
      <img src="uniQ_logo_sm2T.png" alt="uniQue-ue Logo" class="h-10 w-auto transition-all duration-300 hover:opacity-80 hover:scale-105">
      <span class="font-display text-2xl font-bold text-white tracking-wider">uniQue-ue</span>
    </a>

    <!-- Desktop Navigation -->
    <nav class="hidden lg:flex items-center space-x-2 font-display text-sm">
      <a href="index.html" class="nav-link" data-navlink="index">Home</a>
      <a href="about.html" class="nav-link" data-navlink="about">About</a>
      <a href="resources.html" class="nav-link" data-navlink="resources">Resources</a>
      <a href="contact.html" class="nav-link" data-navlink="contact">Contact</a>
    </nav>

    <!-- Auth & AI Host -->
    <div class="flex items-center gap-4">
      <!-- Auth Container: This will show "Sign In" or "Profile" -->
      <div id="auth-nav-container">
        <!-- We will dynamically add the login/profile button here -->
      </div>

      <!-- AI Host Button -->
      <button id="ai-host-toggle" class="p-2 rounded-full text-brand-accent transition-all duration-300 hover:bg-brand-accent hover:text-brand-primary animate-glow">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6">
          <path d="M12 8V4H8L10 10L8 16H12V12"></path>
          <path d="M16 8V4H13L15 10L13 16H16V12"></path>
          <path d="M12 12L11 10H13L12 12Z"></path>
          <path d="M18 12h.01"></path>
          <path d="M6 12h.01"></path>
        </svg>
      </button>

      <!-- Mobile Menu Button -->
      <button id="mobile-menu-button" class="lg:hidden text-white p-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" x2="20" y1="12" y2="12"></line>
          <line x1="4" x2="20" y1="6" y2="6"></line>
          <line x1="4" x2="20" y1="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>

  <!-- Mobile Menu (Hidden by default) -->
  <div id="mobile-menu" class="hidden lg:hidden bg-brand-secondary/95 backdrop-blur-sm">
    <nav class="flex flex-col p-4 space-y-2 font-display">
      <a href="index.html" class="nav-link" data-navlink="index">Home</a>
      <a href="about.html" class="nav-link" data-navlink="about">About</a>
      <a href="resources.html" class="nav-link" data-navlink="resources">Resources</a>
      <a href="contact.html" class="nav-link" data-navlink="contact">Contact</a>
      <!-- Mobile auth link will be added here -->
      <div id="mobile-auth-nav-container" class="pt-2"></div>
    </nav>
  </div>
</header>
""",

    "_footer.html": """
<!--
  This is the new global footer.
  We will use JavaScript to load this file into every page.
-->
<footer class="bg-brand-primary border-t border-brand-accent/10 pt-12 pb-8">
  <div class="container mx-auto px-6 text-center">
    <nav class="flex justify-center gap-4 md:gap-8 mb-6 text-sm font-sans text-brand-text-muted">
      <a href="index.html" class="hover:text-brand-accent transition-colors">Home</a>
      <a href="about.html" class="hover:text-brand-accent transition-colors">About</a>
      <a href="resources.html" class="hover:text-brand-accent transition-colors">Resources</a>
      <a href="contact.html" class="hover:text-brand-accent transition-colors">Contact</a>
      <a href="terms.html" class="hover:text-brand-accent transition-colors">Terms of Use</a>
      <a href="privacy.html" class="hover:text-brand-accent transition-colors">Privacy Policy</a>
    </nav>
    <div class="text-center text-brand-text-muted font-sans text-xs">
      <p>&copy; <span id="copyright-year"></span> uniQue-ue. All Rights Reserved.</p>
      <p class="mt-1">A uniQue-ue.com Cyberspace Relay</p>
    </div>
  </div>
</footer>
""",

    "style.css": """
/*
  This new global stylesheet will be linked in every page.
  It defines our theme, fonts, particle effects, and "warp drive" transitions.
*/

/* --- Import Fonts --- */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Orbitron:wght@700;800;900&display=swap');

/* --- Tailwind Base --- */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* --- Base Theme & Typography --- */
body {
  background-color: #020418; /* brand-primary */
  color: #E5E7EB; /* brand-text */
  font-family: 'Inter', sans-serif;
  antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Orbitron', sans-serif;
}

/* --- Global Theme Colors --- */
:root {
  --brand-primary: #020418;
  --brand-secondary: #10142C;
  --brand-accent: #00F6FF;
  --brand-accent-hover: #9EFFFD;
  --brand-magenta: #F000B8;
  --brand-text: #E5E7EB;
  --brand-text-muted: #9CA3AF;
}

/* --- Particle Canvas (Site-wide Background) --- */
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: -10;
  opacity: 0.7;
}

/* --- Reusable Header/Nav Link Styling --- */
.nav-link {
  @apply px-4 py-2 rounded-md text-brand-text-muted transition-all duration-300;
}

.nav-link:hover {
  @apply text-brand-accent bg-brand-accent/10;
}

/* Active link class (we'll add this with JS) */
.nav-link.active {
  @apply text-brand-accent bg-brand-accent/20 shadow-inner;
}

/* --- Glow Animation --- */
.animate-glow {
  animation: glow 3s ease-in-out infinite alternate;
}

@keyframes glow {
  from {
    text-shadow: 0 0 5px var(--brand-accent), 0 0 10px var(--brand-accent), 0 0 15px var(--brand-accent);
    box-shadow: 0 0 10px -5px var(--brand-accent);
  }
  to {
    text-shadow: 0 0 10px var(--brand-accent), 0 0 20px var(--brand-accent), 0 0 30px var(--brand-accent);
    box-shadow: 0 0 20px -5px var(--brand-accent);
  }
}

/* --- Page Content Wrapper --- */
/*
  This ensures our content sits on top of the fixed particle canvas
  and has a minimum height to fill the screen.
*/
.page-wrapper {
  position: relative;
  z-index: 10;
  min-height: 100vh;
  padding-top: 5rem; /* 80px, the height of our header */
  display: flex;
  flex-direction: column;
}

main {
  flex-grow: 1;
}

/* --- "Warp Drive" Page Transition --- */
/*
  We will add/remove this class to the <body>
  to create the fade-out/fade-in effect.
*/
body.is-navigating {
  opacity: 0;
  transition: opacity 0.3s ease-out;
}

/* --- Skeleton Loader Placeholder --- */
.skeleton-loader {
  @apply bg-brand-secondary/50 rounded-md animate-pulse;
}

/* --- Global Scrollbar Styling (Optional but thematic) --- */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: var(--brand-primary);
}
::-webkit-scrollbar-thumb {
  background: var(--brand-secondary);
  border: 1px solid var(--brand-accent);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--brand-accent);
}
"""
}

def main():
    print("🚀 Creating new frontend shell files...")
    
    project_dir = os.getcwd()
    print(f"Running in: {project_dir}\n")
    
    # --- Create/Update new files ---
    for filename, content in new_file_content.items():
        file_path = os.path.join(project_dir, filename)
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                # .strip() removes the extra newlines at the start/end
                f.write(content.strip())
            print(f"✅ CREATED: {filename}")
        except Exception as e:
            print(f"❌ ERROR: Could not write {filename}. {e}")

    print("\n🎉 Frontend shell files created successfully!")
    print("\n--- NEXT STEPS ---")
    print("1. A new 'app.js' file is needed to load these components.")
    print("2. Run 'git add .' and 'git commit' to save these new files to your repo.")

if __name__ == "__main__":
    main()