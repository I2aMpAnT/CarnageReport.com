/**
 * Cloudflare Worker - Halo 2 Emblem Generator
 *
 * Generates emblems on-demand as PNG images
 *
 * URL format: /P{P}-S{S}-EP{EP}-ES{ES}-EF{EF}-EB{EB}-ET{ET}.png
 * Example: /P10-S0-EP0-ES1-EF37-EB5-ET0.png
 */

// Your GitHub Pages site URL
const SITE_BASE_URL = 'https://i2ampant.github.io/CarnageReport.com';

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

// ============== PNG Decoder ==============
// Minimal PNG decoder for Cloudflare Workers

function decodePNG(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  let offset = 8; // Skip PNG signature

  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  let imageData = null;
  const chunks = [];

  while (offset < data.length) {
    const length = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    const chunkData = data.slice(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = (chunkData[0] << 24) | (chunkData[1] << 16) | (chunkData[2] << 8) | chunkData[3];
      height = (chunkData[4] << 24) | (chunkData[5] << 16) | (chunkData[6] << 8) | chunkData[7];
      bitDepth = chunkData[8];
      colorType = chunkData[9];
    } else if (type === 'IDAT') {
      chunks.push(chunkData);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  // Concatenate IDAT chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const compressed = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, pos);
    pos += chunk.length;
  }

  // Decompress using DecompressionStream (available in Workers)
  const decompressed = inflate(compressed);

  // Unfilter and extract RGBA data
  const bytesPerPixel = colorType === 6 ? 4 : (colorType === 2 ? 3 : 1);
  const scanlineLength = width * bytesPerPixel + 1;
  imageData = new Uint8ClampedArray(width * height * 4);

  let srcOffset = 0;
  let prevRow = new Uint8Array(width * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[srcOffset++];
    const row = new Uint8Array(width * bytesPerPixel);

    for (let x = 0; x < width * bytesPerPixel; x++) {
      const raw = decompressed[srcOffset++];
      const a = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const b = prevRow[x];
      const c = x >= bytesPerPixel ? prevRow[x - bytesPerPixel] : 0;

      let value;
      switch (filterType) {
        case 0: value = raw; break;
        case 1: value = (raw + a) & 0xFF; break;
        case 2: value = (raw + b) & 0xFF; break;
        case 3: value = (raw + Math.floor((a + b) / 2)) & 0xFF; break;
        case 4: value = (raw + paethPredictor(a, b, c)) & 0xFF; break;
        default: value = raw;
      }
      row[x] = value;
    }

    // Convert to RGBA
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      if (colorType === 6) { // RGBA
        imageData[dstIdx] = row[x * 4];
        imageData[dstIdx + 1] = row[x * 4 + 1];
        imageData[dstIdx + 2] = row[x * 4 + 2];
        imageData[dstIdx + 3] = row[x * 4 + 3];
      } else if (colorType === 2) { // RGB
        imageData[dstIdx] = row[x * 3];
        imageData[dstIdx + 1] = row[x * 3 + 1];
        imageData[dstIdx + 2] = row[x * 3 + 2];
        imageData[dstIdx + 3] = 255;
      }
    }

    prevRow = row;
  }

  return { width, height, data: imageData };
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Simple inflate implementation for zlib data
function inflate(data) {
  // Skip zlib header (2 bytes)
  const deflateData = data.slice(2, -4); // Also skip adler32 checksum

  // Use built-in DecompressionStream if available, otherwise simple inflate
  const result = [];
  let pos = 0;

  while (pos < deflateData.length) {
    const bfinal = deflateData[pos] & 1;
    const btype = (deflateData[pos] >> 1) & 3;

    if (btype === 0) {
      // Uncompressed block
      pos++;
      const len = deflateData[pos] | (deflateData[pos + 1] << 8);
      pos += 4; // Skip len and nlen
      for (let i = 0; i < len; i++) {
        result.push(deflateData[pos++]);
      }
    } else {
      // For compressed blocks, we need a full deflate implementation
      // This is a simplified version - for production use pako or similar
      throw new Error('Compressed PNG blocks require full deflate implementation');
    }

    if (bfinal) break;
  }

  return new Uint8Array(result);
}

// ============== PNG Encoder ==============

function encodePNG(width, height, rgba) {
  const chunks = [];

  // IHDR chunk
  const ihdr = new Uint8Array(13);
  ihdr[0] = (width >> 24) & 0xFF;
  ihdr[1] = (width >> 16) & 0xFF;
  ihdr[2] = (width >> 8) & 0xFF;
  ihdr[3] = width & 0xFF;
  ihdr[4] = (height >> 24) & 0xFF;
  ihdr[5] = (height >> 16) & 0xFF;
  ihdr[6] = (height >> 8) & 0xFF;
  ihdr[7] = height & 0xFF;
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(createChunk('IHDR', ihdr));

  // IDAT chunk (uncompressed for simplicity)
  const rawData = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx] = rgba[srcIdx];
      rawData[dstIdx + 1] = rgba[srcIdx + 1];
      rawData[dstIdx + 2] = rgba[srcIdx + 2];
      rawData[dstIdx + 3] = rgba[srcIdx + 3];
    }
  }

  // Compress with zlib (uncompressed blocks for simplicity)
  const compressed = deflateUncompressed(rawData);
  chunks.push(createChunk('IDAT', compressed));

  // IEND chunk
  chunks.push(createChunk('IEND', new Uint8Array(0)));

  // Assemble PNG file
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const totalLength = signature.length + chunks.reduce((sum, c) => sum + c.length, 0);
  const png = new Uint8Array(totalLength);

  let offset = 0;
  png.set(signature, offset);
  offset += signature.length;

  for (const chunk of chunks) {
    png.set(chunk, offset);
    offset += chunk.length;
  }

  return png;
}

