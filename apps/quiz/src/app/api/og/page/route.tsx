import { ImageResponse } from 'next/og';

import type { NextRequest } from 'next/server';

const BRAND = '#E8457A';

export async function GET(request: NextRequest): Promise<ImageResponse> {
  const sp = request.nextUrl.searchParams;
  const title = sp.get('title') || 'KpopQuiz';
  const subtitle = sp.get('subtitle') || 'Play K-pop Quizzes Made by Fans';
  const accent = sp.get('accent') || BRAND;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: `linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)`,
          fontFamily: 'sans-serif',
          padding: '60px 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: '#fff',
              fontWeight: 800,
            }}
          >
            K
          </div>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#ffffff99',
              letterSpacing: '1px',
            }}
          >
            KPOPQUIZ.ORG
          </span>
        </div>

        <div
          style={{
            fontSize: '52px',
            fontWeight: 800,
            color: '#fff',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '900px',
            marginBottom: '24px',
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: '24px',
            color: '#ffffffbb',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            gap: '24px',
            fontSize: '18px',
            color: '#ffffff66',
          }}
        >
          <span>Quizzes</span>
          <span style={{ color: accent }}>{'/'}</span>
          <span>Blind Tests</span>
          <span style={{ color: accent }}>{'/'}</span>
          <span>Games</span>
          <span style={{ color: accent }}>{'/'}</span>
          <span>Rankings</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
