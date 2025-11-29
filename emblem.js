// Emblem Generator JavaScript - Individual Image Version
// Uses individual PNG files instead of sprite sheets
// Supports 4-color system: Emblem Primary/Secondary, Background Primary/Secondary

(function() {
    // Halo 2 emblem color palette (accurate colors from in-game color blocks)
    // Index matches the color block BMP file codes
    const colorPalette = [
        { r: 255, g: 255, b: 255, code: '10E0', name: 'White' },
        { r: 110, g: 110, b: 110, code: '11E0', name: 'Steel' },
        { r: 189, g: 43,  b: 44,  code: '12E0', name: 'Red' },
        { r: 244, g: 123, b: 32,  code: '13E0', name: 'Orange' },
        { r: 244, g: 209, b: 45,  code: '14E0', name: 'Gold' },
        { r: 158, g: 169, b: 90,  code: '15E0', name: 'Olive' },
        { r: 35,  g: 145, b: 46,  code: '16E0', name: 'Green' },
        { r: 36,  g: 87,  b: 70,  code: '17E0', name: 'Sage' },
        { r: 22,  g: 160, b: 160, code: '18E0', name: 'Cyan' },
        { r: 55,  g: 115, b: 123, code: '27E0', name: 'Teal' },
        { r: 32,  g: 113, b: 178, code: '19E0', name: 'Cobalt' },
        { r: 45,  g: 60,  b: 180, code: '1FE0', name: 'Blue' },
        { r: 108, g: 80,  b: 182, code: '20E0', name: 'Violet' },
        { r: 148, g: 39,  b: 132, code: '22E0', name: 'Purple' },
        { r: 248, g: 155, b: 200, code: '23E0', name: 'Pink' },
        { r: 156, g: 15,  b: 68,  code: '24E0', name: 'Crimson' },
        { r: 120, g: 73,  b: 43,  code: '25E0', name: 'Brown' },
        { r: 175, g: 144, b: 87,  code: '26E0', name: 'Tan' }
    ];

    // Foreground emblem filenames (index matches dropdown value)
    const foregroundFiles = [
        'Sol.png', 'Bullseye.png', 'Double Crescent.png', 'Halt.png',
        'Phoenix.png', 'Champion.png', 'Sergeant.png', 'Drone.png',
        'Spartan.png', 'Delta.png', 'Helmet.png', 'Radioactive.png',
        'Smiley.png', 'Frowney.png', 'Triad.png', 'Waypoint.png',
        'Ying Yang.png', 'Brute Head.png', 'Trinity.png', 'Vortex.png',
        'Spearhead.png', 'Trident.png', 'Skull King.png', 'Triplicate.png',
        'Subnova.png', 'Marathon.png', 'Valkyrie.png', 'Spades.png',
        'Clubs.png', 'Diamonds.png', 'Hearts.png', 'Snake.png',
        'Flaming Ninja.png', 'Rampancy.png', 'Hawk.png', 'Lips.png',
        'Capsule.png', 'Race.png', 'Gas Mask.png', 'Grunt.png',
        'Grenade.png', 'Thor.png', 'Mark of Shame.png', 'Wasp.png',
        'Da Bomb.png', 'Runes.png', 'Grunt Head.png', 'Tsantsa.png',
        'Cancel.png', 'Jolly Roger.png', 'Cube.png', 'Cleave.png',
        'Grunt Symbol.png',
        'Number 0.png', 'Number 1.png', 'Number 2.png', 'Number 3.png',
        'Number 4.png', 'Number 5.png', 'Number 6.png', 'Number 7.png',
        'Number 8.png', 'Number 9.png'
    ];

    // Background filenames (index matches dropdown value)
    const backgroundFiles = [
        'Solid.png', 'Vertical Split.png', 'Horizontal Split 1.png',
        'Horizontal Split 2.png', 'Horizontal Gradient.png', 'Vertical Gradient.png',
        'Triple Row.png', 'Quadrants 1.png', 'DIagonal Slice.png',
        'Cleft.png', 'X1.png', 'X2.png', 'Diamond.png', 'Cross.png',
        'Square.png', 'Dual Half-Circle.png', 'Diagonal Quadrant.png',
        'Three Quarters.png', 'Quarter.png', 'Four Rows 1.png',
        'Split Circle.png', 'One Third.png', 'Two Thirds.png',
        'Upper Field.png', 'Top and Bottom.png', 'Center Stripe.png',
        'Left and Right.png', 'Circle.png', 'Triangle.png',
        'Four Rows 2.png', 'Quadrants 2.png', 'Triple Column.png'
    ];

    // Image cache for loaded images
    const imageCache = {};

    // Load a single image and cache it
    function loadImage(path) {
        return new Promise((resolve, reject) => {
            if (imageCache[path]) {
                resolve(imageCache[path]);
                return;
            }
            const img = new Image();
            img.onload = () => {
                imageCache[path] = img;
                resolve(img);
            };
            img.onerror = () => {
                console.error('Failed to load:', path);
                reject(new Error('Failed to load: ' + path));
            };
            img.src = path;
        });
    }

    // Initialize color picker grids with BMP images
    function initColorPickers() {
        const pickers = document.querySelectorAll('.color-picker');
        pickers.forEach(picker => {
            const targetId = picker.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            picker.innerHTML = '';
            colorPalette.forEach((color, index) => {
                const swatch = document.createElement('div');
                swatch.className = 'color-swatch';
                swatch.dataset.value = index;
                swatch.title = color.name;
                // Use BMP as background image
                swatch.style.backgroundImage = `url('emblems/color%20blocks/${color.code}.bmp')`;
                // Fallback to solid color if BMP fails
                swatch.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

                if (parseInt(input.value) === index) {
                    swatch.classList.add('selected');
                }

                swatch.addEventListener('click', () => {
                    // Remove selection from siblings
                    picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                    swatch.classList.add('selected');
                    input.value = index;
                    updateEmblem();
                });

                picker.appendChild(swatch);
            });
        });
    }

    // Preload essential images for faster initial render
    async function preloadImages() {
        try {
            const defaultFg = 'emblems/embems/' + encodeURIComponent(foregroundFiles[12]);
            const defaultBg = 'emblems/backgrounds/' + encodeURIComponent(backgroundFiles[5]);
            await Promise.all([loadImage(defaultFg), loadImage(defaultBg)]);
            updateEmblem();
        } catch (e) {
            console.error('Error preloading images:', e);
            updateEmblem();
        }
    }

    // Smooth interpolation helper
    function smoothstep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    // Linear interpolation
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    window.updateEmblem = async function() {
        const canvas = document.getElementById('emblemCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Get all 4 colors
        const emblemPrimary = parseInt(document.getElementById('emblemPrimary')?.value || 1);
        const emblemSecondary = parseInt(document.getElementById('emblemSecondary')?.value || 0);
        const bgPrimary = parseInt(document.getElementById('bgPrimary')?.value || 11);
        const bgSecondary = parseInt(document.getElementById('bgSecondary')?.value || 0);
        const emblemForeground = parseInt(document.getElementById('emblemForeground')?.value || 0);
        const emblemBackground = parseInt(document.getElementById('emblemBackground')?.value || 0);
        const emblemToggle = document.getElementById('emblemToggle')?.checked ? 1 : 0;

        // Clear canvas with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 256, 256);

        // Get file paths
        const fgFile = foregroundFiles[emblemForeground] || foregroundFiles[0];
        const bgFile = backgroundFiles[emblemBackground] || backgroundFiles[0];
        const fgPath = 'emblems/embems/' + encodeURIComponent(fgFile);
        const bgPath = 'emblems/backgrounds/' + encodeURIComponent(bgFile);

        try {
            const [fgImg, bgImg] = await Promise.all([
                loadImage(fgPath),
                loadImage(bgPath)
            ]);

            // Draw background with background colors
            drawBackground(ctx, bgImg, colorPalette[bgPrimary], colorPalette[bgSecondary]);

            // Draw foreground with emblem colors
            drawForeground(ctx, fgImg, colorPalette[emblemPrimary], colorPalette[emblemSecondary], emblemToggle);
        } catch (e) {
            console.error('Error rendering emblem:', e);
        }
    }

    // Draw background - blue pixels get primary color, white areas get secondary color
    // With smooth gradient handling
    function drawBackground(ctx, img, primaryColor, secondaryColor) {
        const tempCanvas = document.createElement('canvas');
        const size = 256;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');

        // Enable image smoothing for better quality
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(img, 0, 0, size, size);

        const imageData = tempCtx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate blend ratio based on blue vs white
            // Blue channel indicates primary, white (all channels high) indicates secondary
            const blueAmount = b / 255;
            const whiteAmount = Math.min(r, g, b) / 255;

            // For gradients, use smooth interpolation
            let primaryRatio, secondaryRatio;

            if (b > r + 50 && b > g + 50) {
                // Predominantly blue -> more primary
                primaryRatio = smoothstep(0.3, 1.0, blueAmount);
                secondaryRatio = 1 - primaryRatio;
            } else if (r > 180 && g > 180 && b > 180) {
                // White-ish -> more secondary
                secondaryRatio = smoothstep(0.7, 1.0, whiteAmount);
                primaryRatio = 1 - secondaryRatio;
            } else {
                // Gradient area - smooth blend based on channels
                const totalColor = r + g + b;
                if (totalColor > 0) {
                    primaryRatio = smoothstep(0, 1, (b - Math.min(r, g)) / 255);
                    secondaryRatio = 1 - primaryRatio;
                } else {
                    primaryRatio = 0;
                    secondaryRatio = 0;
                }
            }

            // Apply colors with smooth blending
            const intensity = Math.max(blueAmount, whiteAmount, 0.1);
            data[i] = lerp(secondaryColor.r, primaryColor.r, primaryRatio) * intensity;
            data[i + 1] = lerp(secondaryColor.g, primaryColor.g, primaryRatio) * intensity;
            data[i + 2] = lerp(secondaryColor.b, primaryColor.b, primaryRatio) * intensity;
            data[i + 3] = 255;
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
    }

    // Draw foreground - yellow pixels get primary color, blue pixels get secondary color
    // With smooth edge handling
    function drawForeground(ctx, img, primaryColor, secondaryColor, toggle) {
        const tempCanvas = document.createElement('canvas');
        const size = 256;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');

        // Enable image smoothing
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(img, 0, 0, size, size);

        const imageData = tempCtx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Skip fully transparent pixels
            if (a === 0) continue;

            // Skip black/near-black pixels (transparent background)
            if (r < 25 && g < 25 && b < 25) {
                data[i + 3] = 0;
                continue;
            }

            // Calculate yellow (primary) and blue (secondary) amounts
            const yellowAmount = Math.min(r, g) / 255;
            const blueAmount = b / 255;
            const redAmount = r / 255;
            const greenAmount = g / 255;

            // Determine if this is primarily yellow, blue, or mixed
            let primaryRatio = 0;
            let secondaryRatio = 0;
            let alpha = 255;

            if (r > 120 && g > 120 && b < 120) {
                // Yellow pixel -> Primary color
                primaryRatio = smoothstep(0.4, 1.0, yellowAmount);
                secondaryRatio = 0;
                alpha = Math.floor(255 * Math.max(yellowAmount, 0.8));
            } else if (b > 120 && r < 120 && g < 120) {
                // Blue pixel -> Secondary color
                secondaryRatio = smoothstep(0.4, 1.0, blueAmount);
                primaryRatio = 0;
                alpha = Math.floor(255 * Math.max(blueAmount, 0.8));
            } else if (yellowAmount > 0.1 || blueAmount > 0.1) {
                // Mixed/edge pixels - smooth blend
                const total = yellowAmount + blueAmount;
                if (total > 0) {
                    primaryRatio = yellowAmount / total;
                    secondaryRatio = blueAmount / total;
                    alpha = Math.floor(255 * smoothstep(0.1, 0.6, total));
                }
            } else {
                // Very dark non-black pixel - make semi-transparent
                data[i + 3] = 0;
                continue;
            }

            // Apply toggle (hide primary)
            if (toggle === 1) {
                primaryRatio = 0;
                if (secondaryRatio < 0.1) {
                    data[i + 3] = 0;
                    continue;
                }
            }

            // Blend colors
            const finalR = lerp(0, primaryColor.r, primaryRatio) + lerp(0, secondaryColor.r, secondaryRatio);
            const finalG = lerp(0, primaryColor.g, primaryRatio) + lerp(0, secondaryColor.g, secondaryRatio);
            const finalB = lerp(0, primaryColor.b, primaryRatio) + lerp(0, secondaryColor.b, secondaryRatio);

            data[i] = Math.min(255, finalR);
            data[i + 1] = Math.min(255, finalG);
            data[i + 2] = Math.min(255, finalB);
            data[i + 3] = alpha;
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
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

        const params = {
            'EP': 'emblemForeground',
            'EB': 'emblemBackground',
            'EF': 'emblemPrimary',
            'ES': 'emblemSecondary',
            'BP': 'bgPrimary',
            'BS': 'bgSecondary'
        };

        Object.entries(params).forEach(([param, elementId]) => {
            const value = urlParams.get(param);
            if (value !== null) {
                const el = document.getElementById(elementId);
                if (el) el.value = value;
            }
        });

        const emblemToggle = urlParams.get('ET');
        if (emblemToggle !== null) {
            const toggleCheckbox = document.getElementById('emblemToggle');
            if (toggleCheckbox) toggleCheckbox.checked = (emblemToggle === '1');
        }

        // Switch to emblem tab if parameters provided
        if (urlParams.has('EP') || urlParams.has('EB') || urlParams.has('EF')) {
            setTimeout(() => {
                if (typeof switchMainTab === 'function') {
                    switchMainTab('emblem');
                }
            }, 100);
        }
    }

    // Initialize everything when DOM is ready
    function init() {
        applyUrlParameters();
        initColorPickers();
        preloadImages();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-render when emblem tab becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const emblemTab = document.getElementById('main-tab-emblem');
                if (emblemTab && emblemTab.style.display !== 'none') {
                    // Re-init color pickers in case they weren't visible before
                    initColorPickers();
                    updateEmblem();
                }
            }
        });
    });

    setTimeout(() => {
        const emblemTab = document.getElementById('main-tab-emblem');
        if (emblemTab) {
            observer.observe(emblemTab, { attributes: true, attributeFilter: ['style'] });
        }
    }, 100);
})();
