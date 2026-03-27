// Generates public/apple-touch-icon.png (180x180)
// Run with: npx tsx scripts/generate-apple-icon.tsx

import { ImageResponse } from 'next/og';
import { writeFileSync } from 'fs';

async function main() {
  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          fontFamily: 'sans-serif',
          borderRadius: 36,
        }}
      >
        <span style={{ fontSize: 80, fontWeight: 600, color: '#ED93B1' }}>Q</span>
      </div>
    ),
    { width: 180, height: 180 },
  );

  const buffer = Buffer.from(await image.arrayBuffer());
  writeFileSync('public/apple-touch-icon.png', buffer);
  console.log('Generated public/apple-touch-icon.png');
}

main().catch(console.error);
