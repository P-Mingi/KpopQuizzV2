import { ImageResponse } from 'next/og';

import { decodeBoard } from '@/lib/tier-list/share-state';

import type { NextRequest } from 'next/server';

// The tier-list share image. Reads the whole board from the URL (?d=<base64>),
// so it needs NO database this phase. A route handler, never an indexed page.
// Item tiles render as initials-on-gradient (not remote photos) so the image
// always composes without a per-face cross-origin fetch; a later phase can
// prefetch covers to data URIs. Every text node sets display:flex (satori).

export const runtime = 'edge';

const BG = '#FAF8F5';
const INK = '#1A1714';
const BRAND = '#E8457A';

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || name.slice(0, 2).toUpperCase();
}

export async function GET(request: NextRequest): Promise<ImageResponse> {
  const d = request.nextUrl.searchParams.get('d') ?? '';
  const story = request.nextUrl.searchParams.get('variant') === 'story';
  const board = decodeBoard(d);
  const width = 1080;
  const height = story ? 1920 : 1350;

  const title = board?.title ?? 'K-pop Tier List';
  const byId = new Map((board?.items ?? []).map((i) => [i.id, i]));
  const tiers = board?.tiers ?? [];
  const placements = board?.placements ?? {};

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: BG, fontFamily: 'sans-serif', padding: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 28, overflow: 'hidden', boxShadow: '0 18px 44px rgba(232,69,122,0.2)', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(120deg, #E8457A, #A83A8F 55%, #7B3FA8)', color: '#fff', padding: '34px 36px' }}>
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.9 }}>KpopQuiz Tier List</div>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 900, letterSpacing: -1, marginTop: 8 }}>{title}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', padding: 24, gap: 14, flex: 1 }}>
            {tiers.map((t) => {
              const ids = (placements[t.label] ?? []).slice(0, story ? 9 : 7);
              const extra = (placements[t.label] ?? []).length - ids.length;
              return (
                <div key={t.label} style={{ display: 'flex', alignItems: 'stretch', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(26,23,20,0.1)', minHeight: 96 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 96, background: t.color, color: '#fff', fontSize: 40, fontWeight: 900 }}>{t.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, flexWrap: 'wrap', flex: 1, background: '#fff' }}>
                    {ids.map((id) => {
                      const it = byId.get(id);
                      return (
                        <div key={id} style={{ display: 'flex', flexDirection: 'column', width: 78, height: 78, borderRadius: 12, background: 'linear-gradient(135deg,#f6d9e6,#e7d4f2)', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: 'rgba(26,23,20,0.45)' }}>{initials(it?.name ?? '?')}</div>
                        </div>
                      );
                    })}
                    {extra > 0 && <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, color: '#9E998F' }}>+{extra}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F3F1ED', padding: '18px 30px' }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: INK }}>kpopquiz.org</div>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: BRAND }}>Make yours</div>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
