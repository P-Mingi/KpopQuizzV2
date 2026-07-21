'use client';

import Link from 'next/link';

import { analytics } from '@/lib/analytics';

import type { CrossPromoTarget } from '@/lib/analytics';

// Small client wrapper so a community CTA can fire the existing
// cross_promo_click (from='community') while the section around it stays a
// static server component. The tiles themselves are plain crawlable Links and
// need no JS; only this CTA does.
export function CommunityCtaLink({
  href, to, className, children,
}: {
  href: string;
  to: CrossPromoTarget;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link href={href} className={className} onClick={() => analytics.crossPromo('community', to)}>
      {children}
    </Link>
  );
}
