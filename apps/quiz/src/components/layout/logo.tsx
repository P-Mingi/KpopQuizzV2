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
    }}>
      <Mascot variant="default" size={iconSize} priority />
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
