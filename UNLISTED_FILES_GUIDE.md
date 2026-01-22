# Hidden/Unlisted App Files Configuration

## Overview
This guide explains how to make application files accessible via direct URL without them being readily discoverable through search engines, sitemaps, or site navigation.

## Solution: The `/app/` Directory

All files placed in the `/app/` directory are configured to be:
- ✅ **Accessible** - Available via direct URL
- ✅ **Unlisted** - Not indexed by search engines
- ✅ **Hidden** - Not in sitemap.xml
- ✅ **Unlinked** - Not referenced in navigation

## Implementation Details

### 1. Directory Structure
```
/app/
├── README.md           # Documentation
├── index.html          # Info page (accessible at /app/)
├── example-app.html    # Example hidden app
└── [your-app.html]     # Your app files go here
```

### 2. Search Engine Prevention
The `robots.txt` file includes:
```
# Disallow unlisted app directory from indexing
Disallow: /app/
```

This tells search engines not to crawl or index anything in the `/app/` directory.

### 3. Meta Tags
Each HTML file in `/app/` should include these meta tags:
```html
<meta name="robots" content="noindex, nofollow">
```

This provides an additional layer of protection against indexing.

### 4. Sitemap Exclusion
The `/app/` directory is intentionally excluded from `sitemap.xml`, so it won't be advertised to search engines.

## How to Use

### Adding Your App Files

1. **Create your application file(s)**
   ```bash
   # Example: Creating a new app file
   touch app/my-secret-app.html
   ```

2. **Add the noindex meta tag** (recommended)
   ```html
   <meta name="robots" content="noindex, nofollow">
   ```

3. **Commit and push to GitHub**
   ```bash
   git add app/my-secret-app.html
   git commit -m "Add my secret app"
   git push
   ```

4. **Share the direct URL**
   ```
   https://www.unique-ue.com/app/my-secret-app.html
   ```

### Accessing Files

- **Direct URL**: `https://www.unique-ue.com/app/[filename].html`
- **Example**: `https://www.unique-ue.com/app/example-app.html`

## Security Considerations

### What This Provides
- **Obscurity**: Files are hard to discover without the exact URL
- **No Search Results**: Won't appear in Google, Bing, etc.
- **No Sitemap Listing**: Won't be advertised to crawlers

### What This DOES NOT Provide
- **Authentication**: Anyone with the URL can access the file
- **Encryption**: Files are transmitted over HTTPS but aren't encrypted at rest
- **Access Control**: No way to revoke access once someone has the URL

### When to Use
✅ Good for:
- Internal tools that don't contain sensitive data
- Beta features you want to test with select users
- Landing pages for specific campaigns
- Tools that should be shared via direct link only

❌ NOT suitable for:
- Personal or sensitive information
- Financial data
- User authentication details
- Any data requiring true privacy/security

### Improving Security
For actual security, consider:
1. **Add authentication** - Use Firebase Auth or similar
2. **Add authorization** - Check user permissions before showing content
3. **Use a backend** - Don't rely solely on client-side hiding
4. **Implement access tokens** - Require valid tokens in URL parameters
5. **Add rate limiting** - Prevent abuse if URLs are discovered

## Testing

### Verify Your Setup

1. **Test Direct Access**
   ```
   Visit: https://www.unique-ue.com/app/example-app.html
   Should: Load successfully
   ```

2. **Check robots.txt**
   ```
   Visit: https://www.unique-ue.com/robots.txt
   Should: Show "Disallow: /app/"
   ```

3. **Check sitemap.xml**
   ```
   Visit: https://www.unique-ue.com/sitemap.xml
   Should: NOT contain any /app/ entries
   ```

4. **Search Engine Test** (takes time)
   ```
   Google: site:unique-ue.com/app/
   Should: Return no results (after indexing)
   ```

## Examples

### Example 1: Simple Hidden Page
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>My Hidden App</title>
</head>
<body>
    <h1>This is only accessible via direct URL</h1>
    <p>Share this link: https://www.unique-ue.com/app/my-hidden-page.html</p>
</body>
</html>
```

### Example 2: App with Authentication Check
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="robots" content="noindex, nofollow">
    <title>Protected App</title>
</head>
<body>
    <div id="app">Loading...</div>
    
    <script type="module">
        // Add your authentication logic here
        import { getAuth, onAuthStateChanged } from 'firebase/auth';
        
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
            if (user) {
                document.getElementById('app').innerHTML = 'Welcome, authenticated user!';
            } else {
                window.location.href = '/setup.html';
            }
        });
    </script>
</body>
</html>
```

## Troubleshooting

### File is indexed by Google
- Check that `robots.txt` has the `/app/` disallow rule
- Ensure the file has the `noindex` meta tag
- Request removal via Google Search Console
- Wait for Google to re-crawl (can take weeks)

### File is not accessible
- Verify the file exists in `/app/` directory
- Check file permissions (should be readable)
- Ensure GitHub Pages is enabled for the repository
- Wait a few minutes for GitHub Pages to deploy

### Want to make a file public again
1. Move it out of `/app/` directory
2. Add it to `sitemap.xml` if desired
3. Remove or change the `noindex` meta tag
4. Link to it from your navigation/pages

## Maintenance

### Regular Checks
- Review `/app/` directory contents periodically
- Remove unused or outdated files
- Update documentation when adding new patterns
- Monitor access logs if available

### Updates
If you need to update the configuration:
1. Modify `robots.txt` to add more disallow rules
2. Update individual file meta tags as needed
3. Document any changes in this file

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/pages)
- [robots.txt Specification](https://www.robotstxt.org/)
- [Meta Robots Tag Guide](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Sitemap Protocol](https://www.sitemaps.org/)

## Support

For questions or issues:
1. Check this documentation
2. Review the example files in `/app/`
3. Open an issue on the GitHub repository
4. Contact the site administrator

---

**Last Updated**: January 2026
**Version**: 1.0.0
