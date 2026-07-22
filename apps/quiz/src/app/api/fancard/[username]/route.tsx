import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

import { createPublicReadClient } from '@/lib/supabase/server';
import { getProfileByUsername } from '@/lib/db/queries/profiles';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { readPassportSpine, readPassportGroupStats, readCollectionProgress } from '@/lib/passport';
import { AVATAR_PRESETS } from '@/lib/passport-flair';
import { formatCount } from '@/lib/utils';

import type { NextRequest } from 'next/server';

// F2c C5 (v2) - the Fan Card, redesigned as a "concert ticket", portrait
// 1080x1350 (reference 300x375 scaled x3.6). Same next/og infra as the OG
// passport route; PUBLIC passport fields only, so any username's card renders.
//
// Layout (top to bottom): magenta top bar with "FAN CARD" + signup number, an
// avatar+identity row (name in the user's flair font/accent, LV pill, optional
// SINCE pill), an optional bias line, up to 3 ult heart chips, a dashed stat
// strip (MASTERED / TOTAL PLAYS / {GROUP} ACCURACY), and a footer with the
// profile URL + a decorative barcode. Every module hides cleanly when its data
// is absent so a brand-new account still reads as an intentional ticket.
//
// REAL DATA ONLY: number = actual signup rank, mastered/plays/accuracy are
// lifetime stats, flair accent + font are the user's own choices.
const S = 3.6;
const px = (n: number): number => Math.round(n * S);

// Palette (concrete hex; satori has no CSS vars).
const BG = '#141019';
const MAGENTA = '#E8457A';
const BAR_TXT = '#3d0a1e';
const NUM_TXT = '#7a1f42';
const AVA_BG = '#241b30';
const AVA_FALLBACK_BG = '#3a2d44';
const CHIP_BORDER = '#453a52';
const CHIP_MUTED = '#c9bfd4';
const BIAS_TXT = '#b3a6c4';
const ULT_TXT = '#ffb3cd';
const ULT_BG = '#2b1a24';
const DASH = '#453a52';
const LABEL = '#8d819c';
const STAT_TXT = '#f2edf5';
const GOLD = '#e8b64c';
const FOOTER_TXT = '#8d819c';
const FOOTER_BORDER = '#2a2233';
const BARCODE = '#c9bfd4';

// Flair accents, brightened so each clears ~4.5:1 on the near-black #141019 card
// (the on-page mid-ramp hues are too dark here). Keyed by profile.name_accent.
const ACCENT_BRIGHT: Record<string, string> = {
  default: '#ff7eb0',
  pink: '#ff6ba3',
  purple: '#a9a2f5',
  blue: '#6bb4f5',
  teal: '#34d6a0',
  amber: '#f0b23c',
  coral: '#ff8a5c',
};
function flairAccent(key: string | null): string {
  return ACCENT_BRIGHT[key ?? 'default'] ?? ACCENT_BRIGHT.default!;
}

// Flair font -> bundled family. default = Syne (the card's display face).
const FLAIR_FAMILY: Record<string, string> = {
  default: 'Syne',
  serif: 'Gelasio',
  mono: 'JetBrains Mono',
};
function flairFamily(key: string | null): { family: string; weight: 700 | 800 } {
  const fam = FLAIR_FAMILY[key ?? 'default'] ?? 'Syne';
  // Only Syne is bundled at 800; the serif/mono statics are 700.
  return { family: `${fam}, Pretendard`, weight: fam === 'Syne' ? 800 : 700 };
}

