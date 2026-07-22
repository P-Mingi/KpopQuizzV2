import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

import { createPublicReadClient } from '@/lib/supabase/server';
import { getProfileByUsername } from '@/lib/db/queries/profiles';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { readPassportSpine, readPassportGroupStats } from '@/lib/passport';
import { PASSPORT_THEMES } from '@/lib/passport-themes';
import { NAME_ACCENTS } from '@/lib/passport-flair';
import { badgeIconFor } from '@/lib/badges';

import type { NextRequest } from 'next/server';

// F2c C5 - the Fan Card, portrait 1080x1350. Same next/og infra as the OG
// passport route. PUBLIC passport fields only, so any username's card can be
// viewed. Dark card, theme-colored top bar + avatar ring, flair-colored name,
// LV + title, "stan since - bias" line, ult heart chips, up to 3 stat cells
// (best-group accuracy, streak, top badge), footer. Cells hide when empty; a
// brand-new account still reads as intentional (name + level + footer).
//
// QR is intentionally absent: no QR library is in the tree and the spec forbids
// adding a dependency for an off-by-default feature. ?qr=1 is accepted but has
// no effect in v1.
const BG = '#1C1521';
const CELL = '#2A2233';
const TEXT = '#F5F0EB';
const MUTED = '#A89F96';
const DIM = '#6E6577';
const BRAND = '#E8457A';

