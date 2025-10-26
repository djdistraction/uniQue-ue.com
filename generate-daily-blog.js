#!/usr/bin/env node

/**
 * Daily Blog Post Generator
 * 
 * This script generates a daily music history blog post following the workflow:
 * 1. Check if an article already exists for today's date
 * 2. If yes, skip generation (article already exists)
 * 3. If no, generate article text (without images)
 * 4. Generate images for the article
 * 5. Insert images into the article
 * 6. Save complete article to database
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
    console.error('This is required for AI API access.');
    process.exit(1);
}

/**
 * Load existing articles from JSON file
 */
function loadArticles() {
    try {
        if (fs.existsSync(ARTICLES_FILE)) {
            const data = fs.readFileSync(ARTICLES_FILE, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('Error loading articles:', error.message);
        return {};
    }
}

/**
 * Save articles to JSON file
 */
function saveArticles(articles) {
    try {
        const dir = path.dirname(ARTICLES_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf8');
        console.log('✓ Articles saved successfully');
    } catch (error) {
        console.error('Error saving articles:', error.message);
        throw error;
    }
}

/**
 * Call AI API to generate content
 */
async function callAI(messages, temperature = 0.7) {
    try {
        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GITHUB_PAT}`
            },
            body: JSON.stringify({
                messages,
                model: MODEL,
                temperature,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`AI API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling AI:', error.message);
        throw error;
    }
}

/**
 * Generate article text (without images)
 */
async function generateArticleText(month, day) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dateString = `${monthNames[month - 1]} ${day}`;
    
    console.log(`Generating article text for ${dateString}...`);

    const messages = [
        {
            role: 'system',
            content: 'You are a music historian and expert writer. You provide only factual, accurate information about music history with specific dates and verifiable events.'
        },
        {
            role: 'user',
            content: `Write a blog post about music history events that occurred on ${dateString} throughout history.

CRITICAL REQUIREMENTS:
- All information MUST be 100% factual and historically accurate
- Include REAL events that actually happened on ${dateString} in specific years
- Include at least 3-5 significant events with exact years
- Cover multiple eras and genres
- Include artist birthdays, album releases, notable concerts, deaths, and music milestones
- Provide context about why each event was significant
- Write in an engaging, informative style
- Target 800-1000 words

FORMAT REQUIREMENTS:
1. Start with a compelling ## header for the introduction
2. Each major event should have its own ### subheading with the year and event
3. Leave a placeholder [IMAGE_PLACEHOLDER] after each ### subheading (images will be added later)
4. After each placeholder, write 2-3 paragraphs about that event
5. End with a ## concluding section

Do NOT include actual image markdown - only use [IMAGE_PLACEHOLDER] where images should go.`
        }
    ];

    const content = await callAI(messages, 0.7);
    return content;
}

/**
 * Generate image descriptions for the article
 */
async function generateImageDescriptions(articleText, month, day) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dateString = `${monthNames[month - 1]} ${day}`;
    
    console.log(`Generating image descriptions for ${dateString}...`);

    const messages = [
        {
            role: 'system',
            content: 'You are an expert at creating image descriptions for blog posts. You analyze article content and suggest appropriate images.'
        },
        {
            role: 'user',
            content: `Given this music history article, create image descriptions for each section.

Article:
${articleText}

For each [IMAGE_PLACEHOLDER] in the article, provide a description that should be used to generate or find an image.

Return ONLY a JSON array of image descriptions in this format:
[
  {
    "description": "Brief description of the image",
    "altText": "Alt text for the image",
    "searchTerm": "Search term for placeholder (e.g., 'The+Beatles' or 'Elvis+Presley')"
  }
]

Keep descriptions concise and relevant to the section they'll appear in.`
        }
    ];

    const content = await callAI(messages, 0.5);
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error('Failed to parse image descriptions from AI response');
    }
    
    return JSON.parse(jsonMatch[0]);
}

/**
 * Insert images into the article text
 */
function insertImages(articleText, imageDescriptions) {
    console.log('Inserting images into article...');
    
    let result = articleText;
    const colors = ['00F6FF', 'F000B8']; // Alternate between cyan and magenta
    let colorIndex = 0;
    
    imageDescriptions.forEach((img) => {
        const color = colors[colorIndex % colors.length];
        const imageMarkdown = `![${img.altText}](https://placehold.co/800x400/020418/${color}?text=${img.searchTerm})`;
        
        result = result.replace('[IMAGE_PLACEHOLDER]', imageMarkdown);
        colorIndex++;
    });
    
    // Remove any remaining placeholders (in case AI didn't match count)
    result = result.replace(/\[IMAGE_PLACEHOLDER\]/g, '');
    
    return result;
}

/**
 * Generate a complete blog post for a specific date
 */
async function generateBlogPost(month, day) {
    const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dateString = `${monthNames[month - 1]} ${day}`;
    
    console.log('\n' + '='.repeat(70));
    console.log(`Generating blog post for ${dateString}`);
    console.log('='.repeat(70));
    
    try {
        // Step 1: Generate article text (without images)
        const articleText = await generateArticleText(month, day);
        console.log('✓ Article text generated');
        
        // Step 2: Generate image descriptions
        const imageDescriptions = await generateImageDescriptions(articleText, month, day);
        console.log(`✓ ${imageDescriptions.length} image descriptions generated`);
        
        // Step 3: Insert images into article
        const completeArticle = insertImages(articleText, imageDescriptions);
        console.log('✓ Images inserted into article');
        
        // Step 4: Create article object
        const article = {
            date: dateString,
            title: `${dateString} in Music History`,
            content: completeArticle,
            generated_date: new Date().toISOString().split('T')[0],
            author: 'Randall Gene'
        };
        
        return { dateKey, article };
    } catch (error) {
        console.error(`Error generating blog post: ${error.message}`);
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('Daily Blog Post Generator');
    console.log('='.repeat(70));
    
    // Get today's date
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    console.log(`Current date: ${month}/${day} (key: ${dateKey})`);
    
    // Step 1: Load existing articles
    console.log('\nLoading existing articles...');
    const articles = loadArticles();
    console.log(`✓ Loaded ${Object.keys(articles).length} existing articles`);
    
    // Step 2: Check if article already exists for today
    if (articles[dateKey]) {
        console.log(`\n✓ Article for ${dateKey} already exists - skipping generation`);
        console.log('No changes needed.');
        return;
    }
    
    console.log(`\n→ No article found for ${dateKey} - generating new article...`);
    
    // Step 3: Generate the blog post
    const { article } = await generateBlogPost(month, day);
    
    // Step 4: Save to database
    articles[dateKey] = article;
    saveArticles(articles);
    
    console.log('\n' + '='.repeat(70));
    console.log('✓ Daily blog post generation complete!');
    console.log('='.repeat(70));
}

// Run the script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
