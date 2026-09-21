import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createPNG(width, height, isMaskable = false) {
  // RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.40 : 0.45);
  const innerRadius = width * (isMaskable ? 0.34 : 0.38);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background
      if (isMaskable) {
        // Solid dark background #121212
        buffer[idx] = 18;
        buffer[idx + 1] = 18;
        buffer[idx + 2] = 18;
        buffer[idx + 3] = 255;
      } else {
        // Rounded badge on transparent/dark
        if (dist <= radius) {
          buffer[idx] = 18;
          buffer[idx + 1] = 18;
          buffer[idx + 2] = 18;
          buffer[idx + 3] = 255;
        } else {
          buffer[idx] = 0;
          buffer[idx + 1] = 0;
          buffer[idx + 2] = 0;
          buffer[idx + 3] = 0;
        }
      }

      // Spotify Green emblem (#1ED760 -> R:30, G:215, B:96)
      if (dist <= innerRadius) {
        // Draw green circle
        buffer[idx] = 30;
        buffer[idx + 1] = 215;
        buffer[idx + 2] = 96;
        buffer[idx + 3] = 255;

        // Draw iconic curved sound waves (3 black arcs)
        const angles = [-0.18, 0, 0.18]; // wave positions
        const waveWidth = width * 0.05;
        for (let i = 0; i < 3; i++) {
          const arcR = innerRadius * (0.45 + i * 0.22);
          const arcDy = dy - (i - 1) * (innerRadius * 0.24);
          const arcDist = Math.sqrt(dx * dx + arcDy * arcDy);
          if (Math.abs(arcDist - arcR) < waveWidth / 2 && Math.abs(dx) < arcR * 0.72) {
            buffer[idx] = 18;
            buffer[idx + 1] = 18;
            buffer[idx + 2] = 18;
            buffer[idx + 3] = 255;
          }
        }
      }
    }
  }

  // PNG Construction
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type RGBA (6)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw Scanlines with Filter type 0 (None)
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0; // Filter 0
    buffer.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

// CRC32 implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate PNGs
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));

// 2. Generate icon.svg
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="120" fill="#121212"/>
  <circle cx="256" cy="256" r="190" fill="#1ED760"/>
  <path d="M150 200 C220 170, 310 175, 362 205" stroke="#121212" stroke-width="26" stroke-linecap="round" fill="none"/>
  <path d="M170 256 C230 230, 305 235, 345 258" stroke="#121212" stroke-width="22" stroke-linecap="round" fill="none"/>
  <path d="M195 310 C240 290, 295 295, 330 312" stroke="#121212" stroke-width="18" stroke-linecap="round" fill="none"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);

console.log('Successfully generated all PWA icons!');