function createChunk(type, data) {
  const chunk = new Uint8Array(12 + data.length);
  const length = data.length;

  // Length
  chunk[0] = (length >> 24) & 0xFF;
  chunk[1] = (length >> 16) & 0xFF;
  chunk[2] = (length >> 8) & 0xFF;
  chunk[3] = length & 0xFF;

  // Type
  chunk[4] = type.charCodeAt(0);
  chunk[5] = type.charCodeAt(1);
  chunk[6] = type.charCodeAt(2);
  chunk[7] = type.charCodeAt(3);

  // Data
  chunk.set(data, 8);

  // CRC32
  const crc = crc32(chunk.slice(4, 8 + data.length));
  chunk[8 + data.length] = (crc >> 24) & 0xFF;
  chunk[9 + data.length] = (crc >> 16) & 0xFF;
  chunk[10 + data.length] = (crc >> 8) & 0xFF;
  chunk[11 + data.length] = crc & 0xFF;

  return chunk;
}

function deflateUncompressed(data) {
  // Create uncompressed zlib stream
  const maxBlockSize = 65535;
  const numBlocks = Math.ceil(data.length / maxBlockSize);
  const output = new Uint8Array(2 + data.length + numBlocks * 5 + 4);

  let pos = 0;

  // Zlib header (no compression)
  output[pos++] = 0x78; // CMF
  output[pos++] = 0x01; // FLG

  for (let i = 0; i < numBlocks; i++) {
    const start = i * maxBlockSize;
    const end = Math.min(start + maxBlockSize, data.length);
    const blockLen = end - start;
    const isLast = i === numBlocks - 1;

    output[pos++] = isLast ? 1 : 0; // BFINAL + BTYPE=00
    output[pos++] = blockLen & 0xFF;
    output[pos++] = (blockLen >> 8) & 0xFF;
    output[pos++] = ~blockLen & 0xFF;
    output[pos++] = (~blockLen >> 8) & 0xFF;

    output.set(data.slice(start, end), pos);
    pos += blockLen;
  }

  // Adler32 checksum
  const adler = adler32(data);
  output[pos++] = (adler >> 24) & 0xFF;
  output[pos++] = (adler >> 16) & 0xFF;
  output[pos++] = (adler >> 8) & 0xFF;
  output[pos++] = adler & 0xFF;

  return output.slice(0, pos);
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function adler32(data) {
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return (b << 16) | a;
}

// ============== Image Processing ==============

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function processBackground(data, width, height, primaryColor, secondaryColor) {
  const result = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const a = data[i + 3];

    if (a === 0) {
      result[i] = primaryColor.r;
      result[i + 1] = primaryColor.g;
      result[i + 2] = primaryColor.b;
    } else {
      const primaryWeight = Math.min(r, g) / 255;
      const secondaryWeight = 1 - primaryWeight;
      result[i] = Math.round(primaryColor.r * primaryWeight + secondaryColor.r * secondaryWeight);
      result[i + 1] = Math.round(primaryColor.g * primaryWeight + secondaryColor.g * secondaryWeight);
      result[i + 2] = Math.round(primaryColor.b * primaryWeight + secondaryColor.b * secondaryWeight);
    }
    result[i + 3] = 255;
  }

  return result;
}

function processForeground(data, width, height, primaryColor, secondaryColor, toggle) {
  const result = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) {
      result[i + 3] = 0;
      continue;
    }

    const brightness = (r + g + b) / 3;
    if (brightness < 20) {
      result[i + 3] = 0;
      continue;
    }

    const yellowStrength = Math.min(r, g) / 255;
    const blueStrength = b / 255;
    const totalStrength = yellowStrength + blueStrength;

    if (totalStrength < 0.05) {
      result[i + 3] = 0;
      continue;
    }

    let primaryRatio = yellowStrength / Math.max(totalStrength, 0.001);
    let secondaryRatio = blueStrength / Math.max(totalStrength, 0.001);

    if (toggle === 1) {
      if (primaryRatio > 0.9) {
        result[i + 3] = 0;
        continue;
      }
      primaryRatio = 0;
      secondaryRatio = 1;
    }

    const alpha = Math.round(255 * smoothstep(0.1, 0.5, totalStrength));

    result[i] = Math.round(Math.min(255, primaryColor.r * primaryRatio + secondaryColor.r * secondaryRatio));
    result[i + 1] = Math.round(Math.min(255, primaryColor.g * primaryRatio + secondaryColor.g * secondaryRatio));
    result[i + 2] = Math.round(Math.min(255, primaryColor.b * primaryRatio + secondaryColor.b * secondaryRatio));
    result[i + 3] = alpha;
  }

  return result;
}

