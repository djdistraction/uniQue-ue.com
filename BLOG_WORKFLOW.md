# Blog Workflow Documentation

## Overview

This document describes the automated blog workflow for the uniQue-ue blog, specifically the "On This Day in Music History" series. The workflow ensures articles are generated daily and available for any day of the year.

## Workflow Process

### 1. Daily Automated Generation (12:01 AM)

A GitHub Action runs every day at 12:01 AM UTC to generate the daily blog post:

```
.github/workflows/daily-blog-post.yml
```

**Process:**
1. GitHub Action triggers at scheduled time
2. Checks out repository
3. Runs `generate-daily-blog.js` script
4. Script scans database for existing article
5. If article exists: skips generation
6. If article doesn't exist:
   - Generates article text (without images)
   - Generates image descriptions
   - Inserts images into article
   - Saves complete article to database
7. Commits and pushes changes if article was generated

### 2. User-Triggered Generation

When a user visits the blog and selects a specific date:

**Process:**
1. User selects a date from the date picker
2. JavaScript scans `data/music-history-articles.json` for existing article
3. If article exists: displays it immediately
4. If article doesn't exist:
   - Shows loading indicator with progress messages
   - Generates article text (client-side or via API)
   - Generates and inserts images
   - Displays complete article to user
   - (Note: Client-generated articles are not automatically saved to database)

## Components

### GitHub Action Workflow
**File:** `.github/workflows/daily-blog-post.yml`
- Scheduled to run at 12:01 AM UTC daily
- Can be manually triggered via GitHub Actions UI
- Requires `GITHUB_PAT` secret for AI API access

### Article Generation Script
**File:** `generate-daily-blog.js`
- Node.js script that handles the generation workflow
- Checks database for existing articles
- Calls AI API to generate text and image descriptions
- Assembles complete article with images
- Saves to JSON database

### Blog Viewer Page
**File:** `music-history.html`
- Displays blog articles with date navigation
- Implements the same workflow for user-selected dates
- Shows progress messages during generation
- Supports viewing any day of the year

### Article Database
**File:** `data/music-history-articles.json`
- JSON structure with articles indexed by date (MM-DD format)
- Contains article content, metadata, and generation date
- Updated automatically by GitHub Actions

## Article Generation Process

### Step 1: Generate Article Text

The AI generates a markdown-formatted article with:
- Factual music history events for the specific date
- 3-5 major events with years
- Proper heading structure (## and ###)
- [IMAGE_PLACEHOLDER] markers for images

### Step 2: Generate Image Descriptions

The AI analyzes the article text and creates descriptions for each image:
- Relevant to the section content
- Includes alt text and search terms
- Returned as JSON array

### Step 3: Insert Images

Images are inserted into the article:
- Replaces [IMAGE_PLACEHOLDER] with image markdown
- Uses placeholder service (placehold.co) with brand colors
- Alternates between cyan (#00F6FF) and magenta (#F000B8)

### Step 4: Save to Database

Complete article is saved to JSON file:
```json
{
  "MM-DD": {
    "date": "Month Day",
    "title": "Month Day in Music History",
    "content": "Complete markdown article with images",
    "generated_date": "YYYY-MM-DD",
    "author": "Randall Gene"
  }
}
```

## Benefits of This Workflow

1. **Automated Daily Content**: Articles generated automatically at midnight
2. **No Duplicate Generation**: Database check prevents regenerating existing articles
3. **On-Demand Generation**: Users can trigger generation for any date
4. **Image Integration**: Images generated and inserted after text is finalized
5. **Version Controlled**: All articles stored in Git repository
6. **Consistent Format**: All articles follow the same structure and style

## Future Enhancements

- **Real Image Generation**: Replace placeholder images with AI-generated images
- **API Endpoint**: Create endpoint to save user-generated articles to database
- **Multiple Blog Series**: Extend workflow to other blog types (filmmaking, AI news)
- **Image Upload**: Support uploading custom images for articles
- **Edit Interface**: Allow editing existing articles
- **Archive View**: Calendar view of all available articles

## Manual Operation

To manually generate an article for a specific date:

```bash
# Set your GitHub PAT
export GITHUB_PAT="your_github_pat_here"

# Run the generation script (generates for today)
node generate-daily-blog.js

# Or manually trigger the GitHub Action from the Actions tab
```

## Configuration

### Required Secrets

**GITHUB_PAT**: GitHub Personal Access Token with access to GitHub Models API
- Set in repository secrets for GitHub Actions
- Set as environment variable for local development

### AI API Configuration

The workflow uses the GitHub Models API:
- Endpoint: `https://models.inference.ai.azure.com/chat/completions`
- Model: `gpt-4o-mini`
- Authentication: Bearer token (GITHUB_PAT)

## Troubleshooting

### Article Not Generated
- Check GitHub Actions logs for errors
- Verify GITHUB_PAT secret is set
- Check API rate limits

### Images Not Displaying
- Verify placeholder service (placehold.co) is accessible
- Check image URLs in article content
- Ensure browser can load external images

### Article Formatting Issues
- Check markdown parsing in `parseMarkdownToHTML` function
- Verify image placeholders are properly replaced
- Review AI-generated content structure

## Maintenance

- Monitor GitHub Actions for failures
- Review generated articles for quality
- Update AI prompts if content quality decreases
- Check JSON file size as articles accumulate
