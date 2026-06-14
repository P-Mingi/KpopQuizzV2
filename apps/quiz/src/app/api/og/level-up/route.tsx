import { ImageResponse } from 'next/og';

import type { NextRequest } from 'next/server';

// L2 - shareable level-up card. Reuses the H5 @vercel/og infra. Renders
// "I reached {Title} on kpopquiz.org" + the celebrate rabbit + brand. Params:
// ?title=<fan title> &level=<n>. 1200x630.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const origin = new URL(request.url).origin;
  const title = (searchParams.get('title') ?? 'New Fan').slice(0, 40);
  const levelRaw = searchParams.get('level') ?? '';
  const level = /^\d{1,3}$/.test(levelRaw) ? levelRaw : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(150deg, #E8457A 0%, #B5345F 60%, #7C1D3F 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* celebrate rabbit */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${origin}/mascot/mascot-celebrate.png`}
          width={210}
          height={210}
          alt=""
          style={{ marginBottom: 18, filter: 'drop-shadow(0 10px 26px rgba(0,0,0,0.3))' }}
        />
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: 6, opacity: 0.9 }}>
          LEVEL UP
        </div>
        <div style={{ display: 'flex', fontSize: 40, marginTop: 8, opacity: 0.95 }}>
          I reached
        </div>
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, marginTop: 2 }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 34, marginTop: 18, opacity: 0.92 }}>
          {level ? `Level ${level} on ` : 'on '}
          <span style={{ fontWeight: 800, marginLeft: 8 }}>kpopquiz.org</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
