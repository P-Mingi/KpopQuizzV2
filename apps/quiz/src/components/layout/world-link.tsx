'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

import { worldForPath, worldHref } from '@/lib/world';

// V-UPGRADE-1 Phase B - a world-aware next/link. When rendered inside Verse chrome
// it rewrites hrefs that point at a shared surface (community / profile /
// notifications) to that surface's /verse mirror, so an internal link inside
// shared content never bounces you to Play one level deeper. In Play, or for any
// non-shared href, it is exactly next/link. usePathname resolves per-URL at
// prerender time, so the baked HTML already carries the in-world href (no flash,
// crawler-safe). Drop-in wherever a shared-surface <Link href="..."> is emitted.
export function WorldLink({ href, ...rest }: { href: string } & Omit<ComponentProps<typeof Link>, 'href'>): React.ReactElement {
  const world = worldForPath(usePathname());
  return <Link href={worldHref(href, world)} {...rest} />;
}
