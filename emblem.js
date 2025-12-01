// Emblem Generator JavaScript
// Uses individual PNG files for emblems and backgrounds
// Supports 4-color system: Emblem Primary/Secondary, Player Primary/Secondary

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

    // Foreground emblem filenames (index matches EF parameter)
    const foregroundFiles = [
        '00 - Seventh Column.png',  // 0
        '01 - Bullseye.png',        // 1
        '02 - Vortex.png',          // 2
        '03 - Halt.png',            // 3
        '04 - Spartan.png',         // 4
        '05 - Da Bomb.png',         // 5
        '06 - Trinity.png',         // 6
        '07 - Delta.png',           // 7
        '08 - Rampancy.png',        // 8
        '09 - Sergeant.png',        // 9
        '10 - Phoenix.png',         // 10
        '11 - Champion.png',        // 11
        '12 - Jolly Roger.png',     // 12
        '13 - Marathon.png',        // 13
        '14 - Cube.png',            // 14
        '15 - Radioactive .png',    // 15
        '16 - Smiley.png',          // 16
        '17 - Frowney.png',         // 17
        '18 - Spearhead.png',       // 18
        '19 - Sol.png',             // 19
        '20 - Waypoint.png',        // 20
        '21 - Ying Yang.png',       // 21
        '22 - Helmet.png',          // 22
        '23 - Triad.png',           // 23
        '24 - Grunt Symbol.png',    // 24
        '25 - Cleave.png',          // 25
        '26 - Thor.png',            // 26
        '27 - Skull King.png',      // 27
        '28 - Triplicate.png',      // 28
        '29 - Subnova.png',         // 29
        '30 - Flaming Ninja.png',   // 30
        '31 - Double Crescent.png', // 31
        '32 - Spades.png',          // 32
        '33 - Clubs.png',           // 33
        '34 - Diamonds.png',        // 34
        '35 - Hearts.png',          // 35
        '36 - Wasp.png',            // 36
        '37 - Mark of Shame.png',   // 37
        '38 - Snake.png',           // 38
        '39 - Hawk.png',            // 39
        '40 - Lips.png',            // 40
        '41 - Capsule.png',         // 41
        '42 - Cancel.png',          // 42
        '43 - Gas Mask.png',        // 43
        '44 - Grenade.png',         // 44
        '45 - Tsantsa.png',         // 45
        '46 - Race.png',            // 46
        '47 - Valkyrie.png',        // 47
        '48 - Drone.png',           // 48
        '49 - Grunt.png',           // 49
        '50 - Grunt Head.png',      // 50
        '51 - Brute Head.png',      // 51
        '52 - Runes.png',           // 52
        '53 - Trident.png',         // 53
        '54 - Number 0.png',        // 54
        '55 - Number 1.png',        // 55
        '56 - Number 2.png',        // 56
        '57 - Number 3.png',        // 57
        '58 - Number 4.png',        // 58
        '59 - Number 5.png',        // 59
        '60 - Number 6.png',        // 60
        '61 - Number 7.png',        // 61
        '62 - Number 8.png',        // 62
        '63 - Number 9.png'         // 63
    ];

    // Background filenames (index matches EB parameter)
    const backgroundFiles = [
        '00 - Solid.png',             // 0
        '01 - Vertical Split.png',    // 1
        '02 - Horizontal Split 1.png', // 2
        '03 - Horizontal Split 2.png', // 3
        '04 - Vertical Gradient.png', // 4
        '05 - Horizontal Gradient.png', // 5
        '06 - Triple Column.png',     // 6
        '07 - Triple Row.png',        // 7
        '08 - Quadrants 1.png',       // 8
        '09 - Quadrants 2.png',       // 9
        '10 - DIagonal Slice.png',    // 10
        '11 - Cleft.png',             // 11
        '12 - X1.png',                // 12
        '13 - X2.png',                // 13
        '14 - Circle.png',            // 14
        '15 - Diamond.png',           // 15
        '16 - Cross.png',             // 16
        '17 - Square.png',            // 17
        '18 - Dual Half-Circle.png',  // 18
        '19 - Triangle.png',          // 19
        '20 - Diagonal Quadrant.png', // 20
        '21 - Three Quarters.png',    // 21
        '22 - Quarter.png',           // 22
        '23 - Four Rows 1.png',       // 23
        '24 - Four Rows 2.png',       // 24
        '25 - Split Circle.png',      // 25
        '26 - One Third.png',         // 26
        '27 - Two Thirds.png',        // 27
        '28 - Upper Field.png',       // 28
        '29 - Top and Bottom.png',    // 29
        '30 - Center Stripe.png',     // 30
        '31 - Left and Right.png'     // 31
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
            const defaultFg = 'emblems/embems/' + encodeURIComponent(foregroundFiles[37]); // Rampancy
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
        const emblemPrimary = parseInt(document.getElementById('emblemPrimary')?.value || 0);
        const emblemSecondary = parseInt(document.getElementById('emblemSecondary')?.value || 1);
        const bgPrimary = parseInt(document.getElementById('bgPrimary')?.value || 10);
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

            // Draw background with player colors
            drawBackground(ctx, bgImg, colorPalette[bgPrimary], colorPalette[bgSecondary]);

            // Draw foreground with emblem colors
            drawForeground(ctx, fgImg, colorPalette[emblemPrimary], colorPalette[emblemSecondary], emblemToggle);
        } catch (e) {
            console.error('Error rendering emblem:', e);
        }
    }

    // Draw background with player colors
    // Background PNGs use: white → Primary Player Color, blue → Secondary Player Color
    function drawBackground(ctx, img, primaryColor, secondaryColor) {
        const tempCanvas = document.createElement('canvas');
        const size = 256;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');

        // Disable image smoothing for crisp pixel edges
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(img, 0, 0, size, size);

        const imageData = tempCtx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) {
                // Fully transparent = primary player color
                data[i] = primaryColor.r;
                data[i + 1] = primaryColor.g;
                data[i + 2] = primaryColor.b;
            } else {
                // Background PNGs use blue and white:
                // - White pixels → Primary Player Color
                // - Blue pixels → Secondary Player Color
                // Detect blue vs white by checking if r,g are low (blue) or high (white)
                const primaryWeight = Math.min(r, g) / 255;
                const secondaryWeight = 1 - primaryWeight;

                data[i] = Math.round(primaryColor.r * primaryWeight + secondaryColor.r * secondaryWeight);
                data[i + 1] = Math.round(primaryColor.g * primaryWeight + secondaryColor.g * secondaryWeight);
                data[i + 2] = Math.round(primaryColor.b * primaryWeight + secondaryColor.b * secondaryWeight);
            }
            data[i + 3] = 255;
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
    }

    // Draw foreground - yellow pixels get primary color, blue pixels get secondary color
    // Smooth edge handling with proper antialiasing
    function drawForeground(ctx, img, primaryColor, secondaryColor, toggle) {
        const tempCanvas = document.createElement('canvas');
        const size = 256;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');

        // Disable image smoothing for crisp pixel edges
        tempCtx.imageSmoothingEnabled = false;
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

            // Black/near-black pixels are transparent background
            const brightness = (r + g + b) / 3;
            if (brightness < 20) {
                data[i + 3] = 0;
                continue;
            }

            // Foreground images use yellow (255,255,0) for primary and blue (0,0,255) for secondary
            // Calculate how "yellow" vs "blue" this pixel is

            // Yellow has high R and G, low B
            // Blue has low R and G, high B
            const yellowStrength = Math.min(r, g) / 255;
            const blueStrength = b / 255;
            const totalStrength = yellowStrength + blueStrength;

            if (totalStrength < 0.05) {
                // Very dark pixel - make transparent
                data[i + 3] = 0;
                continue;
            }

            // Normalize to get blend ratio
            let primaryRatio = yellowStrength / Math.max(totalStrength, 0.001);
            let secondaryRatio = blueStrength / Math.max(totalStrength, 0.001);

            // Apply toggle (hide primary color layer)
            if (toggle === 1) {
                if (primaryRatio > 0.9) {
                    data[i + 3] = 0;
                    continue;
                }
                primaryRatio = 0;
                secondaryRatio = 1;
            }

            // Calculate alpha based on total color strength for smooth edges
            const alpha = Math.round(255 * smoothstep(0.1, 0.5, totalStrength));

            // Blend primary and secondary colors
            const finalR = primaryColor.r * primaryRatio + secondaryColor.r * secondaryRatio;
            const finalG = primaryColor.g * primaryRatio + secondaryColor.g * secondaryRatio;
            const finalB = primaryColor.b * primaryRatio + secondaryColor.b * secondaryRatio;

            data[i] = Math.round(Math.min(255, finalR));
            data[i + 1] = Math.round(Math.min(255, finalG));
            data[i + 2] = Math.round(Math.min(255, finalB));
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

    // Generate an emblem as a data URL given parameters
    // Returns a promise that resolves to a data URL string
    window.generateEmblemDataUrl = async function(params) {
        const {
            P = 10,   // bgPrimary (player primary color)
            S = 0,    // bgSecondary (player secondary color)
            EP = 0,   // emblemPrimary
            ES = 1,   // emblemSecondary
            EF = 0,   // emblemForeground
            EB = 0,   // emblemBackground
            ET = 0    // emblemToggle
        } = params || {};

        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Clear with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        // Get file paths
        const fgFile = foregroundFiles[EF] || foregroundFiles[0];
        const bgFile = backgroundFiles[EB] || backgroundFiles[0];
        const fgPath = 'emblems/embems/' + encodeURIComponent(fgFile);
        const bgPath = 'emblems/backgrounds/' + encodeURIComponent(bgFile);

        try {
            const [fgImg, bgImg] = await Promise.all([
                loadImage(fgPath),
                loadImage(bgPath)
            ]);

            // Draw background with player colors
            drawBackground(ctx, bgImg, colorPalette[P] || colorPalette[0], colorPalette[S] || colorPalette[0]);

            // Draw foreground with emblem colors
            drawForeground(ctx, fgImg, colorPalette[EP] || colorPalette[0], colorPalette[ES] || colorPalette[0], ET);

            return canvas.toDataURL('image/png');
        } catch (e) {
            console.error('Error generating emblem:', e);
            return null;
        }
    }

    // Parse URL parameters and set emblem values
    // Parameters match halo2pc.com format:
    // P=primary color, S=secondary color, EP=emblem primary, ES=emblem secondary
    // EF=emblem foreground, EB=emblem background, ET=emblem toggle
    function applyUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);

        const params = {
            'EF': 'emblemForeground',
            'EB': 'emblemBackground',
            'EP': 'emblemPrimary',
            'ES': 'emblemSecondary',
            'P': 'bgPrimary',
            'S': 'bgSecondary'
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
        if (urlParams.has('EF') || urlParams.has('EB') || urlParams.has('EP')) {
            setTimeout(() => {
                if (typeof switchMainTab === 'function') {
                    switchMainTab('emblem');
                }
            }, 100);
        }
    }

    // Generate emblem URL with current settings
    window.getEmblemUrl = function() {
        const emblemForeground = document.getElementById('emblemForeground')?.value || 0;
        const emblemBackground = document.getElementById('emblemBackground')?.value || 0;
        const emblemPrimary = document.getElementById('emblemPrimary')?.value || 0;
        const emblemSecondary = document.getElementById('emblemSecondary')?.value || 1;
        const bgPrimary = document.getElementById('bgPrimary')?.value || 10;
        const bgSecondary = document.getElementById('bgSecondary')?.value || 0;
        const emblemToggle = document.getElementById('emblemToggle')?.checked ? 1 : 0;

        const params = new URLSearchParams({
            P: bgPrimary,
            S: bgSecondary,
            EP: emblemPrimary,
            ES: emblemSecondary,
            EF: emblemForeground,
            EB: emblemBackground,
            ET: emblemToggle
        });

        return window.location.origin + window.location.pathname + '?' + params.toString();
    }

    // Copy emblem URL to clipboard
    window.copyEmblemUrl = function() {
        const url = getEmblemUrl();
        navigator.clipboard.writeText(url).then(() => {
            // Show brief feedback
            const canvas = document.getElementById('emblemCanvas');
            if (canvas) {
                canvas.style.outline = '3px solid #00ff00';
                setTimeout(() => {
                    canvas.style.outline = '';
                }, 500);
            }
        }).catch(err => {
            console.error('Failed to copy URL:', err);
            // Fallback: select text in a temporary input
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        });
    }

    // Initialize everything when DOM is ready
    function init() {
        applyUrlParameters();
        initColorPickers();
        preloadImages();

        // Add click-to-copy handler to emblem canvas
        const canvas = document.getElementById('emblemCanvas');
        if (canvas) {
            canvas.style.cursor = 'pointer';
            canvas.title = 'Click to copy emblem URL';
            canvas.addEventListener('click', copyEmblemUrl);
        }
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