function composite(bg, fg, width, height) {
  const result = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < bg.length; i += 4) {
    const fgA = fg[i + 3] / 255;

    if (fgA === 0) {
      result[i] = bg[i];
      result[i + 1] = bg[i + 1];
      result[i + 2] = bg[i + 2];
      result[i + 3] = bg[i + 3];
    } else {
      result[i] = Math.round(fg[i] * fgA + bg[i] * (1 - fgA));
      result[i + 1] = Math.round(fg[i + 1] * fgA + bg[i + 1] * (1 - fgA));
      result[i + 2] = Math.round(fg[i + 2] * fgA + bg[i + 2] * (1 - fgA));
      result[i + 3] = 255;
    }
  }

  return result;
}

// ============== URL Parsing ==============

function parseParams(url) {
  const urlObj = new URL(url);
  const path = urlObj.pathname;

  // Try path format: /P10-S0-EP0-ES1-EF37-EB5-ET0.png
  const pathMatch = path.match(/P(\d+)-S(\d+)-EP(\d+)-ES(\d+)-EF(\d+)-EB(\d+)-ET(\d+)/);
  if (pathMatch) {
    return {
      P: parseInt(pathMatch[1]),
      S: parseInt(pathMatch[2]),
      EP: parseInt(pathMatch[3]),
      ES: parseInt(pathMatch[4]),
      EF: parseInt(pathMatch[5]),
      EB: parseInt(pathMatch[6]),
      ET: parseInt(pathMatch[7])
    };
  }

  // Try query params
  const params = urlObj.searchParams;
  if (params.has('EF') || params.has('P')) {
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

// ============== Main Handler ==============

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        }
      });
    }

    const params = parseParams(request.url);

    if (!params) {
      return new Response(
        'Halo 2 Emblem Generator\n\n' +
        'Usage: /P{P}-S{S}-EP{EP}-ES{ES}-EF{EF}-EB{EB}-ET{ET}.png\n' +
        'Example: /P10-S0-EP0-ES1-EF37-EB5-ET0.png',
        { status: 400, headers: { 'Content-Type': 'text/plain' } }
      );
    }

    const { P, S, EP, ES, EF, EB, ET } = params;

    // Validate
    if (EF < 0 || EF >= foregroundFiles.length || EB < 0 || EB >= backgroundFiles.length) {
      return new Response('Invalid emblem/background index', { status: 400 });
    }
    if (P < 0 || P >= 18 || S < 0 || S >= 18 || EP < 0 || EP >= 18 || ES < 0 || ES >= 18) {
      return new Response('Invalid color index (0-17)', { status: 400 });
    }

    // Check cache first
    const cacheKey = `P${P}-S${S}-EP${EP}-ES${ES}-EF${EF}-EB${EB}-ET${ET}`;
    const cache = caches.default;
    const cacheUrl = new URL(request.url);
    cacheUrl.pathname = '/' + cacheKey + '.png';

    let response = await cache.match(cacheUrl);
    if (response) {
      return response;
    }

    try {
      // Fetch source images
      const fgUrl = `${SITE_BASE_URL}/emblems/embems/${encodeURIComponent(foregroundFiles[EF])}`;
      const bgUrl = `${SITE_BASE_URL}/emblems/backgrounds/${encodeURIComponent(backgroundFiles[EB])}`;

      const [fgResponse, bgResponse] = await Promise.all([
        fetch(fgUrl),
        fetch(bgUrl)
      ]);

      if (!fgResponse.ok || !bgResponse.ok) {
        throw new Error('Failed to fetch source images');
      }

      // Decode PNGs
      const [fgBuffer, bgBuffer] = await Promise.all([
        fgResponse.arrayBuffer(),
        bgResponse.arrayBuffer()
      ]);

      const fgImage = decodePNG(fgBuffer);
      const bgImage = decodePNG(bgBuffer);

      // Process images
      const bgProcessed = processBackground(bgImage.data, bgImage.width, bgImage.height,
        colorPalette[P], colorPalette[S]);
      const fgProcessed = processForeground(fgImage.data, fgImage.width, fgImage.height,
        colorPalette[EP], colorPalette[ES], ET);

      // Composite
      const final = composite(bgProcessed, fgProcessed, 256, 256);

      // Encode PNG
      const png = encodePNG(256, 256, final);

      response = new Response(png, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*',
        }
      });

      // Cache the response
      ctx.waitUntil(cache.put(cacheUrl, response.clone()));

      return response;

    } catch (error) {
      // On any error, try to serve pre-rendered from GitHub Pages
      const prerenderedUrl = `${SITE_BASE_URL}/emblems/rendered/${cacheKey}.png`;
      const fallbackResponse = await fetch(prerenderedUrl);

      if (fallbackResponse.ok) {
        return new Response(fallbackResponse.body, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};
