import Link from 'next/link';

interface Props {
  username?: string;
  level?: number;
  /** 0..1 progress to the next level. Drives the conic ring. */
  xpProgress?: number;
  avatarBg?: string;
  avatarText?: string;
  href?: string;
}

/**
 * Identity pill: 24px avatar circle with a conic-gradient XP ring + "Lv.N" badge.
 * Used in the TopNav (desktop) and anywhere else we need a compact user chip.
 * When `username` is missing, renders a compact "Sign in" link.
 */
export function PlayerIdentityPill({
  username,
  level = 1,
  xpProgress = 0,
  avatarBg,
  avatarText,
  href,
}: Props) {
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

  const clamped = Math.max(0, Math.min(1, xpProgress));
  const degrees = clamped * 360;
  const initial = username.charAt(0).toUpperCase();
  const ringBg = `conic-gradient(var(--accent) ${degrees}deg, var(--border) ${degrees}deg 360deg)`;

  return (
    <Link
      href={href ?? '/profile'}
      className="inline-flex items-center gap-1.5 py-[3px] pl-[3px] pr-[10px] rounded-full bg-elevated hover:bg-accent-bg transition-colors"
    >
      <span
        aria-hidden="true"
        className="w-6 h-6 rounded-full p-[1px] flex items-center justify-center"
        style={{ background: ringBg }}
      >
        <span
          className="w-full h-full rounded-full flex items-center justify-center text-[8px] font-semibold"
          style={{
            background: avatarBg || 'var(--bg-elevated)',
            color: avatarText || 'var(--text-primary)',
            border: '1px solid var(--bg-primary)',
          }}
        >
          {initial}
        </span>
      </span>
      <span className="text-[10px] font-semibold text-accent tabular-nums">Lv.{level}</span>
    </Link>
  );
}
