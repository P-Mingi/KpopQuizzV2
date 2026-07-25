import { ImageResponse } from 'next/og';

import type { NextRequest } from 'next/server';

// Workstream P: result-card OG image (photos allowed per owner decision). Member
// photo on the left, group-accented result panel on the right.
export async function GET(request: NextRequest): Promise<ImageResponse> {
  const sp = request.nextUrl.searchParams;
  const group = sp.get('group') || 'K-pop';
  const member = sp.get('member') || 'a member';
  const pct = sp.get('pct') || '88';
  const accent = sp.get('accent') || '#E8457A';
  const photoRel = sp.get('photo') || '';
  const photo = photoRel ? `${request.nextUrl.origin}${encodeURI(photoRel)}` : '';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0f0f14', fontFamily: 'sans-serif' }}>
        <div style={{ width: '46%', height: '100%', display: 'flex', background: '#1a1a22' }}>
          {photo
            ? <img src={photo} width={552} height={630} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            : <div style={{ width: '100%', height: '100%', background: accent }} />}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 56px', background: `linear-gradient(160deg, ${accent}22, #0f0f14 70%)` }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accent }}>
            Which {group} member are you?
          </div>
          <div style={{ display: 'flex', fontSize: 34, color: '#c7c7d1', marginTop: 26 }}>You got</div>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{member}</div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: accent, color: '#ffffff', fontSize: 32, fontWeight: 800, padding: '12px 26px', borderRadius: 100 }}>
              {pct}% match
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#8a8a99', marginTop: 'auto' }}>kpopquiz.org</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
