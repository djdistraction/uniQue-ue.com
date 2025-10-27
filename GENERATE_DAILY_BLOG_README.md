# Daily Blog Generation Script

## Overview

The `generate-daily-blog.js` script is responsible for automatically generating daily blog posts for the "On This Day in Music History" series. It implements the complete blog generation workflow outlined in the problem requirements.

## Workflow

The script follows this process:

1. **Check Database**: Scans `data/music-history-articles.json` for an existing article for the current date
2. **Check Content Quality**: If article exists, determines if it's a placeholder or real content
3. **Skip if Real Content**: If an article with real content already exists, the script exits without making changes
4. **Generate or Regenerate**: If no article exists or if it's a placeholder, generates new article text using AI (without images)
5. **Generate Images**: Creates image descriptions based on the article content
6. **Insert Images**: Inserts placeholder images into the article at designated locations
7. **Save to Database**: Saves the complete article with images to the JSON database

## Usage

### Automated Daily Generation

The script runs automatically via GitHub Actions every day at 12:01 AM UTC:
- See `.github/workflows/daily-blog-post.yml`
- Requires `GITHUB_PAT` secret to be configured in repository settings
- Automatically commits and pushes generated articles

### Manual Execution

To run the script manually:

```bash
# Set your GitHub PAT environment variable
export GITHUB_PAT="your_github_personal_access_token"

# Run the script
node generate-daily-blog.js
```

The script will:
- Check if an article exists for today's date
- Determine if existing article is real content or a placeholder
- Skip generation if article has real content
- Generate new article if no article exists or if it's a placeholder
- Save the new article to `data/music-history-articles.json`

### Generate for Specific Date

To generate an article for a specific date, you can modify the script or use it as a library:

```javascript
const { generateBlogPost } = require('./generate-daily-blog.js');

// Generate for a specific date (month, day)
generateBlogPost(12, 25)  // December 25th
  .then(({ dateKey, article }) => {
    console.log(`Generated article for ${dateKey}`);
  });
```

## Configuration

### Environment Variables

- **GITHUB_PAT** (required): GitHub Personal Access Token with access to GitHub Models API

### API Configuration

The script uses:
- **API Endpoint**: `https://models.inference.ai.azure.com/chat/completions`
- **Model**: `gpt-4o-mini`
- **Temperature**: 0.7 (for article text), 0.5 (for image descriptions)

### Output Format

Articles are saved in JSON format:

```json
{
  "MM-DD": {
    "date": "Month Day",
    "title": "Month Day in Music History",
    "content": "Markdown content with images...",
    "generated_date": "YYYY-MM-DD",
    "author": "Randall Gene"
  }
}
```

## Article Generation Details

### Text Generation

The AI generates articles with:
- 100% factual, historically accurate information
- 3-5 significant music events with specific years
- Multiple eras and genres represented
- Proper markdown formatting (## and ### headers)
- `[IMAGE_PLACEHOLDER]` markers where images should be inserted

### Image Generation

After text is complete:
1. AI analyzes the article content
2. Generates relevant image descriptions for each section
3. Creates placeholder image URLs with brand colors (cyan #00F6FF and magenta #F000B8)
4. Inserts images at `[IMAGE_PLACEHOLDER]` locations

### Placeholder Detection

The script automatically detects placeholder articles that need regeneration by checking for common placeholder phrases:
- "represents another day in the rich tapestry of music history"
- "From legendary performances to groundbreaking recordings"
- "Many influential musicians were born on this day"

If an article contains these phrases, it will be regenerated with factual content even if it exists in the database.

## Error Handling

The script includes error handling for:
- Missing GITHUB_PAT environment variable
- API failures
- File system errors
- JSON parsing errors

Errors are logged to console with detailed messages.

## Dependencies

Required Node.js packages (from `package.json`):
- `node-fetch@^2.6.7` (for API calls)

Built-in modules used:
- `fs` (file system operations)
- `path` (file path handling)

## Integration

### GitHub Actions

The script is integrated with GitHub Actions for automated execution:
- Workflow file: `.github/workflows/daily-blog-post.yml`
- Runs on schedule: `0 1 * * *` (12:01 AM UTC daily)
- Can be manually triggered via GitHub UI

### Website

The generated articles are used by:
- `music-history.html` - Displays articles with date navigation
- `blog.html` - Lists available blog series

## Troubleshooting

### Script Exits Immediately

**Cause**: Article with real content already exists for today
**Solution**: This is expected behavior. Articles with real content are only generated once per date. Placeholder articles will be automatically regenerated.

### Script Regenerates Existing Article

**Cause**: Existing article is detected as a placeholder
**Solution**: This is expected behavior. The script will regenerate placeholder articles with factual content.

### API Error

**Cause**: Invalid or missing GITHUB_PAT
**Solution**: Ensure GITHUB_PAT is set correctly and has proper permissions

### File Not Found

**Cause**: `data/` directory doesn't exist
**Solution**: The script creates the directory automatically, but ensure write permissions

## Future Enhancements

Potential improvements:
- Support for multiple blog series (filmmaking, AI news)
- Real image generation using DALL-E or similar
- API endpoint for saving user-generated articles
- Batch generation for multiple dates
- Quality verification before saving

## License

Part of the uniQue-ue project - see repository LICENSE for details.
