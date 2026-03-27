// Generates all logo PNG assets and favicon.ico
// Run with: npx tsx scripts/generate-logo-assets.tsx

import { ImageResponse } from 'next/og';
import { writeFileSync } from 'fs';

// "kpop quizz" full logo - used for apple-touch-icon and logo PNGs
function FullLogo() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FBEAF0',
        borderRadius: '22%',
        fontFamily: 'sans-serif',
      }}
    >
      <span style={{ fontSize: '25%', fontWeight: 500, color: '#72243E', lineHeight: 1.2 }}>kpop</span>
      <span style={{ fontSize: '25%', fontWeight: 500, color: '#ED93B1', lineHeight: 1.2 }}>quizz</span>
    </div>
  );
}

// "kq" monogram - used for favicon
function FaviconMark() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FBEAF0',
        borderRadius: '22%',
        fontFamily: 'sans-serif',
      }}
    >
      <span style={{ fontSize: '52%', fontWeight: 500, color: '#ED93B1', letterSpacing: '-0.05em' }}>kq</span>
    </div>
  );
}

async function generatePng(element: React.ReactElement, size: number, path: string) {
  const image = new ImageResponse(element, { width: size, height: size });
  const buffer = Buffer.from(await image.arrayBuffer());
  writeFileSync(path, buffer);
  console.log(`Generated ${path} (${size}x${size})`);
}

// Build a minimal ICO with 16, 32, 48px layers from a single 48px PNG
function buildIco(pngBuffers: { size: number; data: Buffer }[]): Buffer {
  const count = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  const dataOffset = headerSize + entrySize * count;

  // Calculate total size
  let totalDataSize = 0;
  for (const buf of pngBuffers) totalDataSize += buf.data.length;

  const ico = Buffer.alloc(dataOffset + totalDataSize);

  // ICO header
  ico.writeUInt16LE(0, 0);     // reserved
  ico.writeUInt16LE(1, 2);     // type: ICO
  ico.writeUInt16LE(count, 4); // image count

  let currentDataOffset = dataOffset;
  for (let i = 0; i < count; i++) {
    const { size, data } = pngBuffers[i]!;
    const entryOffset = headerSize + entrySize * i;

    ico.writeUInt8(size >= 256 ? 0 : size, entryOffset);      // width
    ico.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);  // height
    ico.writeUInt8(0, entryOffset + 2);                         // color palette
    ico.writeUInt8(0, entryOffset + 3);                         // reserved
    ico.writeUInt16LE(1, entryOffset + 4);                      // color planes
    ico.writeUInt16LE(32, entryOffset + 6);                     // bits per pixel
    ico.writeUInt32LE(data.length, entryOffset + 8);            // data size
    ico.writeUInt32LE(currentDataOffset, entryOffset + 12);     // data offset

    data.copy(ico, currentDataOffset);
    currentDataOffset += data.length;
  }

  return ico;
}

async function main() {
  // Full logo PNGs
  await generatePng(<FullLogo />, 512, 'public/logo-512.png');
  await generatePng(<FullLogo />, 192, 'public/logo-192.png');
  await generatePng(<FullLogo />, 96, 'public/logo-96.png');

  // Apple touch icon (180x180 with full logo)
  await generatePng(<FullLogo />, 180, 'public/apple-touch-icon.png');

  // Favicon PNGs for ICO
  const sizes = [16, 32, 48];
  const pngBuffers: { size: number; data: Buffer }[] = [];

  for (const size of sizes) {
    const image = new ImageResponse(<FaviconMark />, { width: size, height: size });
    const data = Buffer.from(await image.arrayBuffer());
    pngBuffers.push({ size, data });
    console.log(`Generated favicon layer ${size}x${size}`);
  }

  // Build ICO
  const ico = buildIco(pngBuffers);
  writeFileSync('public/favicon.ico', ico);
  console.log('Generated public/favicon.ico');

  console.log('\nAll logo assets generated.');
}

main().catch(console.error);
