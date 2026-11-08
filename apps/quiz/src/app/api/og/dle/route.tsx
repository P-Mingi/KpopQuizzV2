import { ImageResponse } from 'next/og';

import { parseShareImage } from '@/lib/dle/share-image';
import { dleOpen } from '@/lib/site/hub/daily-guess';

import type { NextRequest } from 'next/server';

// Daily games step 4 (v2 section 11.6): the share image of a game page and of a shared result. 1200x630: the brand, what the game asks, the bars of right cells of each guess. It never knows the answer. 404 on any
// build but the hub's and while the flag is off: same as any unknown URL.
export const dynamic = 'force-dynamic';

const PINK = '#D13A6E';
const ORANGE = '#C2410C';
// The bars count right cells: green like the Right cell of the games (--hub-dle-right), a lighter green under the best guess.
const RIGHT = '#15803D';
const RIGHT_SOFT = '#86C79B';

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const v = dleOpen() ? parseShareImage(searchParams.get('game'), searchParams.get('locale'), searchParams.get('r')) : null;
  if (!v) return new Response('Not found', { status: 404 });
  const accent = v.game.universe === 'kpop' ? PINK : ORANGE;
  const ground = v.game.universe === 'kpop' ? '#FCE8EF' : '#FFF1E6';
  const line = v.counts.length ? (v.locale === 'fr' ? `${v.counts.length} essais` : `${v.counts.length} guesses`) : (v.locale === 'fr' ? 'Une énigme par jour, la même pour tout le monde' : 'One puzzle a day, the same for everyone');
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: ground, color: '#1F1B17', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, letterSpacing: -3 }}>
            {v.game.brand.slice(0, -3)}<span style={{ color: accent }}>dle</span>
          </div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, marginTop: 8 }}>{v.game.guess[v.locale]}</div>
          <div style={{ display: 'flex', fontSize: 30, color: '#57514B', marginTop: 12 }}>{line}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 200 }}>
          {v.counts.map((k, i) => (
            <div key={i} style={{ display: 'flex', width: 44, marginRight: 14, borderRadius: 10, height: Math.max(18, Math.round((k / v.max) * 200)), background: k === v.max ? RIGHT : RIGHT_SOFT }} />
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700 }}>{`bunnyverse.org${v.game.path}`}</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
