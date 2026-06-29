import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

import { createPublicReadClient } from '@/lib/supabase/server';
import { getProfileByUsername } from '@/lib/db/queries/profiles';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { readPassportSpine, readCollectionProgress, readPassportGroupStats } from '@/lib/passport';

import type { NextRequest } from 'next/server';

// Shareable passport OG card (Workstream M, M1.5). Reuses the Workstream H OG
// renderer (next/og ImageResponse, like the other /api/og/* routes). PUBLIC data
// only (it is shared publicly): top groups + accuracy, groups mastered X/Y,
// streak, Fan Level title, the real mascot, brand pink, a loud kpopquiz.org so it
// pulls new players. No personal nudges. Cached by username + a stats hash.
const BRAND = '#E8457A';
const CREAM = '#FAF8F5';
const DARK = '#1A1714';
const MUTED = '#6B6560';

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function mascotDataUri(): string {
  try {
    const p = join(process.cwd(), 'public', 'mascot', 'mascot-celebrate.png');
    return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
  } catch {
    return '';
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
): Promise<ImageResponse> {
  const { username } = await params;
  const db = createPublicReadClient();
  const profile = await getProfileByUsername(username).catch(() => null);

  const mascot = mascotDataUri();

  if (!profile) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: CREAM }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: DARK }}>kpop<span style={{ display: 'flex', color: BRAND }}>quiz</span></div>
          <div style={{ display: 'flex', fontSize: 28, color: MUTED, marginTop: 12 }}>Make your own K-pop passport at kpopquiz.org</div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const [spine, collection, groupStats, groupsRes] = await Promise.all([
    readPassportSpine(db, profile.id),
    readCollectionProgress(db, profile.id),
    readPassportGroupStats(db, profile.id),
    Promise.resolve(db.from('groups').select('id, name, display_color')),
  ]);

  const meta = new Map<number, { name: string; color: string }>();
  for (const g of (groupsRes.data ?? []) as Array<{ id: number; name: string; display_color: string }>) {
    meta.set(g.id, { name: g.name, color: g.display_color });
  }

  const topGroups = groupStats
    .filter((s) => s.songs_played > 0)
    .sort((a, b) => b.songs_played - a.songs_played)
    .slice(0, 3)
    .map((s) => ({ name: meta.get(s.group_id)?.name ?? 'K-pop', color: meta.get(s.group_id)?.color ?? BRAND, pct: Math.round(s.accuracy * 100) }));

  const levelInfo = getLevelInfo(profile.xp);
  const title = getTitleForLevel(levelInfo.level).en;
  const displayName = profile.display_name ?? profile.username;
  const streak = spine?.streak_current ?? 0;
  const longest = spine?.streak_longest ?? 0;

  const hash = djb2(`${collection.groups_mastered}|${collection.groups_total}|${streak}|${longest}|${levelInfo.level}|${topGroups.map((g) => g.name + g.pct).join(',')}`);

  const stat = (value: string, label: string) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: DARK, lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', fontSize: 20, color: MUTED, marginTop: 6, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: CREAM, position: 'relative' }}>
        <div style={{ display: 'flex', width: '100%', height: 14, background: BRAND }} />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '48px 60px' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', width: 96, height: 96, borderRadius: 48, background: profile.avatar_bg || '#FCE8EF', color: profile.avatar_text || BRAND, alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 800 }}>
              {(displayName[0] ?? 'K').toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: 3 }}>Lv {levelInfo.level} {title}</div>
              <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, color: DARK, lineHeight: 1.1 }}>{displayName}</div>
            </div>
          </div>

          {/* stat row */}
          <div style={{ display: 'flex', gap: 72, marginTop: 48 }}>
            {stat(`${collection.groups_mastered}/${collection.groups_total}`, 'Groups mastered')}
            {stat(String(streak), 'Day streak')}
            {stat(String(longest), 'Best streak')}
          </div>

          {/* top groups accuracy */}
          {topGroups.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 44, width: 720 }}>
              {topGroups.map((g) => (
                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', width: 180, fontSize: 24, fontWeight: 700, color: DARK }}>{g.name}</div>
                  <div style={{ display: 'flex', flex: 1, height: 16, background: '#EDE8E4', borderRadius: 8 }}>
                    <div style={{ display: 'flex', width: `${g.pct}%`, height: 16, background: g.color || BRAND, borderRadius: 8 }} />
                  </div>
                  <div style={{ display: 'flex', width: 70, fontSize: 24, fontWeight: 700, color: MUTED, justifyContent: 'flex-end' }}>{g.pct}%</div>
                </div>
              ))}
            </div>
          )}

          {/* footer brand */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto' }}>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: DARK }}>kpop<span style={{ display: 'flex', color: BRAND }}>quiz.org</span></div>
            <div style={{ display: 'flex', fontSize: 24, color: MUTED, marginLeft: 20 }}>Make your own K-pop passport</div>
          </div>
        </div>

        {mascot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mascot} alt="" width={300} height={300} style={{ position: 'absolute', right: 40, bottom: 30 }} />
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        ETag: `"${username}-${hash}"`,
      },
    },
  );
}
