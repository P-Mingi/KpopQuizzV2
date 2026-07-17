import Link from 'next/link';

import { UserAvatar } from '@/components/ui/user-avatar';
import { FollowButton } from '@/components/profile/follow-button';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { formatCount } from '@/lib/utils';
import { AVATAR_PRESETS, nameAccentColor, nameFontFamily, type AvatarKind } from '@/lib/passport-flair';

// ONE reusable person / passport card (Workstream M, M1.12 + M1.26 flair). Single
// source of truth + the ONE carrier of identity flair, shown wherever a person
// appears (Hall of Fame, Community, comments, leaderboard). Public subset only,
// no percentile/rank. Client-safe (no 'use client'; only FollowButton is the
// island), so it drops into ISR pages without forcing them dynamic. Do not fork.
//
// FLAIR (M1.26): name in a curated accent + type, an optional pinned-badge slot,
// and a bias line. Anonymous "someone" rows render WITHOUT a card (no flair).
//
// AVATAR SLOT SEAM (M1.27): avatarKind selects the renderer - 'photo' (UserAvatar),
// 'preset' (a curated solid circle via avatarRef), or 'custom' (the M1.27
// composited avatar plugs in here via avatarRef config; today it falls back to the
// photo/initials renderer). The slot is the single integration point.

export interface PersonCardData {
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
  avatarBg: string;
  avatarText: string;
  xp: number;
  followerCount: number;
  topGroups?: Array<{ name: string; color: string }>;
  // flair (all optional; absent -> neutral defaults, no regression)
  nameAccent?: string | null;
  nameFont?: string | null;
  bias?: string | null;
  pinnedBadgeId?: string | null;   // slot rendered now; real badge art arrives M1.15
  avatarKind?: AvatarKind | null;
  avatarRef?: string | null;
}

function AvatarSlot({ person, size }: { person: PersonCardData; size: number }): React.ReactElement {
  const kind = person.avatarKind ?? 'photo';
  if (kind === 'preset' && person.avatarRef && AVATAR_PRESETS[person.avatarRef]) {
    const p = AVATAR_PRESETS[person.avatarRef]!;
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: p.bg, color: p.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: Math.round(size * 0.4) }}>
        {person.username.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  // 'photo' and 'custom' (custom falls back until the M1.27 builder lands).
  return <UserAvatar username={person.username} avatarUrl={person.avatarUrl} bgColor={person.avatarBg} textColor={person.avatarText} size={size} />;
}

export function PersonCard({
  person,
  compact = false,
  showFollow = true,
}: {
  person: PersonCardData;
  compact?: boolean;
  showFollow?: boolean;
}): React.ReactElement {
  const level = getLevelInfo(person.xp).level;
  const title = getTitleForLevel(level).en;
  const name = person.displayName ?? person.username;
  const ults = (person.topGroups ?? []).slice(0, 2);
  const avatarSize = compact ? 38 : 48;
  const accentColor = nameAccentColor(person.nameAccent);
  const fontFamily = nameFontFamily(person.nameFont);

  return (
    <div data-person-card="" data-username={person.username} style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 12, minWidth: 0 }}>
      <Link href={`/u/${person.username}`} style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 12, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
        <div style={{ position: 'relative', flexShrink: 0, lineHeight: 0 }}>
          <AvatarSlot person={person} size={avatarSize} />
          {person.pinnedBadgeId && (
            // Pinned-badge slot (M1.26). Real per-badge art lands with M1.15; for
            // now a small marker in the chosen accent marks that a badge is pinned.
            <span aria-hidden="true" style={{
              position: 'absolute', right: -1, bottom: -1,
              width: compact ? 13 : 15, height: compact ? 13 : 15, borderRadius: '50%',
              background: accentColor === 'var(--txt1)' ? 'var(--brand)' : accentColor,
              boxShadow: '0 0 0 2px var(--surface)',
            }} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700, color: accentColor, fontFamily, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontSize: compact ? 11 : 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Lv {level} {'·'} {title}
            {person.bias && person.bias.trim() ? ` · bias ${person.bias.trim()}` : ''}
            {!compact && <> {'·'} {formatCount(person.followerCount)} {person.followerCount === 1 ? 'follower' : 'followers'}</>}
          </div>
          {!compact && ults.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {ults.map((g) => (
                <span key={g.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: g.color || 'var(--accent)' }} />
                  {g.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      {showFollow && <FollowButton profileUsername={person.username} />}
    </div>
  );
}
