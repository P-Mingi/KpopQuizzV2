import Link from 'next/link';

interface Props {
  /** Size of the logo text. Defaults to `md` (17px). */
  size?: 'sm' | 'md' | 'lg';
  /** When true, don't wrap in a Link. Useful inside `<Link>` parents. */
  bare?: boolean;
}

/**
 * kpopquiz logo with a mini lightstick mascot icon.
 * "kpop" in text-primary, "quiz" in accent.
 */
export function Logo({ size = 'md', bare }: Props) {
  const textClass =
    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-[17px]';
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 18;

  const inner = (
    <span className={`inline-flex items-center gap-1.5 font-bold ${textClass} leading-none`}>
      <svg
        width={iconSize}
        height={Math.round(iconSize * 1.4)}
        viewBox="0 0 20 28"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <circle cx="10" cy="7" r="6" fill="var(--accent)" />
        <rect x="9" y="13" width="2" height="12" rx="1" fill="var(--text-secondary)" />
        <circle cx="8" cy="6" r="1" fill="var(--bg-primary)" />
        <circle cx="12" cy="6" r="1" fill="var(--bg-primary)" />
        <path
          d="M8 9 Q10 11 12 9"
          fill="none"
          stroke="var(--bg-primary)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </svg>
      <span>
        <span className="text-primary">kpop</span>
        <span className="text-accent">quiz</span>
      </span>
    </span>
  );

  if (bare) return inner;
  return (
    <Link href="/" className="inline-flex items-center">
      {inner}
    </Link>
  );
}
