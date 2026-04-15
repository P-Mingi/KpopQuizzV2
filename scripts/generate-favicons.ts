import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const SVG = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="220" fill="#D4537E"/>
  <circle cx="190" cy="230" r="28" fill="#0D0D0F"/>
  <circle cx="200" cy="218" r="10" fill="rgba(255,255,255,0.7)"/>
  <circle cx="322" cy="230" r="28" fill="#0D0D0F"/>
  <circle cx="332" cy="218" r="10" fill="rgba(255,255,255,0.7)"/>
  <path d="M190 300 Q256 360 322 300" fill="none" stroke="#0D0D0F" stroke-width="16" stroke-linecap="round"/>
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
