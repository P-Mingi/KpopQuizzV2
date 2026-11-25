'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { activeNav, navTreeFor } from '@/lib/ux-v1/a0/nav';

import type { NavNode } from '@/lib/ux-v1/a0/nav';

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
// The Daily games badge (hub only): its own chunk, never loaded by a site without that tab.
const UxDailyBadge = dynamic(() => import('./ux-daily-badge'), { ssr: false });


/**
 * An item with sub-items (kpopquiz.org: Quizzes holds Groups, Community holds Leaderboard; owner request 2026-11-25). The parent stays a real link to its own page;
 * a button beside it (aria-expanded, aria-controls) opens the list, which is always in the server HTML so crawlers and screen readers meet every sub-link. A mouse
 * opens it on hover, a keyboard or a touch on the button; Escape and a click outside close it, Escape returning the focus to the button. The parent wears the pill
 * when its own page is the path (aria-current="page"), or aria-current="true" when one of its sub-items is, the sub-item itself taking aria-current="page".
 */
function NavGroup({ node, active, pathname }: { node: NavNode; active: string | null; pathname: string }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const id = `ux-nd-${node.key}`;
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const childActive = node.children.some((c) => c.key === active);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e: PointerEvent): void => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  const current = active === node.key ? 'page' : childActive ? 'true' : undefined;
  return (
    <div
      ref={box}
      className="ux-nd"
      data-open={open ? 'true' : undefined}
      onKeyDown={(e) => { if (e.key === 'Escape' && open) { setOpen(false); btn.current?.focus(); } }}
      onBlur={(e) => { if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}
    >
      <Link href={node.href} data-nav={node.key} aria-current={current}>
        <Icon name={node.icon} />{node.label}
      </Link>
      <button ref={btn} type="button" className="ux-nd-t" aria-expanded={open} aria-controls={id} aria-label={`${node.label} menu`} onClick={() => setOpen((v) => !v)}>
        <Icon name="chev" />
      </button>
      <ul id={id} className="ux-nd-m">
        {node.children.map((c) => (
          <li key={c.key}>
            <Link href={c.href} data-nav={c.key} aria-current={active === c.key ? 'page' : undefined}><Icon name={c.icon} />{c.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UxNavLinks(): React.ReactElement {
  const pathname = usePathname() || '/';
  const active = activeNav(pathname);
  return (
    <nav className="ux-links" aria-label="Main">
      {navTreeFor().map((it, i) => (
        <Fragment key={it.key}>
          {i > 0 && <span className="ux-lsp" aria-hidden="true" />}
          {it.children.length > 0 ? <NavGroup node={it} active={active} pathname={pathname} /> : (
            <Link href={it.href} data-nav={it.key} aria-current={active === it.key ? 'page' : undefined}>
              <Icon name={it.icon} />{it.label}
              {it.key === 'daily' ? <UxDailyBadge /> : null}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
