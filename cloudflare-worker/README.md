# Cloudflare Worker - Halo 2 Emblem Generator

This worker provides clean URLs for Halo 2 emblems. It serves pre-rendered PNGs when available, with fallback to HTML renderer.

## URL Format

```
https://YOUR-WORKER.workers.dev/P10-S0-EP0-ES1-EF37-EB5-ET0.png
```

Or with query params:
```
https://YOUR-WORKER.workers.dev/?P=10&S=0&EP=0&ES=1&EF=37&EB=5&ET=0
```

## Setup Instructions

### 1. Create Cloudflare Account (Free)

1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account
3. Verify your email

### 2. Create the Worker

1. Go to **Workers & Pages** in the sidebar
2. Click **Create Application**
3. Click **Create Worker**
4. Name it something like `halo2-emblem`
5. Click **Deploy**

### 3. Add the Code

1. Click **Edit code** on your new worker
2. Delete all the default code
3. Copy the entire contents of `emblem-worker.js`
4. Paste it into the editor
5. Click **Save and Deploy**

### 4. Test It

Your worker URL will be:
```
https://halo2-emblem.YOUR-SUBDOMAIN.workers.dev
```

Test with:
```
https://halo2-emblem.YOUR-SUBDOMAIN.workers.dev/P10-S0-EP0-ES1-EF37-EB5-ET0.png
```

### 5. Update Your Site (Optional)

Update `emblem.js` to use your worker URL:

```javascript
window.getStaticEmblemUrl = function(params) {
    const { P = 10, S = 0, EP = 0, ES = 1, EF = 0, EB = 0, ET = 0 } = params || {};
    return `https://halo2-emblem.YOUR-SUBDOMAIN.workers.dev/P${P}-S${S}-EP${EP}-ES${ES}-EF${EF}-EB${EB}-ET${ET}.png`;
}
```

## How It Works

1. Request comes in: `/P10-S0-EP0-ES1-EF37-EB5-ET0.png`
2. Worker checks if pre-rendered PNG exists on GitHub Pages
3. If yes → serves the PNG directly (fast, cached)
4. If no → redirects to `emblem-image.html` (renders client-side)

## Parameters

| Param | Description | Range |
|-------|-------------|-------|
| P | Background Primary Color | 0-17 |
| S | Background Secondary Color | 0-17 |
| EP | Emblem Primary Color | 0-17 |
| ES | Emblem Secondary Color | 0-17 |
| EF | Emblem Foreground | 0-63 |
| EB | Emblem Background | 0-31 |
| ET | Emblem Toggle | 0-1 |

## Pre-rendering Emblems

To make emblems load faster (as direct PNGs), pre-render them:

```bash
# Generate all emblems from game history
node generate-emblems.js --from-games

# Generate a specific emblem
node generate-emblems.js --params 10,0,0,1,37,5,0
```

Then commit and push the generated PNGs to GitHub.
