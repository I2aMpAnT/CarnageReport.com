// Emblem Generator JavaScript
// Add this script to your index.html before </body>

(function() {
    // Halo 2 emblem color palette (accurate colors from in-game color blocks)
    const colorPalette = [
        { r: 255, g: 255, b: 255 }, // 0: White (10E0)
        { r: 110, g: 110, b: 110 }, // 1: Steel (11E0)
        { r: 189, g: 43,  b: 44  }, // 2: Red (12E0)
        { r: 244, g: 123, b: 32  }, // 3: Orange (13E0)
        { r: 244, g: 209, b: 45  }, // 4: Gold (14E0)
        { r: 158, g: 169, b: 90  }, // 5: Olive (15E0)
        { r: 35,  g: 145, b: 46  }, // 6: Green (16E0)
        { r: 36,  g: 87,  b: 70  }, // 7: Sage (17E0)
        { r: 22,  g: 160, b: 160 }, // 8: Cyan (18E0)
        { r: 55,  g: 115, b: 123 }, // 9: Teal (27E0)
        { r: 32,  g: 113, b: 178 }, // 10: Cobalt (19E0)
        { r: 45,  g: 60,  b: 180 }, // 11: Blue (1FE0)
        { r: 108, g: 80,  b: 182 }, // 12: Violet (20E0)
        { r: 148, g: 39,  b: 132 }, // 13: Purple (22E0)
        { r: 248, g: 155, b: 200 }, // 14: Pink (23E0)
        { r: 156, g: 15,  b: 68  }, // 15: Crimson (24E0)
        { r: 120, g: 73,  b: 43  }, // 16: Brown (25E0)
        { r: 175, g: 144, b: 87  }  // 17: Tan (26E0)
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

        // Clear canvas with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 256, 256);

        const foregroundCols = 4;
        const backgroundCols = 4;

        // Sprite sheet dimensions:
        // Foregrounds: 1030 x 6028, 58 items in 4 columns (16 rows including numbers)
        // Backgrounds: 1030 x 2088, 27 items (7 rows), has title header
        // Each cell has ~2px grid lines around it that need to be excluded
        const gridLineWidth = 3; // Padding to exclude grid lines from extraction

        // Background sprite dimensions (title header ~24px)
        const bgCellWidth = Math.floor(1030 / 4);           // 257
        const bgHeaderOffset = 24;
        const bgCellHeight = Math.floor((2088 - bgHeaderOffset) / 7);  // ~295
        // Actual usable area after excluding grid lines
        const bgUsableWidth = bgCellWidth - gridLineWidth * 2;
        const bgUsableHeight = bgCellHeight - gridLineWidth * 2;

        // Foreground sprite dimensions
        // 15 rows of emblems (58 items total: 48 symbols + 10 numbers)
        // Header text takes ~24px, footer attribution ~140px
        const fgCellWidth = Math.floor(1030 / 4);           // 257
        const fgHeaderOffset = 24;
        const fgFooterOffset = 140;
        const fgContentHeight = 6028 - fgHeaderOffset - fgFooterOffset; // ~5864
        const fgCellHeight = Math.floor(fgContentHeight / 15);  // ~390
        // Actual usable area after excluding grid lines
        const fgUsableWidth = fgCellWidth - gridLineWidth * 2;
        const fgUsableHeight = fgCellHeight - gridLineWidth * 2;
        // Crop to centered square for better emblem extraction
        const fgEmblemSize = Math.min(fgUsableWidth, fgUsableHeight);

        // Draw background first (primary color on blue areas, secondary on white areas)
        const bgRow = Math.floor(emblemBackground / backgroundCols);
        const bgCol = emblemBackground % backgroundCols;
        // Add grid line offset to start inside the usable area
        const bgX = bgCol * bgCellWidth + gridLineWidth;
        const bgY = bgHeaderOffset + bgRow * bgCellHeight + gridLineWidth;

        drawBackground(ctx, bgX, bgY, bgUsableWidth, bgUsableHeight, colorPalette[emblemPrimary], colorPalette[emblemSecondary]);

        // Draw foreground on top
        const fgRow = Math.floor(emblemForeground / foregroundCols);
        const fgCol = emblemForeground % foregroundCols;
        // Extract square region from each cell (emblems are roughly square), add grid line offset
        const fgX = fgCol * fgCellWidth + gridLineWidth;
        const fgY = fgHeaderOffset + fgRow * fgCellHeight + gridLineWidth;

        // Toggle only hides the primary color, secondary still shows
        drawForeground(ctx, fgX, fgY, fgEmblemSize, fgEmblemSize, colorPalette[emblemPrimary], colorPalette[emblemSecondary], emblemToggle);
    }

    // Draw background - blue pixels get primary color, white areas get secondary color
    function drawBackground(ctx, sx, sy, width, height, primaryColor, secondaryColor) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(backgroundSprite, sx, sy, width, height, 0, 0, width, height);
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Check if pixel is blue (primary area)
            if (b > 200 && r < 100 && g < 100) {
                // Blue pixel -> Primary color
                const intensity = b / 255;
                data[i] = primaryColor.r * intensity;
                data[i + 1] = primaryColor.g * intensity;
                data[i + 2] = primaryColor.b * intensity;
                data[i + 3] = 255;
            } else if (r > 200 && g > 200 && b > 200) {
                // White/light pixel -> Secondary color
                const intensity = (r + g + b) / (255 * 3);
                data[i] = secondaryColor.r * intensity;
                data[i + 1] = secondaryColor.g * intensity;
                data[i + 2] = secondaryColor.b * intensity;
                data[i + 3] = 255;
            } else {
                // Other pixels (gradients, etc) - blend based on blue channel
                const blueRatio = b / 255;
                const whiteRatio = Math.min(r, g) / 255;

                data[i] = primaryColor.r * blueRatio + secondaryColor.r * whiteRatio * (1 - blueRatio);
                data[i + 1] = primaryColor.g * blueRatio + secondaryColor.g * whiteRatio * (1 - blueRatio);
                data[i + 2] = primaryColor.b * blueRatio + secondaryColor.b * whiteRatio * (1 - blueRatio);
                data[i + 3] = 255;
            }
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, 256, 256);
    }

    // Find the bounding box of non-black pixels in an image region
    // Returns { minX, minY, maxX, maxY } or null if no content found
    function findEmblemBounds(imageData, width, height, threshold = 40) {
        const data = imageData.data;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let foundContent = false;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // Check if pixel is non-black (has meaningful content)
                // Use higher threshold to exclude dark edge artifacts and anti-aliasing noise
                if (a > 0 && (r > threshold || g > threshold || b > threshold)) {
                    foundContent = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (!foundContent) return null;
        return { minX, minY, maxX, maxY };
    }

    // Draw foreground - yellow pixels get primary color, blue pixels get secondary color
    // When toggle is 1, only show secondary color (hide primary)
    function drawForeground(ctx, sx, sy, width, height, primaryColor, secondaryColor, toggle) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(foregroundSprite, sx, sy, width, height, 0, 0, width, height);
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Find the actual bounds of the emblem content
        const bounds = findEmblemBounds(imageData, width, height);
        let emblemWidth = width;
        let emblemHeight = height;
        let offsetX = 0;
        let offsetY = 0;

        if (bounds) {
            emblemWidth = bounds.maxX - bounds.minX + 1;
            emblemHeight = bounds.maxY - bounds.minY + 1;
            // Calculate centering offset
            const emblemCenterX = bounds.minX + emblemWidth / 2;
            const emblemCenterY = bounds.minY + emblemHeight / 2;
            offsetX = (width / 2) - emblemCenterX;
            offsetY = (height / 2) - emblemCenterY;
        }

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Skip fully transparent pixels
            if (a === 0) continue;

            // Skip black/near-black pixels (transparent background)
            // Use higher threshold to clean up dark edge artifacts
            if (r < 30 && g < 30 && b < 30) {
                data[i + 3] = 0; // Make transparent
                continue;
            }

            // Yellow pixels (high R, high G, low B) -> Primary color (or transparent if toggled)
            if (r > 150 && g > 150 && b < 100) {
                if (toggle === 1) {
                    // Hide primary color when toggled
                    data[i + 3] = 0;
                } else {
                    const intensity = (r + g) / (255 * 2);
                    data[i] = primaryColor.r * intensity;
                    data[i + 1] = primaryColor.g * intensity;
                    data[i + 2] = primaryColor.b * intensity;
                    data[i + 3] = 255;
                }
            }
            // Blue pixels (low R, low G, high B) -> Secondary color
            else if (b > 150 && r < 100 && g < 100) {
                const intensity = b / 255;
                data[i] = secondaryColor.r * intensity;
                data[i + 1] = secondaryColor.g * intensity;
                data[i + 2] = secondaryColor.b * intensity;
                data[i + 3] = 255;
            }
            // Mixed/edge pixels - blend based on color channels
            else {
                const yellowIntensity = Math.min(r, g) / 255;
                const blueIntensity = b / 255;
                const total = yellowIntensity + blueIntensity;

                if (total > 0) {
                    if (toggle === 1) {
                        // Only show secondary (blue) portion when toggled
                        if (blueIntensity > 0.1) {
                            data[i] = secondaryColor.r * blueIntensity;
                            data[i + 1] = secondaryColor.g * blueIntensity;
                            data[i + 2] = secondaryColor.b * blueIntensity;
                            data[i + 3] = Math.floor(blueIntensity * 255);
                        } else {
                            data[i + 3] = 0;
                        }
                    } else {
                        const yellowRatio = yellowIntensity / total;
                        const blueRatio = blueIntensity / total;

                        data[i] = (primaryColor.r * yellowRatio + secondaryColor.r * blueRatio) * (total / 1.5);
                        data[i + 1] = (primaryColor.g * yellowRatio + secondaryColor.g * blueRatio) * (total / 1.5);
                        data[i + 2] = (primaryColor.b * yellowRatio + secondaryColor.b * blueRatio) * (total / 1.5);
                        data[i + 3] = 255;
                    }
                } else {
                    data[i + 3] = 0; // Make transparent
                }
            }
        }

        tempCtx.putImageData(imageData, 0, 0);

        // Apply centering offset when drawing to the output canvas
        const scale = 256 / width;
        const destOffsetX = offsetX * scale;
        const destOffsetY = offsetY * scale;
        ctx.drawImage(tempCanvas, 0, 0, width, height, destOffsetX, destOffsetY, 256, 256);
    }

    window.downloadEmblem = function() {
        const canvas = document.getElementById('emblemCanvas');
        const link = document.createElement('a');
        link.download = 'halo2-emblem.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Parse URL parameters and set emblem values
    function applyUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);

        // Map URL parameters to form elements
        // EP = Emblem foreground design
        // EB = Emblem background design
        // EF = Emblem primary color (foreground color)
        // ES = Emblem secondary color (or use S as fallback)
        // ET = Emblem toggle
        // P/S = Player primary/secondary colors from old system

        const emblemForeground = urlParams.get('EP');
        const emblemBackground = urlParams.get('EB');
        const emblemPrimaryColor = urlParams.get('EF');
        const emblemSecondaryColor = urlParams.get('ES') || urlParams.get('S');
        const emblemToggle = urlParams.get('ET');

        if (emblemForeground !== null) {
            const fgSelect = document.getElementById('emblemForeground');
            if (fgSelect) fgSelect.value = emblemForeground;
        }

        if (emblemBackground !== null) {
            const bgSelect = document.getElementById('emblemBackground');
            if (bgSelect) bgSelect.value = emblemBackground;
        }

        if (emblemPrimaryColor !== null) {
            const primarySelect = document.getElementById('emblemPrimary');
            if (primarySelect) primarySelect.value = emblemPrimaryColor;
        }

        if (emblemSecondaryColor !== null) {
            const secondarySelect = document.getElementById('emblemSecondary');
            if (secondarySelect) secondarySelect.value = emblemSecondaryColor;
        }

        if (emblemToggle !== null) {
            const toggleCheckbox = document.getElementById('emblemToggle');
            if (toggleCheckbox) toggleCheckbox.checked = (emblemToggle === '1');
        }

        // If any emblem parameters were provided, switch to the emblem tab
        if (emblemForeground !== null || emblemBackground !== null ||
            emblemPrimaryColor !== null || emblemSecondaryColor !== null) {
            // Wait a moment for the page to fully load, then switch to emblem tab
            setTimeout(() => {
                if (typeof switchMainTab === 'function') {
                    switchMainTab('emblem');
                }
            }, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyUrlParameters();
            loadSprites();
        });
    } else {
        applyUrlParameters();
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