const FONTS_DIR = join(process.cwd(), 'public', 'fonts');
function ab(file: string): ArrayBuffer {
  const b = readFileSync(join(FONTS_DIR, file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}
const FONTS = [
  { name: 'DM Sans', data: ab('dm-sans-400.ttf'), weight: 400 as const, style: 'normal' as const },
  { name: 'DM Sans', data: ab('dm-sans-700.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'DM Sans', data: ab('dm-sans-800.ttf'), weight: 800 as const, style: 'normal' as const },
  { name: 'Pretendard', data: ab('Pretendard-Regular.ttf'), weight: 400 as const, style: 'normal' as const },
];
const FAMILY = 'DM Sans, Pretendard';

function fileDataUri(rel: string, mime: string): string {
  try {
    return `data:${mime};base64,${readFileSync(join(process.cwd(), 'public', rel)).toString('base64')}`;
  } catch {
    return '';
  }
}

// Concrete hex for the card (no CSS vars in satori). Default name accent is the
// light card text, not var(--txt1).
function accentHex(key: string | null): string {
  const c = NAME_ACCENTS[key ?? 'default']?.color ?? TEXT;
  return c.startsWith('#') ? c : TEXT;
}
function themeHex(theme: string | null | undefined): string {
  return PASSPORT_THEMES[theme ?? 'default']?.swatch ?? BRAND;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
): Promise<ImageResponse> {
  const { username } = await params;
  const db = createPublicReadClient();
  const profile = await getProfileByUsername(username).catch(() => null);

  if (!profile) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FAMILY }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: TEXT }}>kpop<span style={{ display: 'flex', color: BRAND }}>quiz</span></div>
          <div style={{ display: 'flex', fontSize: 28, color: MUTED, marginTop: 14 }}>Make your own Fan Card</div>
        </div>
      ),
      { width: 1080, height: 1350, fonts: FONTS },
    );
  }

  const [spine, groupStats, groupsRes, badgesRes] = await Promise.all([
    readPassportSpine(db, profile.id),
    readPassportGroupStats(db, profile.id),
    Promise.resolve(db.from('groups').select('id, name, slug, display_color')),
    Promise.resolve(db.from('user_badges').select('badge_id, earned_at').eq('user_id', profile.id).order('earned_at', { ascending: false })),
  ]);

  const gmeta = new Map<number, { name: string; color: string }>();
  const slugToName = new Map<string, string>();
  for (const g of (groupsRes.data ?? []) as Array<{ id: number; name: string; slug: string; display_color: string }>) {
    gmeta.set(g.id, { name: g.name, color: g.display_color });
    slugToName.set(g.slug, g.name);
  }

  const levelInfo = getLevelInfo(profile.xp);
  const title = getTitleForLevel(levelInfo.level);
  const theme = themeHex(spine?.profile_theme);
  const nameColor = accentHex(profile.name_accent);
  const streak = spine?.streak_current ?? 0;
  const bias = spine?.bias?.trim() || null;
  const stanSince = profile.stan_since ?? null;

  // ult_groups are slugs; show the real group name on each chip.
  const ults = ((spine?.ult_groups ?? []) as string[])
    .slice(0, 3)
    .map((slug) => slugToName.get(slug) ?? slug);

  // Best tracked group (highest plays), for the accuracy cell.
  const best = groupStats
    .filter((s) => s.songs_played > 0)
    .sort((a, b) => b.songs_played - a.songs_played)[0];
  const bestCell = best
    ? { name: gmeta.get(best.group_id)?.name ?? 'K-pop', pct: Math.round(best.accuracy * 100) }
    : null;

  // Top badge: pinned first, else the most-recently-earned badge that has art.
  const earned = (badgesRes.data ?? []) as Array<{ badge_id: string; earned_at: string }>;
  let badgeIcon: string | null = null;
  if (profile.pinned_badge_id) badgeIcon = badgeIconFor(profile.pinned_badge_id);
  if (!badgeIcon) {
    for (const b of earned) {
      const icon = badgeIconFor(b.badge_id);
      if (icon) { badgeIcon = icon; break; }
    }
  }
  const badgeUri = badgeIcon ? fileDataUri(badgeIcon.replace(/^\//, ''), 'image/png') : '';

  const logoUri = fileDataUri('logo-primary.svg', 'image/svg+xml');
  const displayName = profile.display_name ?? profile.username;
  const avatarUrl = profile.avatar_kind !== 'preset' ? profile.avatar_url : null;
  const initials = (displayName || profile.username).slice(0, 2).toUpperCase();

  const metaLine = [stanSince ? `stan since ${stanSince}` : null, bias ? `bias ${bias}` : null]
    .filter(Boolean)
    .join('  ·  ');

  const cells: Array<{ label: string; value: React.ReactNode }> = [];
  if (bestCell) cells.push({ label: bestCell.name, value: `${bestCell.pct}%` });
  if (streak > 0) cells.push({ label: 'Day streak', value: String(streak) });
  if (badgeUri) cells.push({ label: 'Top badge', value: (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={badgeUri} alt="" width={72} height={72} />
  ) });

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: BG, fontFamily: FAMILY, position: 'relative', padding: '0 0 64px' }}>
        {/* Theme-colored top bar */}
        <div style={{ display: 'flex', width: '100%', height: 10, background: theme }} />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '56px 72px 0', alignItems: 'center' }}>
          {/* Eyebrow + logo */}
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: theme, textTransform: 'uppercase', letterSpacing: 6 }}>Fan Card</div>
            {logoUri
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUri} alt="" width={64} height={64} style={{ borderRadius: 14 }} />
              : <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: TEXT }}>kpop<span style={{ display: 'flex', color: BRAND }}>quiz</span></div>}
          </div>

          {/* Identity + cells, vertically centered so sparse and full profiles
              both read balanced (no huge gap when there are few elements). */}
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Avatar in theme ring */}
          <div style={{ display: 'flex', width: 148, height: 148, borderRadius: 74, background: theme, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', width: 132, height: 132, borderRadius: 66, overflow: 'hidden', background: profile.avatar_bg, alignItems: 'center', justifyContent: 'center' }}>
              {avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatarUrl} alt="" width={132} height={132} style={{ objectFit: 'cover' }} />
                : <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: profile.avatar_text }}>{initials}</div>}
            </div>
          </div>

          {/* Name in flair accent */}
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: nameColor, marginTop: 28, letterSpacing: -1, textAlign: 'center' }}>{displayName}</div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: MUTED, marginTop: 6 }}>LV {levelInfo.level} {'·'} {title.en}</div>
          {metaLine && <div style={{ display: 'flex', fontSize: 26, fontWeight: 500, color: DIM, marginTop: 12 }}>{metaLine}</div>}

          {/* Ult heart chips */}
          {ults.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              {ults.map((name) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, border: `1px solid ${theme}`, color: TEXT, fontSize: 22, fontWeight: 600 }}>
                  <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 3, background: theme, transform: 'rotate(45deg)' }} />
                  {name}
                </div>
              ))}
            </div>
          )}

          {/* Stat cells (centered; only the ones that exist) */}
          {cells.length > 0 && (
            <div style={{ display: 'flex', gap: 18, marginTop: 52, justifyContent: 'center' }}>
              {cells.map((c, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 236, height: 168, background: CELL, borderRadius: 22 }}>
                  <div style={{ display: 'flex', fontSize: 54, fontWeight: 800, color: TEXT, alignItems: 'center', justifyContent: 'center', minHeight: 72 }}>{c.value}</div>
                  <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: MUTED, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1, maxWidth: 200, overflow: 'hidden' }}>{c.label}</div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center', marginTop: 40 }}>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: MUTED }}>kpopquiz.org/u/{profile.username}</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: FONTS,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
