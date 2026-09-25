'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '@/components/ux-v1/icon';
import { activeNav, NAV_ITEMS } from '@/lib/ux-v1/a0/nav';

/**
 * Top-nav links (17.1): icon + label, Home first, the active item a filled pink
 * pill (38px, white 600) with aria-current="page". Client only for the active
 * state; usePathname resolves during the static render, so the HTML already
 * carries the right pill and every <a href>.
 */
export function UxNavLinks(): React.ReactElement {
  const active = activeNav(usePathname() || '/');
  return (
    <nav className="ux-links" aria-label="Main">
      {NAV_ITEMS.map((it) => (
        <Link key={it.key} href={it.href} data-nav={it.key} aria-current={active === it.key ? 'page' : undefined}>
          <Icon name={it.icon} />{it.label}
        </Link>
      ))}
    </nav>
  );
}
