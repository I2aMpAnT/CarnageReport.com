#!/usr/bin/env node
/**
 * Emblem Pre-Renderer
 * Generates static PNG files for Halo 2 emblems
 *
 * Usage: node generate-emblems.js [options]
 *   --all          Generate all possible combinations (warning: ~36M files)
 *   --from-games   Generate emblems found in gameshistory.json
 *   --params P,S,EP,ES,EF,EB,ET   Generate single emblem with specific params
 *
 * Output: emblems/rendered/P{P}-S{S}-EP{EP}-ES{ES}-EF{EF}-EB{EB}-ET{ET}.png
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Color palette
const colorPalette = [
    { r: 255, g: 255, b: 255 }, // 0 White
    { r: 110, g: 110, b: 110 }, // 1 Steel
    { r: 189, g: 43,  b: 44  }, // 2 Red
    { r: 244, g: 123, b: 32  }, // 3 Orange
    { r: 244, g: 209, b: 45  }, // 4 Gold
    { r: 158, g: 169, b: 90  }, // 5 Olive
    { r: 35,  g: 145, b: 46  }, // 6 Green
    { r: 36,  g: 87,  b: 70  }, // 7 Sage
    { r: 22,  g: 160, b: 160 }, // 8 Cyan
    { r: 55,  g: 115, b: 123 }, // 9 Teal
    { r: 32,  g: 113, b: 178 }, // 10 Cobalt
    { r: 45,  g: 60,  b: 180 }, // 11 Blue
    { r: 108, g: 80,  b: 182 }, // 12 Violet
    { r: 148, g: 39,  b: 132 }, // 13 Purple
    { r: 248, g: 155, b: 200 }, // 14 Pink
    { r: 156, g: 15,  b: 68  }, // 15 Crimson
    { r: 120, g: 73,  b: 43  }, // 16 Brown
    { r: 175, g: 144, b: 87  }  // 17 Tan
];

const foregroundFiles = [
    '00 - Seventh Column.png', '01 - Bullseye.png', '02 - Vortex.png', '03 - Halt.png',
    '04 - Spartan.png', '05 - Da Bomb.png', '06 - Trinity.png', '07 - Delta.png',
    '08 - Rampancy.png', '09 - Sergeant.png', '10 - Phoenix.png', '11 - Champion.png',
    '12 - Jolly Roger.png', '13 - Marathon.png', '14 - Cube.png', '15 - Radioactive .png',
    '16 - Smiley.png', '17 - Frowney.png', '18 - Spearhead.png', '19 - Sol.png',
    '20 - Waypoint.png', '21 - Ying Yang.png', '22 - Helmet.png', '23 - Triad.png',
    '24 - Grunt Symbol.png', '25 - Cleave.png', '26 - Thor.png', '27 - Skull King.png',
    '28 - Triplicate.png', '29 - Subnova.png', '30 - Flaming Ninja.png', '31 - Double Crescent.png',
    '32 - Spades.png', '33 - Clubs.png', '34 - Diamonds.png', '35 - Hearts.png',
    '36 - Wasp.png', '37 - Mark of Shame.png', '38 - Snake.png', '39 - Hawk.png',
    '40 - Lips.png', '41 - Capsule.png', '42 - Cancel.png', '43 - Gas Mask.png',
    '44 - Grenade.png', '45 - Tsantsa.png', '46 - Race.png', '47 - Valkyrie.png',
    '48 - Drone.png', '49 - Grunt.png', '50 - Grunt Head.png', '51 - Brute Head.png',
    '52 - Runes.png', '53 - Trident.png', '54 - Number 0.png', '55 - Number 1.png',
    '56 - Number 2.png', '57 - Number 3.png', '58 - Number 4.png', '59 - Number 5.png',
    '60 - Number 6.png', '61 - Number 7.png', '62 - Number 8.png', '63 - Number 9.png'
];

const backgroundFiles = [
    '00 - Solid.png', '01 - Vertical Split.png', '02 - Horizontal Split 1.png',
    '03 - Horizontal Split 2.png', '04 - Vertical Gradient.png', '05 - Horizontal Gradient.png',
    '06 - Triple Column.png', '07 - Triple Row.png', '08 - Quadrants 1.png',
    '09 - Quadrants 2.png', '10 - DIagonal Slice.png', '11 - Cleft.png',
    '12 - X1.png', '13 - X2.png', '14 - Circle.png', '15 - Diamond.png',
    '16 - Cross.png', '17 - Square.png', '18 - Dual Half-Circle.png', '19 - Triangle.png',
    '20 - Diagonal Quadrant.png', '21 - Three Quarters.png', '22 - Quarter.png', '23 - Four Rows 1.png',
    '24 - Four Rows 2.png', '25 - Split Circle.png', '26 - One Third.png', '27 - Two Thirds.png',
    '28 - Upper Field.png', '29 - Top and Bottom.png', '30 - Center Stripe.png', '31 - Left and Right.png'
];

const BASE_DIR = __dirname;
const OUTPUT_DIR = path.join(BASE_DIR, 'emblems', 'rendered');
const EMBLEM_DIR = path.join(BASE_DIR, 'emblems', 'embems');
const BG_DIR = path.join(BASE_DIR, 'emblems', 'backgrounds');

// Image cache
const imageCache = {};

async function loadImageCached(filePath) {
    if (imageCache[filePath]) {
        return imageCache[filePath];
    }
    const img = await loadImage(filePath);
    imageCache[filePath] = img;
    return img;
}

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function drawBackground(ctx, img, primaryColor, secondaryColor) {
    const tempCanvas = createCanvas(256, 256);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0, 256, 256);

    const imageData = tempCtx.getImageData(0, 0, 256, 256);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const a = data[i + 3];

        if (a === 0) {
            data[i] = primaryColor.r;
            data[i + 1] = primaryColor.g;
            data[i + 2] = primaryColor.b;
        } else {
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

function drawForeground(ctx, img, primaryColor, secondaryColor, toggle) {
    const tempCanvas = createCanvas(256, 256);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0, 256, 256);

    const imageData = tempCtx.getImageData(0, 0, 256, 256);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a === 0) continue;

        const brightness = (r + g + b) / 3;
        if (brightness < 20) {
            data[i + 3] = 0;
            continue;
        }

        const yellowStrength = Math.min(r, g) / 255;
        const blueStrength = b / 255;
        const totalStrength = yellowStrength + blueStrength;

        if (totalStrength < 0.05) {
            data[i + 3] = 0;
            continue;
        }

        let primaryRatio = yellowStrength / Math.max(totalStrength, 0.001);
        let secondaryRatio = blueStrength / Math.max(totalStrength, 0.001);

        if (toggle === 1) {
            if (primaryRatio > 0.9) {
                data[i + 3] = 0;
                continue;
            }
            primaryRatio = 0;
            secondaryRatio = 1;
        }

        const alpha = Math.round(255 * smoothstep(0.1, 0.5, totalStrength));
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

async function renderEmblem(params) {
    const { P = 10, S = 0, EP = 0, ES = 1, EF = 0, EB = 0, ET = 0 } = params;

    const canvas = createCanvas(256, 256);
    const ctx = canvas.getContext('2d');

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);

    const fgFile = foregroundFiles[EF] || foregroundFiles[0];
    const bgFile = backgroundFiles[EB] || backgroundFiles[0];
    const fgPath = path.join(EMBLEM_DIR, fgFile);
    const bgPath = path.join(BG_DIR, bgFile);

    try {
        const [fgImg, bgImg] = await Promise.all([
            loadImageCached(fgPath),
            loadImageCached(bgPath)
        ]);

        drawBackground(ctx, bgImg, colorPalette[P] || colorPalette[0], colorPalette[S] || colorPalette[0]);
        drawForeground(ctx, fgImg, colorPalette[EP] || colorPalette[0], colorPalette[ES] || colorPalette[0], ET);

        return canvas.toBuffer('image/png');
    } catch (e) {
        console.error('Error rendering emblem:', e);
        return null;
    }
}

function getOutputFilename(params) {
    const { P, S, EP, ES, EF, EB, ET } = params;
    return `P${P}-S${S}-EP${EP}-ES${ES}-EF${EF}-EB${EB}-ET${ET}.png`;
}

function parseEmblemUrl(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        return {
            P: parseInt(urlObj.searchParams.get('P') || 10),
            S: parseInt(urlObj.searchParams.get('S') || 0),
            EP: parseInt(urlObj.searchParams.get('EP') || 0),
            ES: parseInt(urlObj.searchParams.get('ES') || 1),
            EF: parseInt(urlObj.searchParams.get('EF') || 0),
            EB: parseInt(urlObj.searchParams.get('EB') || 0),
            ET: parseInt(urlObj.searchParams.get('ET') || 0)
        };
    } catch (e) {
        // Try parsing as query string only
        const match = url.match(/[?&]EF=(\d+)/);
        if (match) {
            const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : url);
            return {
                P: parseInt(params.get('P') || 10),
                S: parseInt(params.get('S') || 0),
                EP: parseInt(params.get('EP') || 0),
                ES: parseInt(params.get('ES') || 1),
                EF: parseInt(params.get('EF') || 0),
                EB: parseInt(params.get('EB') || 0),
                ET: parseInt(params.get('ET') || 0)
            };
        }
        return null;
    }
}

async function generateSingle(params) {
    console.log(`Generating emblem: P=${params.P} S=${params.S} EP=${params.EP} ES=${params.ES} EF=${params.EF} EB=${params.EB} ET=${params.ET}`);

    const buffer = await renderEmblem(params);
    if (!buffer) {
        console.error('Failed to render emblem');
        return;
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const filename = getOutputFilename(params);
    const outputPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved: ${outputPath}`);
}

async function generateFromGames() {
    const gamesPath = path.join(BASE_DIR, 'gameshistory.json');
    if (!fs.existsSync(gamesPath)) {
        console.error('gameshistory.json not found');
        return;
    }

    const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
    const emblemUrls = new Set();

    // Extract unique emblem URLs from all games
    for (const game of games) {
        if (game.detailed_stats) {
            for (const player of game.detailed_stats) {
                if (player.emblem_url) {
                    emblemUrls.add(player.emblem_url);
                }
            }
        }
    }

    console.log(`Found ${emblemUrls.size} unique emblems in games history`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let generated = 0;
    let skipped = 0;

    for (const url of emblemUrls) {
        const params = parseEmblemUrl(url);
        if (!params) {
            console.log(`Skipping invalid URL: ${url}`);
            skipped++;
            continue;
        }

        const filename = getOutputFilename(params);
        const outputPath = path.join(OUTPUT_DIR, filename);

        if (fs.existsSync(outputPath)) {
            skipped++;
            continue;
        }

        const buffer = await renderEmblem(params);
        if (buffer) {
            fs.writeFileSync(outputPath, buffer);
            generated++;
            if (generated % 10 === 0) {
                console.log(`Generated ${generated} emblems...`);
            }
        }
    }

    console.log(`Done! Generated: ${generated}, Skipped: ${skipped}`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Emblem Pre-Renderer - Generates static PNG files for Halo 2 emblems

Usage: node generate-emblems.js [options]

Options:
  --from-games              Generate emblems found in gameshistory.json
  --params P,S,EP,ES,EF,EB,ET  Generate single emblem with specific params
  --help, -h                Show this help message

Output: emblems/rendered/P{P}-S{S}-EP{EP}-ES{ES}-EF{EF}-EB{EB}-ET{ET}.png

Examples:
  node generate-emblems.js --from-games
  node generate-emblems.js --params 10,0,0,1,37,5,0
        `);
        return;
    }

    if (args.includes('--from-games')) {
        await generateFromGames();
        return;
    }

    const paramsIndex = args.indexOf('--params');
    if (paramsIndex !== -1 && args[paramsIndex + 1]) {
        const values = args[paramsIndex + 1].split(',').map(Number);
        const params = {
            P: values[0] || 10,
            S: values[1] || 0,
            EP: values[2] || 0,
            ES: values[3] || 1,
            EF: values[4] || 0,
            EB: values[5] || 0,
            ET: values[6] || 0
        };
        await generateSingle(params);
        return;
    }

    // Default: generate from games
    console.log('No options specified. Use --help for usage info.');
    console.log('Running --from-games by default...\n');
    await generateFromGames();
}

main().catch(console.error);