const FONTS_DIR = join(process.cwd(), 'public', 'fonts');
function ab(file: string): ArrayBuffer {
  const b = readFileSync(join(FONTS_DIR, file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}
// Loaded once at module scope and reused across requests.
const FONTS = [
  { name: 'Syne', data: ab('Syne-Bold.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'Syne', data: ab('Syne-ExtraBold.ttf'), weight: 800 as const, style: 'normal' as const },
  { name: 'DM Sans', data: ab('dm-sans-400.ttf'), weight: 400 as const, style: 'normal' as const },
  { name: 'DM Sans', data: ab('dm-sans-700.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'DM Sans', data: ab('dm-sans-800.ttf'), weight: 800 as const, style: 'normal' as const },
  { name: 'Gelasio', data: ab('Gelasio-Bold.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'JetBrains Mono', data: ab('JetBrainsMono-Bold.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'Pretendard', data: ab('Pretendard-Regular.ttf'), weight: 400 as const, style: 'normal' as const },
];
const BODY_FAMILY = 'DM Sans, Pretendard';

function Heart({ size }: { size: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'flex' }}>
      <path d="M12 21s-7.5-4.9-7.5-10.4A4.1 4.1 0 0112 7.3a4.1 4.1 0 017.5 3.3C19.5 16.1 12 21 12 21z" fill={ULT_TXT} />
    </svg>
  );
}

function Barcode(): React.ReactElement {
  const widths = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: px(2) }}>
      {widths.map((w, i) => (
        <div key={i} style={{ display: 'flex', width: px(w), height: px(14), background: BARCODE }} />
      ))}
    </div>
  );
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
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: 'Syne' }}>
          <div style={{ display: 'flex', fontSize: px(30), fontWeight: 800, color: STAT_TXT, letterSpacing: 4 }}>
            FAN CARD
          </div>
          <div style={{ display: 'flex', fontSize: px(13), color: LABEL, marginTop: px(10), fontFamily: BODY_FAMILY }}>
            kpopquiz.org
          </div>
        </div>
      ),
      { width: 1080, height: 1350, fonts: FONTS },
    );
  }

  const [spine, groupStats, collection, groupsRes, rankRes] = await Promise.all([
    readPassportSpine(db, profile.id),
    readPassportGroupStats(db, profile.id),
    readCollectionProgress(db, profile.id),
    Promise.resolve(db.from('groups').select('id, name, slug, display_color')),
    // Signup number = how many profiles existed up to and including this one.
    Promise.resolve(
      db.from('profiles').select('id', { count: 'exact', head: true }).lte('created_at', profile.created_at),
    ),
  ]);

  const gmeta = new Map<number, string>();
  const slugToName = new Map<string, string>();
  for (const g of (groupsRes.data ?? []) as Array<{ id: number; name: string; slug: string; display_color: string }>) {
    gmeta.set(g.id, g.name);
    slugToName.set(g.slug, g.name);
  }

  const levelInfo = getLevelInfo(profile.xp);
  const title = getTitleForLevel(levelInfo.level);
  const accent = flairAccent(profile.name_accent);
  const nameFont = flairFamily(profile.name_font);
  const bias = spine?.bias?.trim() || null;
  const stanSince = profile.stan_since ?? null;

  const rank = rankRes.count ?? 1;
  const rankStr = rank <= 9999 ? String(rank).padStart(4, '0') : String(rank);

  // ult_groups are slugs; show the real group name on each chip (max 3).
  const ults = ((spine?.ult_groups ?? []) as string[])
    .slice(0, 3)
    .map((slug) => slugToName.get(slug) ?? slug);

  // Best tracked group (most plays), for the accuracy cell.
  const best = groupStats
    .filter((s) => s.songs_played > 0)
    .sort((a, b) => b.songs_played - a.songs_played)[0];
  const bestCell = best
    ? { name: gmeta.get(best.group_id) ?? 'K-pop', pct: Math.round(best.accuracy * 100) }
    : null;

  const totalPlays = (spine?.quizzes_played ?? 0) + (spine?.blindtests_played ?? 0);

  const displayName = profile.display_name ?? profile.username;
  const initials = (displayName || profile.username).slice(0, 2).toUpperCase();

  // Name size shrinks to fit the available width (avatar + gap eat ~277px of the
  // 936px inner card). CJK glyphs are ~2x as wide as Latin, so weight them.
  const nameWeightedLen = [...displayName].reduce(
    (a, c) => a + (/[ᄀ-ᇿ぀-ヿ㄰-㆏가-힣一-鿿]/.test(c) ? 1.9 : 1),
    0,
  );
  // Divisor tuned to Syne ExtraBold's wide advances against the ~659px of inner
  // card width left after the avatar (a 12-char name lands near px(17)).
  const nameSize = Math.max(px(13), Math.min(px(30), Math.floor(720 / Math.max(nameWeightedLen, 1))));

  // Avatar: custom = ref image; photo = avatar_url image; else initials on the
  // preset color (real choice) or the neutral fallback tile.
  const kind = (profile.avatar_kind as 'photo' | 'preset' | 'custom' | null) ?? 'photo';
  const avatarImg =
    kind === 'custom' && profile.avatar_ref ? profile.avatar_ref
    : kind !== 'preset' && profile.avatar_url ? profile.avatar_url
    : null;
  const preset = kind === 'preset' && profile.avatar_ref ? AVATAR_PRESETS[profile.avatar_ref] : undefined;

  const AV = px(64);
  const AV_INNER = AV - px(2.5) * 2;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: BG, fontFamily: BODY_FAMILY, position: 'relative' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: MAGENTA, padding: `${px(13)}px ${px(20)}px ${px(11)}px` }}>
          <div style={{ display: 'flex', fontFamily: 'Syne', fontSize: px(16), fontWeight: 800, color: BAR_TXT, letterSpacing: px(16) * 0.06 }}>
            FAN CARD
          </div>
          <div style={{ display: 'flex', fontFamily: 'Syne', fontSize: px(13), fontWeight: 700, color: NUM_TXT }}>
            NO. {rankStr}
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: `${px(18)}px ${px(20)}px 0` }}>
          {/* Avatar + identity */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', width: AV, height: AV, borderRadius: px(18), border: `${px(2.5)}px solid ${MAGENTA}`, background: AVA_BG, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {avatarImg
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatarImg} alt="" width={AV_INNER} height={AV_INNER} style={{ width: AV_INNER, height: AV_INNER, objectFit: 'cover', borderRadius: px(15) }} />
                : (
                  <div style={{ display: 'flex', width: AV_INNER, height: AV_INNER, borderRadius: px(15), background: preset?.bg ?? AVA_FALLBACK_BG, alignItems: 'center', justifyContent: 'center', fontSize: px(24), fontWeight: 700, color: preset?.fg ?? '#ffffff' }}>
                    {initials}
                  </div>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: px(13) }}>
              <div style={{ display: 'flex', fontFamily: nameFont.family, fontSize: nameSize, fontWeight: nameFont.weight, color: accent, lineHeight: 1, whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: px(6), marginTop: px(8) }}>
                <div style={{ display: 'flex', fontSize: px(10), fontWeight: 600, color: BG, background: MAGENTA, padding: `${px(3)}px ${px(9)}px`, borderRadius: px(4), textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  LV {levelInfo.level} {title.en}
                </div>
                {stanSince && (
                  <div style={{ display: 'flex', fontSize: px(10), color: CHIP_MUTED, border: `1px solid ${CHIP_BORDER}`, padding: `${px(3)}px ${px(9)}px`, borderRadius: px(4), textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    SINCE {stanSince}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bias */}
          {bias && (
            <div style={{ display: 'flex', marginTop: px(14), fontSize: px(12.5), color: BIAS_TXT }}>
              bias&nbsp;
              <span style={{ display: 'flex', fontFamily: nameFont.family, fontWeight: 600, color: accent }}>{bias}</span>
            </div>
          )}

          {/* Ult heart chips */}
          {ults.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(6), marginTop: px(8) }}>
              {ults.map((name) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: px(5), fontSize: px(11), color: ULT_TXT, background: ULT_BG, padding: `${px(4)}px ${px(10)}px`, borderRadius: px(20) }}>
                  <Heart size={px(11)} />
                  {name}
                </div>
              ))}
            </div>
          )}

          {/* Stat strip */}
          <div style={{ display: 'flex', marginTop: px(16), borderTop: `1px dashed ${DASH}`, paddingTop: px(13) }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: 'Syne', fontSize: px(21), fontWeight: 700, color: STAT_TXT }}>
                {collection.groups_mastered}
                <span style={{ display: 'flex', fontSize: px(13), color: LABEL, marginLeft: px(1) }}>/{collection.groups_total}</span>
              </div>
              <div style={{ display: 'flex', fontSize: px(8.5), color: LABEL, marginTop: px(2), letterSpacing: px(8.5) * 0.12 }}>MASTERED</div>
            </div>

            {totalPlays > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', fontFamily: 'Syne', fontSize: px(21), fontWeight: 700, color: STAT_TXT }}>{formatCount(totalPlays)}</div>
                <div style={{ display: 'flex', fontSize: px(8.5), color: LABEL, marginTop: px(2), letterSpacing: px(8.5) * 0.12 }}>TOTAL PLAYS</div>
              </div>
            )}

            {bestCell && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', fontFamily: 'Syne', fontSize: px(21), fontWeight: 700, color: GOLD }}>{bestCell.pct}%</div>
                <div style={{ display: 'flex', fontSize: px(8.5), color: LABEL, marginTop: px(2), letterSpacing: px(8.5) * 0.12, textTransform: 'uppercase' }}>{bestCell.name} accuracy</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'space-between', padding: `${px(12)}px ${px(20)}px`, borderTop: `1px solid ${FOOTER_BORDER}` }}>
          <div style={{ display: 'flex', fontSize: px(10.5), color: FOOTER_TXT }}>kpopquiz.org/u/{profile.username}</div>
          <Barcode />
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
