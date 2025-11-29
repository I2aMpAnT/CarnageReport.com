// Emblem Generator JavaScript
// Add this script to your index.html before </body>

(function() {
    const colorPalette = [
        { r: 255, g: 255, b: 255 }, { r: 0,   g: 0,   b: 0   },
        { r: 255, g: 0,   b: 0   }, { r: 0,   g: 0,   b: 255 },
        { r: 128, g: 128, b: 128 }, { r: 255, g: 255, b: 0   },
        { r: 0,   g: 255, b: 0   }, { r: 255, g: 192, b: 203 },
        { r: 128, g: 0,   b: 128 }, { r: 0,   g: 255, b: 255 },
        { r: 139, g: 69,  b: 19  }, { r: 210, g: 180, b: 140 },
        { r: 255, g: 20,  b: 147 }, { r: 75,  g: 0,   b: 130 },
        { r: 0,   g: 100, b: 0   }, { r: 128, g: 0,   b: 0   },
        { r: 255, g: 165, b: 0   }, { r: 135, g: 206, b: 250 }
    ];

    let foregroundSprite = null;
    let backgroundSprite = null;
    let spritesLoaded = false;

    function loadSprites() {
        const fg = new Image();
        const bg = new Image();
        let loadedCount = 0;

        fg.onload = () => {
            foregroundSprite = fg;
            loadedCount++;
            if (loadedCount === 2) {
                spritesLoaded = true;
                updateEmblem();
            }
        };

        bg.onload = () => {
            backgroundSprite = bg;
            loadedCount++;
            if (loadedCount === 2) {
                spritesLoaded = true;
                updateEmblem();
            }
        };

        fg.onerror = () => console.error('Failed to load emblem foregrounds');
        bg.onerror = () => console.error('Failed to load emblem backgrounds');

        fg.src = 'emblems/Emblem%20Foregrounds.png';
        bg.src = 'emblems/Emblem%20Backgrounds.png';
    }

    window.updateEmblem = function() {
        if (!spritesLoaded) return;

        const canvas = document.getElementById('emblemCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const emblemPrimary = parseInt(document.getElementById('emblemPrimary').value);
        const emblemSecondary = parseInt(document.getElementById('emblemSecondary').value);
        const emblemForeground = parseInt(document.getElementById('emblemForeground').value);
        const emblemBackground = parseInt(document.getElementById('emblemBackground').value);
        const emblemToggle = document.getElementById('emblemToggle').checked ? 1 : 0;

        ctx.clearRect(0, 0, 256, 256);

        const emblemSize = 128;
        const foregroundCols = 8;
        const backgroundCols = 8;

        const bgRow = Math.floor(emblemBackground / backgroundCols);
        const bgCol = emblemBackground % backgroundCols;
        const bgX = bgCol * emblemSize;
        const bgY = bgRow * emblemSize;

        drawColorizedEmblem(ctx, backgroundSprite, bgX, bgY, emblemSize, colorPalette[emblemPrimary]);

        if (emblemToggle === 0) {
            const fgRow = Math.floor(emblemForeground / foregroundCols);
            const fgCol = emblemForeground % foregroundCols;
            const fgX = fgCol * emblemSize;
            const fgY = fgRow * emblemSize;

            drawColorizedEmblem(ctx, foregroundSprite, fgX, fgY, emblemSize, colorPalette[emblemSecondary]);
        }
    }

    function drawColorizedEmblem(ctx, sprite, sx, sy, size, color) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(sprite, sx, sy, size, size, 0, 0, size, size);
        const imageData = tempCtx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha === 0) continue;

            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const intensity = gray / 255;

            data[i] = color.r * intensity;
            data[i + 1] = color.g * intensity;
            data[i + 2] = color.b * intensity;
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, size, size, 0, 0, 256, 256);
    }

    window.downloadEmblem = function() {
        const canvas = document.getElementById('emblemCanvas');
        const link = document.createElement('a');
        link.download = 'halo2-emblem.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSprites);
    } else {
        loadSprites();
    }

    // Re-render when emblem tab becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const emblemTab = document.getElementById('main-tab-emblem');
                if (emblemTab && emblemTab.style.display !== 'none' && spritesLoaded) {
                    updateEmblem();
                }
            }
        });
    });

    // Observe the emblem tab for visibility changes
    setTimeout(() => {
        const emblemTab = document.getElementById('main-tab-emblem');
        if (emblemTab) {
            observer.observe(emblemTab, { attributes: true, attributeFilter: ['style'] });
        }
    }, 100);
})();
