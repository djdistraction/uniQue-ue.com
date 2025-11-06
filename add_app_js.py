import os
import re

# --- Configuration ---

# This is the new, standardized <head> content for every page.
# It includes Tailwind, our new stylesheet, and our new JS modules.
new_head_content = """
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{TITLE_PLACEHOLDER}</title>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Google Fonts (Inter & Orbitron) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Orbitron:wght@700;800;900&display=swap" rel="stylesheet">
    
    <!-- Our New Global Stylesheet -->
    <link rel="stylesheet" href="style.css">
    
    <!-- Firebase & Main App Logic -->
    <!-- We use type="module" to enable import/export -->
    <script src="firebase-config.js" type="module"></script>
    <script src="app.js" type="module"></script>
    
    <!-- We'll keep the old logo files for now -->
    <link rel="icon" href="uniQ_logo_sm2T.png" type="image/png">
</head>
"""

# This is the new, standardized <body> structure for every page.
# It includes the particle canvas and our header/footer placeholders.
new_body_content = """
<body>
    <!-- Fixed background particle canvas -->
    <canvas id="particle-canvas" class="particle-canvas"></canvas>
    
    <!-- 
      Page Wrapper
      This holds all content and sits on top of the particle canvas.
      It has padding-top to account for the 80px fixed header.
    -->
    <div class="page-wrapper">
    
        <!-- Global Header Component -->
        <!-- app.js will load _header.html into this div -->
        <div id="header-placeholder">
            <!-- Skeleton loader for the header -->
            <div class="fixed top-0 left-0 right-0 z-50 h-20 bg-brand-secondary/50 backdrop-blur-md animate-pulse"></div>
        </div>
        
        <!-- 
          Main Content
          The unique content for each page will be placed inside this <main> tag.
        -->
        <main class="container mx-auto px-6 py-12">
            {MAIN_CONTENT_PLACEHOLDER}
        </main>
        
        <!-- Global Footer Component -->
        <!-- app.js will load _footer.html into this div -->
        <div id="footer-placeholder">
            <!-- Skeleton loader for the footer -->
            <div class="h-32 w-full bg-brand-primary border-t border-brand-accent/10 animate-pulse"></div>
        </div>
        
    </div>
</body>
"""

# List of all HTML files to update
html_files_to_update = [
    "index.html",
    "about.html",
    "ghost-writer.html",
    "graphics-studio.html",
    "contact.html",
    "profile.html",
    "resources.html",
    "privacy.html",
    "terms.html",
]

# Regex patterns to find old content
# 1. Finds the <title> tag content
title_pattern = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
# 2. Finds the <main> tag and all its content
main_content_pattern = re.compile(r"<main(.*?)>(.*?)</main>", re.IGNORECASE | re.DOTALL)
# 3. Finds the <body> tag and all its content (fallback)
body_content_pattern = re.compile(r"<body(.*?)>(.*?)</body>", re.IGNORECASE | re.DOTALL)


def get_existing_content(content):
    """
    Tries to extract the <title> and <main> content from an old HTML file.
    """
    title_match = title_pattern.search(content)
    title = title_match.group(1).strip() if title_match else "uniQue-ue"
    
    main_content_match = main_content_pattern.search(content)
    if main_content_match:
        # Found a <main> tag, use its content
        main_content = main_content_match.group(2).strip()
    else:
        # No <main> tag found, try to find <body> content
        body_content_match = body_content_pattern.search(content)
        if body_content_match:
            # Found <body>, but we need to strip old headers/footers
            # This is complex, so for now, we'll just grab it all.
            # This works well for the *new* placeholder pages from the first script.
            main_content = body_content_match.group(2).strip()
        else:
            main_content = f"<!-- Could not find existing content for this page. -->"
            
    # Special case for our placeholder files: clean up the wrapper divs
    if "<!-- TODO: Add new site-wide header -->" in main_content:
        main_content = main_content.replace("<!-- TODO: Add new site-wide header -->", "")
    if "<!-- TODO: Add new site-wide footer -->" in main_content:
        main_content = main_content.replace("<!-- TODO: Add new site-wide footer -->", "")
        
    return title, main_content.strip()

def main():
    print("🚀 Upgrading all HTML pages to the new global shell...")
    
    project_dir = os.getcwd()
    print(f"Running in: {project_dir}\n")
    
    files_updated = 0
    files_failed = 0
    
    for filename in html_files_to_update:
        file_path = os.path.join(project_dir, filename)
        
        if not os.path.exists(file_path):
            print(f"⚠️  SKIPPED: {filename} (does not exist)")
            continue
            
        try:
            # --- 1. Read the old file content ---
            with open(file_path, 'r', encoding='utf-8') as f:
                old_content = f.read()
                
            # --- 2. Extract the useful parts (title and main content) ---
            title, main_content = get_existing_content(old_content)
            
            print(f"ℹ️  Processing: {filename} (Title: {title})")
            
            # --- 3. Build the new, complete HTML file ---
            new_html = "<!DOCTYPE html>\n<html lang=\"en\">\n"
            new_html += new_head_content.replace("{TITLE_PLACEHOLDER}", title)
            new_html += new_body_content.replace("{MAIN_CONTENT_PLACEHOLDER}", main_content)
            new_html += "\n</html>"
            
            # --- 4. Write the new content back to the file ---
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_html)
                
            print(f"✅ UPDATED: {filename}")
            files_updated += 1
            
        except Exception as e:
            print(f"❌ ERROR: Could not process {filename}. {e}")
            files_failed += 1

    print("\n" + "="*30)
    print("🎉 HTML Upgrade Complete!")
    print(f"   {files_updated} files successfully updated.")
    print(f"   {files_failed} files failed.")
    print("="*30)
    print("\n--- NEXT STEPS ---")
    print("1. Your local HTML pages are now all using the new `app.js` system.")
    print("2. Now we can start redesigning the *content* of each page (Phase 3).")
    print("3. Run 'git add .' and 'git commit' to save these changes to your repo.")

if __name__ == "__main__":
    main()