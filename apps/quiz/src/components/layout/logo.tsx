import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  bare?: boolean;
}

export function Logo({ size = 'md', bare }: Props) {
  // F2: the brand mark is now the rabbit mascot (default variant), with the
  // "KpopQuiz" wordmark next to it. 30px nav default per the prototype.
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 36 : 30;
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  const inner = (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontWeight: 800, fontSize, letterSpacing: '-0.02em',
      whiteSpace: 'nowrap',
    }}>
      <Mascot variant="default" size={iconSize} priority />
      <span>KpopQuiz</span>
    </span>
  );

  if (bare) return inner;
  return (
    // flexShrink 0: the brand never gets crushed by a tight nav row (a shrunk
    // logo overflows its box and the world toggle renders over the text).
    <Link href="/" className="inline-flex items-center" style={{ flexShrink: 0 }}>
      {inner}
    </Link>
  );
}
