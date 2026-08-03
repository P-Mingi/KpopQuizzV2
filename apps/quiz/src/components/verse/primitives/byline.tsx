// V-HARMONY-1 primitive 3 of 4 - the ONE byline. Every author render converges
// here, and it takes ONLY a resolved Identity/SpaceIdentity (the V-PROFILE-ONE
// resolver output). That is the point: the resolver already honors block state
// (a blocked member is downgraded to 'visitor', no role authority, but keeps
// their name so authored content stays attributed), SYSTEM_AUTHOR_DISPLAY (a
// platform account renders as "KpopVerse" with NO profile link), the FAN_FALLBACK
// ("a fan") for a missing/usernameless author, and the profile href. Rendering
// from that object closes the latent leak where ad-hoc bylines exposed a
// blocked/system identity or a wrong link.
//
// Pure presentation (no server import): pass an already-resolved identity in.

import Link from 'next/link';

import { RoleBadge } from '@/components/verse/roles/role-badge';
import { UserAvatar } from '@/components/ui/user-avatar';

// The fields Byline reads. The V-PROFILE-ONE resolver's Identity/SpaceIdentity
// satisfy it, as do the resolver-derived DiscAuthor/EssayAuthor render shapes -
// so every call site passes resolver-DERIVED data (system/block already honored
// upstream: href is null for a system account; role is 'visitor' when blocked).
export interface BylineIdentity {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarBg?: string | null;
  avatarText?: string | null;
  href?: string | null;
  role?: string | null;
}

const FAN_FALLBACK = 'a fan';
// Neutral avatar fallbacks when a profile has no avatar colors. Not the
// accent-bleed class the token gate guards against.
const AVATAR_BG_FALLBACK = '#6b7280'; // token-lint-ok neutral avatar bg fallback
const AVATAR_TEXT_FALLBACK = '#ffffff'; // token-lint-ok neutral avatar text fallback

export function Byline({ identity, prefix, withAvatar = false, avatarSize = 24, showRole = true, link = true, className }: {
  identity: BylineIdentity | null | undefined;
  /** Optional lead-in, e.g. "Started by", "by". */
  prefix?: React.ReactNode;
  withAvatar?: boolean;
  avatarSize?: number;
  showRole?: boolean;
  /** Set false when the byline sits inside a parent link (no nested anchors). */
  link?: boolean;
  className?: string;
}): React.ReactElement {
  const name = identity?.displayName ?? FAN_FALLBACK;
  // Never a badge for a visitor: a blocked member resolves to 'visitor', so a
  // blocked author shows a name but no role badge.
  const role = identity?.role && identity.role !== 'visitor' ? identity.role : null;
  const href = link ? (identity?.href ?? null) : null; // null for system, usernameless, or nested-link

  const nameNode = href
    ? <Link href={href} className="font-semibold no-underline hover:underline" style={{ color: 'var(--verse-ink)' }}>{name}</Link>
    : <span className="font-semibold" style={{ color: 'var(--verse-ink)' }}>{name}</span>;

  return (
    <span className={`inline-flex items-center gap-1.5${className ? ` ${className}` : ''}`}>
      {withAvatar && identity ? (
        <UserAvatar
          username={identity.username ?? name}
          avatarUrl={identity.avatarUrl ?? null}
          bgColor={identity.avatarBg ?? AVATAR_BG_FALLBACK}
          textColor={identity.avatarText ?? AVATAR_TEXT_FALLBACK}
          size={avatarSize}
        />
      ) : null}
      {prefix ? <span className="text-secondary">{prefix} </span> : null}
      {nameNode}
      {showRole && role ? <RoleBadge role={role} /> : null}
    </span>
  );
}
