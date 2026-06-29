import Link from 'next/link';

import { UserAvatar } from '@/components/ui/user-avatar';
import { FollowButton } from '@/components/profile/follow-button';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { formatCount } from '@/lib/utils';

// ONE reusable person / passport card (Workstream M, M1.12). Single source of
// truth for showing a user wherever they appear: quiz creator, comments,
// leaderboard rows, and (next) the M1.21 community page. PUBLIC subset only, no
// percentile / rank (recognition, not comparison). Presentational + client-safe
// (no 'use client'; the only interactive bit is the FollowButton island), so it
// drops into both server-rendered (ISR) pages and client trees without forcing
// the host dynamic. Do not fork variants - use the `compact` density prop.
//
// M1.14 SEAM: the root carries data-person-card + data-username and the card is
// fully self-contained, so the hover-preview popover can later wrap or target it
// without changing this component. Do NOT build the hover here.

export interface PersonCardData {
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
  avatarBg: string;
  avatarText: string;
  xp: number;
  followerCount: number;
  topGroups?: Array<{ name: string; color: string }>; // optional, shown in full only
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

  return (
    <div
      data-person-card=""
      data-username={person.username}
      style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 12, minWidth: 0 }}
    >
      <Link
        href={`/u/${person.username}`}
        style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 12, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
      >
        <UserAvatar username={person.username} avatarUrl={person.avatarUrl} bgColor={person.avatarBg} textColor={person.avatarText} size={compact ? 38 : 48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontSize: compact ? 11 : 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Lv {level} {'·'} {title}
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
