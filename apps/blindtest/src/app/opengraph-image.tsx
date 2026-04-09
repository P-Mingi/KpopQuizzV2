import { ImageResponse } from 'next/og';

// Site-wide OG image rendered at build/request time by Next.js.
// https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image

export const alt = 'K-pop Blindtest - Can you name that song?';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D0D0F',
          color: '#E8E6E0',
          fontFamily: 'sans-serif',
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(237,147,177,0.18), transparent 50%), radial-gradient(circle at 80% 70%, rgba(45,27,78,0.6), transparent 55%)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            marginBottom: 28,
          }}
        >
          <span style={{ color: '#E8E6E0' }}>kpop</span>
          <span style={{ color: '#ED93B1' }}>blind</span>
          <span style={{ color: '#E8E6E0' }}>test</span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 64,
            fontWeight: 700,
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.05,
          }}
        >
          Can you name
        </p>
        <p
          style={{
            fontSize: 64,
            fontWeight: 700,
            margin: '0 0 36px',
            textAlign: 'center',
            lineHeight: 1.05,
            color: '#ED93B1',
          }}
        >
          that song?
        </p>

        {/* Stats strip */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            fontSize: 22,
            color: '#B4B2A9',
            marginTop: 8,
          }}
        >
          <span>22,000+ songs</span>
          <span style={{ color: '#5A584E' }}>·</span>
          <span>230+ artists</span>
          <span style={{ color: '#5A584E' }}>·</span>
          <span>Play free</span>
        </div>

        {/* Footer URL */}
        <p style={{ fontSize: 20, color: '#7A786E', marginTop: 56 }}>kpopblindtest.com</p>
      </div>
    ),
    size,
  );
}
