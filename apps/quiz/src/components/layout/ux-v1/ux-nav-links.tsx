'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { activeNav, NAV_ITEMS } from '@/lib/ux-v1/a0/nav';

/**
 * Top-nav links (17.1): icon + label, Home first, the active item a filled pink
 * pill (38px, white 600) with aria-current="page". Client only for the active
 * state; usePathname resolves during the static render, so the HTML already
 * carries the right pill and every <a href>.
 *
 * Owner request (2026-09-27): room between the pills. An empty aria-hidden spacer
 * sits between two links (a0.css `.ux-lsp`: 8px, shrinking evenly when the right
 * cluster needs the room), so the gap is the largest that fits.
 */
export function UxNavLinks(): React.ReactElement {
  const active = activeNav(usePathname() || '/');
  return (
    <nav className="ux-links" aria-label="Main">
      {NAV_ITEMS.map((it, i) => (
        <Fragment key={it.key}>
          {i > 0 && <span className="ux-lsp" aria-hidden="true" />}
          <Link href={it.href} data-nav={it.key} aria-current={active === it.key ? 'page' : undefined}>
            <Icon name={it.icon} />{it.label}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}
