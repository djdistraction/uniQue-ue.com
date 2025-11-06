import os
import re

# This is the name of your GitHub repository.
# It's CRITICAL that this matches exactly.
REPO_NAME = "uniQue-ue.com"

# --- 1. Fix app.js ---
# We need to change the fetch paths from './_header.html' to just '_header.html'
# so they correctly use the new <base> tag.
APP_JS_PATH = "app.js"
print(f"--- Fixing {APP_JS_PATH} ---")

try:
    with open(APP_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Use regex to find all instances of './filename.js' or './filename.html'
    # and replace them with 'filename.js' or 'filename.html'
    # This makes them relative to the <base> tag, not the current page.
    content = re.sub(r'src:\s*\'\./(firebase-config\.js)\'', r"src: '\g<1>'", content)
    content = re.sub(r'fetch\(\'\./(_header\.html)\'', r"fetch('\g<1>'", content)
    content = re.sub(r'fetch\(\'\./(_footer\.html)\'', r"fetch('\g<1>'", content)
    
    # Also fix the import path for firebase-config.js
    content = re.sub(r'import\s*\{\s*(.*?)\s*\}\s*from\s*\'\./(firebase-config\.js)\'', r"import { \g<1> } from '\g<2>'", content)

    with open(APP_JS_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"✅ Successfully fixed paths in {APP_JS_PATH}")

except Exception as e:
    print(f"❌ ERROR: Could not fix {APP_JS_PATH}. {e}")
    print("Please make sure the file exists and try again.")


# --- 2. Fix all .html files ---
# We need to add the <base> tag and fix all script/link paths.
print(f"\n--- Fixing all .html files ---")

# The <base> tag to insert.
# This tells the browser all paths start from this sub-folder.
BASE_TAG = f'    <base href="/{REPO_NAME}/">\n'

# Find all files in the current directory ending in .html
html_files = [f for f in os.listdir('.') if f.endswith('.html') and not f.startswith('_')]

if not html_files:
    print("❌ ERROR: No .html files found to fix.")
else:
    for filename in html_files:
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()

            # Fix script and link paths (e.g., ./app.js -> app.js)
            # This makes them use the new <base> tag.
            content = re.sub(r'href="\./(style\.css)"', r'href="\g<1>"', content)
            content = re.sub(r'href="\./(uniQ_logo_sm2T\.png)"', r'href="\g<1>"', content)
            content = re.sub(r'src="\./(firebase-config\.js)"', r'src="\g<1>"', content)
            content = re.sub(r'src="\./(app\.js)"', r'src="\g<1>"', content)
            
            # Add the <base> tag right before the </head> tag
            if BASE_TAG not in content:
                content = content.replace("</head>", BASE_TAG + "</head>")
                
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Successfully fixed paths and added <base> tag to: {filename}")
            else:
                print(f"ℹ️  SKIPPED: {filename} (already fixed)")

        except Exception as e:
            print(f"❌ ERROR: Could not fix {filename}. {e}")

print("\n🎉 Path fix complete.")
print("You are now ready to commit and push these changes.")