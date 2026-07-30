import { ImageResponse } from 'next/og';

// V-IDENTITY step 3 - the generic KpopVerse OG card (for /verse and verse-level
// routes). Violet system, orbit + wordmark, the front-door line. No data fetch.
const VIOLET = '#7c5cfc';
const INK = '#f4f1f8';
const SUB = '#b3a7d6';
const BG = '#14111c';

/** GET /api/og/verse - the KpopVerse front-door OG (1200x630). */
export function GET(): Response {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: BG, fontFamily: 'sans-serif', padding: 72, position: 'relative' }}>
        <div style={{ position: 'absolute', top: -160, right: -120, width: 540, height: 540, borderRadius: '50%', backgroundColor: 'rgba(124,92,252,0.18)', display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', position: 'relative', width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 50, height: 25, borderRadius: '50%', border: `6px solid ${VIOLET}`, transform: 'rotate(-20deg)', display: 'flex' }} />
            <div style={{ width: 15, height: 15, borderRadius: '50%', backgroundColor: VIOLET, display: 'flex' }} />
          </div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>
            <span style={{ color: INK }}>Kpop</span><span style={{ color: VIOLET }}>Verse</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 82, fontWeight: 800, color: INK, lineHeight: 1.02, letterSpacing: -2.5 }}>Fans build their</div>
          <div style={{ display: 'flex', fontSize: 82, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2.5 }}>
            <span style={{ color: INK }}>fandom&rsquo;s&nbsp;</span><span style={{ color: VIOLET }}>home</span><span style={{ color: INK }}>&nbsp;here</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 24, color: SUB }}>Every K-pop fandom, fan-built on open data</div>
          <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.34)' }}>kpopquiz.org/verse</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
