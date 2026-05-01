import Link from 'next/link';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  bare?: boolean;
}

export function Logo({ size = 'md', bare }: Props) {
  const iconSize = size === 'sm' ? 22 : size === 'lg' ? 32 : 28;
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const radius = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;

  const inner = (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontWeight: 800, fontSize, letterSpacing: '-0.02em',
    }}>
      <span style={{
        width: iconSize, height: iconSize, borderRadius: radius,
        background: 'var(--accent)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent-fg, #fff)',
        flexShrink: 0,
      }}>
        <svg width={iconSize * 0.57} height={iconSize * 0.57} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/>
        </svg>
      </span>
      <span>KpopQuiz</span>
    </span>
  );

  if (bare) return inner;
  return (
    <Link href="/" className="inline-flex items-center">
      {inner}
    </Link>
  );
}
