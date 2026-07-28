'use client';

import Link from 'next/link';

import { analytics, type CrossPromoTarget } from '@/lib/analytics';

// Space -> games widget link. Fires the existing cross_promo_click event with
// from='verse' (a widened enum, not a new event). Additive; keeps the space
// pages server-rendered while the click stays analytics-instrumented.
export function VerseGameLink({
  href, target, className, style, children,
}: {
  href: string; target: CrossPromoTarget; className?: string; style?: React.CSSProperties; children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link href={href} className={className} style={style} onClick={() => analytics.crossPromo('verse', target)}>
      {children}
    </Link>
  );
}
