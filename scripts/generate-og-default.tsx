// Generates public/og-default.png (1200x630)
// Run with: npx tsx scripts/generate-og-default.ts

import { ImageResponse } from 'next/og';
import { writeFileSync } from 'fs';

async function main() {
  const groups = ['BTS', 'BLACKPINK', 'Stray Kids', 'TWICE', 'aespa', 'NewJeans', 'SEVENTEEN', 'EXO'];

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: '#ED93B1' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 64, fontWeight: 500, color: '#1A1A1A' }}>kpop</span>
          <span style={{ fontSize: 64, fontWeight: 500, color: '#ED93B1' }}>quizz</span>
        </div>
        <p style={{ fontSize: 24, color: '#6B6B6B', marginTop: 12 }}>
          K-pop quizzes made by fans, played by thousands.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          {groups.map((name) => (
            <span key={name} style={{ fontSize: 16, padding: '6px 16px', borderRadius: 20, backgroundColor: '#F8F7F4', color: '#6B6B6B' }}>
              {name}
            </span>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );

  const buffer = Buffer.from(await image.arrayBuffer());
  writeFileSync('public/og-default.png', buffer);
  console.log('Generated public/og-default.png');
}

main().catch(console.error);
