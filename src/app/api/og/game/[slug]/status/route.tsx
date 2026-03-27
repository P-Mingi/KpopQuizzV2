import { ImageResponse } from 'next/og';

import { getGameBySlug } from '@/lib/db/queries/games';

import type { NextRequest } from 'next/server';
import type { GameContent } from '@/lib/db/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) return new Response('Not found', { status: 404 });

  const content = game.content as GameContent;
  const matchups = content?.matchups ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          padding: '40px 48px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Pink top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#ED93B1' }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 500, color: '#1A1A1A' }}>kpop</span>
            <span style={{ fontSize: 22, fontWeight: 500, color: '#ED93B1' }}>quiz</span>
          </div>
          <p style={{ fontSize: 28, fontWeight: 500, color: '#1A1A1A', margin: '12px 0 4px' }}>{game.title as string}</p>
          <p style={{ fontSize: 18, color: '#888780' }}>
            {(game.play_count as number) > 0 ? `${(game.play_count as number).toLocaleString('en-US')} fans have voted` : 'Be the first to play!'}
          </p>
        </div>

        {/* Matchup bars */}
        {matchups.slice(0, 8).map((m, i) => {
          const total = m.votes_a + m.votes_b;
          const pctA = total > 0 ? Math.round((m.votes_a / total) * 100) : 50;
          const pctB = 100 - pctA;
          return (
            <div
              key={i}
              style={{
                background: '#F8F7F4',
                borderRadius: 16,
                padding: '14px 18px',
                marginBottom: 10,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 500, marginBottom: 8, color: '#1A1A1A' }}>
                <span>{m.option_a}</span>
                <span>{m.option_b}</span>
              </div>
              <div style={{ height: 32, borderRadius: 8, overflow: 'hidden', display: 'flex', gap: 3 }}>
                <div style={{ width: `${pctA}%`, background: '#ED93B1', borderRadius: '8px 0 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pctA >= 15 && <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{pctA}%</span>}
                </div>
                <div style={{ width: `${pctB}%`, background: '#B5D4F4', borderRadius: '0 8px 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pctB >= 15 && <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{pctB}%</span>}
                </div>
              </div>
            </div>
          );
        })}

        {matchups.length > 8 && (
          <p style={{ textAlign: 'center', fontSize: 16, color: '#9B9B9B', marginTop: 8 }}>
            + {matchups.length - 8} more matchups
          </p>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #E8E6E1' }}>
          <p style={{ fontSize: 17, color: '#888780', margin: '0 0 4px' }}>Do you agree? Play and see your results</p>
          <p style={{ fontSize: 17, fontWeight: 500, color: '#ED93B1' }}>kpopquiz.org/g/{slug}</p>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
