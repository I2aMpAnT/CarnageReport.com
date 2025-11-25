# CarnageReport.com - Setup Instructions

## Files Required

Make sure all these files are in the same directory:

1. **index.html** - Main HTML file
2. **styles.css** - Stylesheet
3. **script.js** - JavaScript code
4. **gameshistory.json** - Game data (170 KB)
5. **H2CRFinal.ico** - Favicon
6. **H2CRFinal.png** - Logo image

## Running the Site

### ⚠️ IMPORTANT: Cannot open directly from file system!

You **cannot** simply double-click index.html and open it in your browser. Modern browsers block JavaScript from loading JSON files via the `file://` protocol for security reasons.

### Option 1: Use Python (Recommended for Testing)

Open a terminal/command prompt in the directory with your files and run:

```bash
# Python 3
python -m http.server 8000

# Python 2 (if you have it)
python -m SimpleHTTPServer 8000
```

Then open your browser and go to: `http://localhost:8000`

### Option 2: Use Node.js (if installed)

```bash
npx http-server -p 8000
```

Then open: `http://localhost:8000`

### Option 3: Deploy to GitHub Pages

1. Push all files to your GitHub repository
2. Go to repository Settings → Pages
3. Select your branch (usually `main`)
4. Save
5. Your site will be available at: `https://yourusername.github.io/reponame/`

### Option 4: Deploy to Netlify (Easy drag-and-drop)

1. Go to https://app.netlify.com/drop
2. Drag and drop your entire folder
3. Get an instant live URL

## Troubleshooting

### Error: "NO GAME DATA AVAILABLE"

**Cause**: The browser cannot load `gameshistory.json`

**Solutions**:
1. Make sure you're using a web server (see options above), not opening via `file://`
2. Check browser console (F12) for specific error messages
3. Verify `gameshistory.json` is in the same directory as `index.html`
4. Check for typos in filenames (case-sensitive on Linux/Mac)

### Error: "Failed to fetch"

**Cause**: CORS policy or file not found

**Solutions**:
1. Must use a web server (see above)
2. Check browser console for the exact fetch URL it's trying
3. Verify file permissions (should be readable)

### Images not showing

**Cause**: Missing image files or wrong paths

**Solutions**:
1. Make sure `H2CRFinal.png` and `H2CRFinal.ico` are present
2. Check that filenames match exactly (case-sensitive)
3. Look in browser console for 404 errors

### Debugging Steps

1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for `[DEBUG]` messages that show:
   - Whether fetch started
   - Response status
   - Number of games loaded
   - Any errors

4. Go to Network tab
5. Refresh the page
6. Check if `gameshistory.json` loaded successfully
   - Should show status 200
   - Should show size ~170 KB

## File Structure

```
your-folder/
├── index.html
├── styles.css
├── script.js
├── gameshistory.json
├── H2CRFinal.ico
├── H2CRFinal.png
└── README.md (this file)
```

## Testing

A test file `test-json.html` is included. Open this in your browser (via web server) to verify JSON loading works:

```bash
python -m http.server 8000
# Then visit: http://localhost:8000/test-json.html
```

If this works, the main site should work too.

## Production Deployment

For production, you should:

1. **Use GitHub Pages** (recommended for static sites)
   - Free hosting
   - Custom domain support
   - HTTPS included

2. **Or use Netlify**
   - Free tier available
   - Automatic deployments from Git
   - Custom domain support

3. **Or upload to your web hosting**
   - Just upload all files to your web server
   - Make sure they're accessible via HTTP/HTTPS

## Data Updates

To update game data in the future:
1. Replace `gameshistory.json` with new data
2. Keep the same structure (array of game objects)
3. Clear browser cache if changes don't appear (Ctrl+Shift+R or Cmd+Shift+R)

## Support

If you're still having issues:
1. Check the browser console for errors (F12)
2. Verify you're using a web server, not `file://`
3. Make sure all files are present and named correctly
4. Try the test-json.html file first
