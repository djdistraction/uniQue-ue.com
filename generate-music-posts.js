#!/usr/bin/env node

/**
 * Music History Blog Post Generator
 * 
 * This script generates factual, high-quality music history blog posts for all 366 days
 * of the year (including Feb 29 for leap years). Each post follows the blog generation
 * process outlined in BLOG_GENERATION_PROCESS.md.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ARTICLES_FILE = path.join(__dirname, 'data', 'music-history-articles.json');
const AI_API_URL = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'gpt-4o-mini';

// Check for GitHub PAT
const GITHUB_PAT = process.env.GITHUB_PAT;
if (!GITHUB_PAT) {
    console.error('Error: GITHUB_PAT environment variable is not set.');
    console.error('Please set it with: export GITHUB_PAT="your_github_pat_here"');
    process.exit(1);
}

/**
 * Generate a music history blog post for a specific date using AI
 */
async function generateMusicHistoryPost(month, day) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dateString = `${monthNames[month - 1]} ${day}`;
    
    console.log(`\nGenerating post for ${dateString}...`);

    const prompt = `You are writing a blog post about music history events that occurred on ${dateString} throughout history.

CRITICAL REQUIREMENTS:
- All information MUST be 100% factual and historically accurate
- Include REAL events that actually happened on ${dateString} in specific years
- Research and include at least 3-5 significant events with exact years
- Cover multiple eras (e.g., 1960s, 1970s, 1980s, etc.) and genres
- Include artist birthdays, album releases, notable concerts, deaths, and music milestones
- Provide context about why each event was significant
- Write in an engaging, informative style
- Target 800-1000 words

IMPORTANT FORMAT REQUIREMENTS:
1. Start with a compelling ## header for the introduction
2. Each major event should have its own ### subheading with the year and event
3. After each ### subheading, include an image in this EXACT format:
   ![Description](https://placehold.co/800x400/020418/00F6FF?text=Event+Name)
   OR
   ![Description](https://placehold.co/800x400/020418/F000B8?text=Event+Name)
   (Alternate between 00F6FF and F000B8 colors)
4. After each image, write 2-3 paragraphs about that event
5. End with a ## concluding section

EXAMPLE STRUCTURE:
## A Day of Musical Milestones

${dateString} has witnessed remarkable moments in music history, from groundbreaking releases to the birth of legendary artists.

### 1967: The Beatles Release "Strawberry Fields Forever"

![The Beatles Strawberry Fields](https://placehold.co/800x400/020418/00F6FF?text=The+Beatles)

On this day in 1967, The Beatles released their psychedelic masterpiece "Strawberry Fields Forever"...

[2-3 more paragraphs about this event]

### 1975: Stevie Wonder Wins Five Grammy Awards

![Stevie Wonder Grammys](https://placehold.co/800x400/020418/F000B8?text=Stevie+Wonder)

Stevie Wonder made history on ${dateString}, 1975, becoming the first artist to win five Grammy Awards in a single night...

[Continue with more events following this pattern]

## The Legacy Continues

These ${dateString} moments remind us of music's power to shape culture and inspire generations...

Now write a complete, factual blog post about ${dateString} in music history following this structure.`;

    try {
        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GITHUB_PAT}`
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a music historian and expert writer. You provide only factual, accurate information about music history with specific dates and verifiable events.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                model: MODEL,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();

        console.log(`✓ Successfully generated post for ${dateString}`);
        console.log(`  Length: ${content.length} characters`);
        
        return content;

    } catch (error) {
        console.error(`✗ Error generating post for ${dateString}:`, error.message);
        throw error;
    }
}

/**
 * Load existing articles from JSON file
 */
function loadArticles() {
    try {
        if (fs.existsSync(ARTICLES_FILE)) {
            const content = fs.readFileSync(ARTICLES_FILE, 'utf8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.error('Error loading articles file:', error.message);
    }
    return {};
}

/**
 * Save articles to JSON file
 */
function saveArticles(articles) {
    try {
        const content = JSON.stringify(articles, null, 2);
        fs.writeFileSync(ARTICLES_FILE, content, 'utf8');
        console.log('✓ Articles saved successfully');
    } catch (error) {
        console.error('Error saving articles file:', error.message);
        throw error;
    }
}

/**
 * Get all dates in MM-DD format for the year (including Feb 29)
 */
function getAllDates() {
    const dates = [];
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // Including Feb 29
    
    for (let month = 1; month <= 12; month++) {
        const days = daysInMonth[month - 1];
        for (let day = 1; day <= days; day++) {
            const monthStr = String(month).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            dates.push({ key: `${monthStr}-${dayStr}`, month, day });
        }
    }
    
    return dates;
}

/**
 * Check if a post needs to be regenerated (is it just placeholder content?)
 */
function needsRegeneration(article) {
    if (!article || !article.content) return true;
    
    // Check for generic placeholder text
    const placeholderPhrases = [
        'represents another day in the rich tapestry of music history',
        'From legendary performances to groundbreaking recordings',
        'Many influential musicians were born on this day'
    ];
    
    return placeholderPhrases.some(phrase => article.content.includes(phrase));
}

/**
 * Generate a specific date or all dates
 */
async function generatePosts(specificDate = null) {
    console.log('='.repeat(70));
    console.log('Music History Blog Post Generator');
    console.log('='.repeat(70));
    
    // Load existing articles
    const articles = loadArticles();
    console.log(`Loaded ${Object.keys(articles).length} existing articles`);
    
    // Get list of dates to generate
    let datesToGenerate;
    if (specificDate) {
        const [month, day] = specificDate.split('-').map(Number);
        datesToGenerate = [{ key: specificDate, month, day }];
    } else {
        datesToGenerate = getAllDates();
    }
    
    // Filter to only dates that need generation
    const needsGeneration = datesToGenerate.filter(({ key }) => needsRegeneration(articles[key]));
    
    console.log(`\nDates to generate: ${needsGeneration.length}/${datesToGenerate.length}`);
    
    if (needsGeneration.length === 0) {
        console.log('\nAll articles are already up to date!');
        return;
    }
    
    // Confirm before proceeding with bulk generation
    if (!specificDate && needsGeneration.length > 10) {
        console.log('\n⚠️  WARNING: You are about to generate', needsGeneration.length, 'blog posts.');
        console.log('This will make', needsGeneration.length, 'API calls and may take significant time.');
        console.log('\nTo generate a single date instead, run:');
        console.log('  node generate-music-posts.js MM-DD');
        console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Generate posts
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < needsGeneration.length; i++) {
        const { key, month, day } = needsGeneration[i];
        
        console.log(`\n[${i + 1}/${needsGeneration.length}] Processing ${key}...`);
        
        try {
            const content = await generateMusicHistoryPost(month, day);
            
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const dateString = `${monthNames[month - 1]} ${day}`;
            
            articles[key] = {
                date: dateString,
                title: `${dateString} in Music History`,
                content: content
            };
            
            // Save after each successful generation
            saveArticles(articles);
            successCount++;
            
            // Small delay to avoid rate limiting
            if (i < needsGeneration.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
        } catch (error) {
            console.error(`Failed to generate ${key}:`, error.message);
            errorCount++;
            
            // Stop if too many errors
            if (errorCount > 5) {
                console.error('\n⚠️  Too many errors. Stopping generation.');
                break;
            }
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('Generation Complete');
    console.log('='.repeat(70));
    console.log(`Success: ${successCount} posts`);
    console.log(`Errors: ${errorCount} posts`);
    console.log(`Total articles in database: ${Object.keys(articles).length}/366`);
}

// Main execution
const specificDate = process.argv[2];
if (specificDate && !/^\d{2}-\d{2}$/.test(specificDate)) {
    console.error('Invalid date format. Use MM-DD (e.g., 10-23)');
    process.exit(1);
}

generatePosts(specificDate).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
