import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

import { createPublicReadClient } from '@/lib/supabase/server';
import { getProfileByUsername } from '@/lib/db/queries/profiles';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { readPassportSpine, readCollectionProgress, readPassportGroupStats } from '@/lib/passport';

import type { NextRequest } from 'next/server';

// Shareable passport OG card (Workstream M, M1.5 polish). Reuses the Workstream H
// OG renderer (next/og ImageResponse). The acquisition engine: built to stop a
// scroll in Twitter / Reddit / Discord and make a stranger think "what is my
// score". PUBLIC data only. Brand DM Sans is embedded (Pretendard fallback for
// Korean glyphs) so it renders in real brand type, not a system fallback.
const BRAND = '#E8457A';
const BRAND_DK = '#B5345F';
const PINK_LT = '#FCE8EF';
const CREAM = '#FAF8F5';
const DARK = '#1A1714';
const MUTED = '#6B6560';
const TRACK = '#EDE8E4';

const FONTS_DIR = join(process.cwd(), 'public', 'fonts');
function ab(file: string): ArrayBuffer {
  const b = readFileSync(join(FONTS_DIR, file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}
// Loaded once per warm lambda. DM Sans = brand; Pretendard covers Korean glyphs.
const FONTS = [
  { name: 'DM Sans', data: ab('dm-sans-400.ttf'), weight: 400 as const, style: 'normal' as const },
  { name: 'DM Sans', data: ab('dm-sans-700.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'DM Sans', data: ab('dm-sans-800.ttf'), weight: 800 as const, style: 'normal' as const },
  { name: 'Pretendard', data: ab('Pretendard-Regular.ttf'), weight: 400 as const, style: 'normal' as const },
];

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

const FAMILY = 'DM Sans, Pretendard';

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
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: CREAM, fontFamily: FAMILY }}>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, color: DARK }}>kpop<span style={{ display: 'flex', color: BRAND }}>quiz</span></div>
          <div style={{ display: 'flex', fontSize: 30, color: MUTED, marginTop: 14 }}>Make your own K-pop passport</div>
        </div>
      ),
      { width: 1200, height: 630, fonts: FONTS },
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
  const titleEn = getTitleForLevel(levelInfo.level).en;
  const titleKr = getTitleForLevel(levelInfo.level).kr;
  const streak = spine?.streak_current ?? 0;
  const longest = spine?.streak_longest ?? 0;

  const hash = djb2(`${collection.groups_mastered}|${collection.groups_total}|${streak}|${longest}|${levelInfo.level}|${topGroups.map((g) => g.name + g.pct).join(',')}`);

  const heroStat = (value: string, label: string, accent?: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: accent ? BRAND : DARK, lineHeight: 1, letterSpacing: -2 }}>{value}</div>
      <div style={{ display: 'flex', fontSize: 19, fontWeight: 700, color: MUTED, marginTop: 8, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: CREAM, fontFamily: FAMILY, position: 'relative' }}>
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: '100%', height: 12, background: BRAND }} />

        {/* Left: the hook + stats */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '64px 0 56px 64px' }}>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, color: BRAND, textTransform: 'uppercase', letterSpacing: 5 }}>K-pop Passport</div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginTop: 18 }}>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, color: DARK, lineHeight: 0.95, letterSpacing: -2 }}>{titleEn}</div>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: BRAND_DK, paddingBottom: 8 }}>{titleKr}</div>
          </div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: MUTED, marginTop: 8 }}>@{profile.username} {'·'} Lv {levelInfo.level}</div>

          <div style={{ display: 'flex', gap: 64, marginTop: 'auto' }}>
            {heroStat(`${collection.groups_mastered}/${collection.groups_total}`, 'Groups mastered', true)}
            {heroStat(String(streak), 'Day streak')}
            {heroStat(String(longest), 'Best ever')}
          </div>

          {topGroups.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 36, width: 560 }}>
              {topGroups.map((g) => (
                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', width: 150, fontSize: 24, fontWeight: 700, color: DARK }}>{g.name}</div>
                  <div style={{ display: 'flex', flex: 1, height: 16, background: TRACK, borderRadius: 8 }}>
                    <div style={{ display: 'flex', width: `${g.pct}%`, height: 16, background: g.color || BRAND, borderRadius: 8 }} />
                  </div>
                  <div style={{ display: 'flex', width: 66, fontSize: 24, fontWeight: 800, color: DARK, justifyContent: 'flex-end' }}>{g.pct}%</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 36 }}>
            <div style={{ display: 'flex', fontSize: 38, fontWeight: 800, color: DARK }}>kpop<span style={{ display: 'flex', color: BRAND }}>quiz.org</span></div>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: MUTED, marginLeft: 18 }}>Can you beat it?</div>
          </div>
        </div>

        {/* Right: mascot hero on a pink field */}
        <div style={{ display: 'flex', width: 420, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', position: 'absolute', top: 95, width: 420, height: 420, borderRadius: 210, background: PINK_LT }} />
          {mascot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mascot} alt="" width={380} height={380} style={{ position: 'absolute', top: 150 }} />
          )}
          <div style={{ display: 'flex', position: 'absolute', top: 70, right: 56, background: BRAND, color: '#fff', fontSize: 22, fontWeight: 800, padding: '10px 20px', borderRadius: 30, textTransform: 'uppercase', letterSpacing: 1 }}>
            What is your score?
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: FONTS,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        ETag: `"${username}-${hash}"`,
      },
    },
  );
}
