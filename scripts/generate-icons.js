import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve('public');

// 1. Vector SVG matching NomaticLogo.tsx exactly:
// Circular #1ed760 background with the black 'N' stroke M27 73 V27 L73 73 V27
const svgIconAny = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <!-- Nomatic circular green brand badge -->
  <circle cx="256" cy="256" r="244" fill="#1ed760" />
  <!-- Centered geometric 'N' matching NomaticLogo (w-[58%] h-[58%]) -->
  <g transform="translate(107.52, 107.52) scale(2.9696)">
    <path 
      d="M27 73 V27 L73 73 V27" 
      fill="none" 
      stroke="#000000" 
      stroke-width="15" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>`;

// 2. Android Maskable Icon (safe zone is central 80% circle)
// Full-bleed #1ed760 background so when cropped into circle/squircle/teardrop by Android launchers,
// the entire surface is Nomatic brand green with the black 'N' inside the safe zone.
const svgMaskable = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <!-- Full-bleed background for adaptive masking -->
  <rect width="512" height="512" fill="#1ed760" />
  <!-- Geometric 'N' scaled to fit inside the 80% safe zone (~400x400) -->
  <g transform="translate(143.2, 143.2) scale(2.256)">
    <path 
      d="M27 73 V27 L73 73 V27" 
      fill="none" 
      stroke="#000000" 
      stroke-width="15" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>`;

// 3. Apple Touch Icon (180x180 for iOS Safari)
// iOS crops with rounded corners; full bleed #1ed760 with centered 'N' inside safe area
const svgAppleTouch = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="100%" height="100%">
  <rect width="180" height="180" fill="#1ed760" />
  <g transform="translate(45, 45) scale(0.9)">
    <path 
      d="M27 73 V27 L73 73 V27" 
      fill="none" 
      stroke="#000000" 
      stroke-width="15" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>`;

async function generate() {
  console.log('Generating PWA icons matching in-app NomaticLogo...');

  // Save public/icon.svg
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), svgIconAny, 'utf8');
  console.log('Wrote public/icon.svg');

  // Generate public/pwa-512x512.png (purpose: "any")
  await sharp(Buffer.from(svgIconAny))
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'));
  console.log('Wrote public/pwa-512x512.png');

  // Generate public/pwa-192x192.png (purpose: "any")
  await sharp(Buffer.from(svgIconAny))
    .resize(192, 192)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'));
  console.log('Wrote public/pwa-192x192.png');

  // Generate public/pwa-maskable-512x512.png (purpose: "maskable")
  await sharp(Buffer.from(svgMaskable))
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'));
  console.log('Wrote public/pwa-maskable-512x512.png');

  // Generate public/apple-touch-icon.png (180x180)
  await sharp(Buffer.from(svgAppleTouch))
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Wrote public/apple-touch-icon.png');

  // Generate public/favicon-32x32.png and 16x16
  const fav32 = await sharp(Buffer.from(svgIconAny))
    .resize(32, 32)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png'), fav32);

  // Generate public/favicon.ico (standard 32x32 PNG as ico)
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), fav32);
  console.log('Wrote public/favicon.ico and favicon-32x32.png');

  console.log('All icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
