import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

// Lightstick mascot favicon: head (pink circle with cute face) + stick below.
// Matches the logo in logo.tsx. The head is large so it's recognizable at 16x16.
const SVG = `<svg width="512" height="512" viewBox="0 0 512 716" xmlns="http://www.w3.org/2000/svg">
  <!-- Head -->
  <circle cx="256" cy="200" r="190" fill="#D4537E"/>
  <!-- Stick -->
  <rect x="230" y="390" width="52" height="280" rx="26" fill="#B0ADA5"/>
  <!-- Left eye -->
  <circle cx="200" cy="180" r="22" fill="#FFFFFF"/>
  <circle cx="200" cy="180" r="12" fill="#0D0D0F"/>
  <circle cx="206" cy="174" r="5" fill="rgba(255,255,255,0.8)"/>
  <!-- Right eye -->
  <circle cx="312" cy="180" r="22" fill="#FFFFFF"/>
  <circle cx="312" cy="180" r="12" fill="#0D0D0F"/>
  <circle cx="318" cy="174" r="5" fill="rgba(255,255,255,0.8)"/>
  <!-- Mouth -->
  <path d="M210 260 Q256 310 302 260" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>
  <!-- Cheek blushes -->
  <circle cx="155" cy="240" r="24" fill="rgba(255,255,255,0.25)"/>
  <circle cx="357" cy="240" r="24" fill="rgba(255,255,255,0.25)"/>
</svg>`;

const PUBLIC_DIR = path.join('apps', 'quiz', 'public');

async function generate() {
  const svgBuffer = Buffer.from(SVG);

  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(PUBLIC_DIR, name));
    console.log(`Generated ${name} (${size}x${size})`);
  }

  // SVG favicon
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), SVG);
  console.log('Generated favicon.svg');

  // favicon.ico (32x32 PNG works as .ico in all modern browsers)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
  console.log('Generated favicon.ico');

  console.log('\nAll favicons generated in apps/quiz/public/');
}

generate().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
