import Link from 'next/link';

interface Props {
  username?: string;
  level?: number;
  xpProgress?: number; // 0 to 1
  avatarBg?: string;
  avatarText?: string;
  href?: string;
}

/**
 * Avatar circle with a conic-gradient XP ring and a level badge to the right.
 * When `username` is missing, renders a compact "Sign in" link.
 */
export function PlayerIdentityPill({ username, level = 1, xpProgress = 0, avatarBg, avatarText, href }: Props) {
  if (!username) {
    return (
      <Link
        href="/login"
        className="text-xs font-medium text-secondary hover:text-primary transition-colors px-3 py-1.5"
      >
        Sign in
      </Link>
    );
  }

  const clampedProgress = Math.max(0, Math.min(1, xpProgress));
  const degrees = clampedProgress * 360;
  const initial = username.charAt(0).toUpperCase();
  const ringBg = `conic-gradient(var(--accent) ${degrees}deg, var(--border) ${degrees}deg 360deg)`;

  return (
    <Link
      href={href ?? '/profile'}
      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-elevated hover:bg-accent-bg transition-colors"
    >
      <span
        aria-hidden="true"
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: ringBg, padding: '1.5px' }}
      >
        <span
          className="w-full h-full rounded-full flex items-center justify-center text-[10px] font-semibold"
          style={{
            background: avatarBg || 'var(--bg-elevated)',
            color: avatarText || 'var(--text-primary)',
            border: '1.5px solid var(--bg-primary)',
          }}
        >
          {initial}
        </span>
      </span>
      <span className="text-[11px] font-semibold text-accent tabular-nums">Lv.{level}</span>
    </Link>
  );
}
