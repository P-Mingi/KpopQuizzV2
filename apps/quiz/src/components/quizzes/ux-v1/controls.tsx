'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { UxPopover } from '@/components/ux-v1/popover';
import { useIsClient } from '@/components/ux-v1/use-is-client';

import { isPlainClick, useP2Nav } from './nav-context';

// /quizzes controls (P2). Same look as A0's Segmented, UxDropdown and filter Chip,
// but every option is a real link (brief: "every filter and page link is a real
// <a href>"); A0's components take buttons only (request filed in v11/requests/P2.md).

export interface P2LinkOption {
  key: string;
  label: string;
  href: string;
  current: boolean;
  /** Real count of quizzes this pick shows (null when the counts are unavailable). */
  count?: number | null | undefined;
}

/** Sort: a segmented control of links (aria-current on the active sort). */
export function P2SortNav({ items, label }: { items: P2LinkOption[]; label: string }): React.ReactElement {
  const { go } = useP2Nav();
  const ready = useIsClient();
  const ref = useRef<HTMLElement>(null);

  // Phones scroll the control sideways: keep the active sort in view.
  useEffect(() => {
    const nav = ref.current;
    const on = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !on || nav.scrollWidth <= nav.clientWidth) return;
    const left = on.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + on.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = Math.max(0, left - 16);
    }
  }, [items]);

  return (
    <nav ref={ref} className="ux-seg p2-sort" aria-label={label} data-ready={ready ? '' : undefined}>
      {items.map((o) => (
        <Link
          key={o.key}
          href={o.href}
          prefetch={false}
          scroll={false}
          aria-current={o.current ? 'page' : undefined}
          onClick={(e) => { if (!isPlainClick(e)) return; e.preventDefault(); if (!o.current) go(o.href); }}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

interface MenuProps {
  /** Trigger id (chips and Clear filters move focus back here). */
  id: string;
  label: string;
  items: P2LinkOption[];
  /** Align the menu to the trigger's right edge (the last dropdown of the row). */
  end?: boolean | undefined;
}

/** Type / Level / Group: A0's dropdown pill + a menu of link options with counts. */
export function P2Menu({ id, label, items, end }: MenuProps): React.ReactElement {
  const { go } = useP2Nav();
  const ready = useIsClient();
  const current = items.find((o) => o.current);
  return (
    <UxPopover
      wrap
      menu
      label={label}
      className={['ux-ddpop', 'p2-ddpop', end ? 'p2-ddpop-end' : ''].filter(Boolean).join(' ')}
      trigger={(p) => (
        <button
          type="button"
          id={id}
          className={['ux-dd', 'p2-dd', current ? 'is-set' : ''].filter(Boolean).join(' ')}
          data-ready={ready ? '' : undefined}
          {...p}
        >
          <span>{label}</span>
          {current ? <span className="ux-sr">: {current.label}</span> : null}
          <Icon name="chev" />
        </button>
      )}
    >
      {(close) => items.map((o) => (
        <Link
          key={o.key}
          href={o.href}
          prefetch={false}
          scroll={false}
          role="menuitemradio"
          aria-checked={o.current}
          className="ux-mi"
          onClick={(e) => {
            if (!isPlainClick(e)) return;
            e.preventDefault();
            close();
            if (!o.current) go(o.href, id);
          }}
          onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
        >
          <span>{o.label}</span>
          {typeof o.count === 'number' ? <small className="ux-num">{o.count.toLocaleString('en-US')}</small> : null}
        </Link>
      ))}
    </UxPopover>
  );
}

/** Active filter: a pink-soft chip that is a link to the same view without it. */
export function P2Chip({ label, href, focusId }: { label: string; href: string; focusId: string }): React.ReactElement {
  const { go } = useP2Nav();
  const ready = useIsClient();
  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      className="ux-chip ux-chip-filter p2-chip"
      aria-label={`Remove ${label} filter`}
      data-ready={ready ? '' : undefined}
      onClick={(e) => { if (!isPlainClick(e)) return; e.preventDefault(); go(href, focusId); }}
    >
      {label}
      <Icon name="x" size="sm" />
    </Link>
  );
}

/** A soft-navigating link styled by the caller (Clear filters, first page). */
export function P2NavLink({ href, className, focusId, children }: {
  href: string; className?: string | undefined; focusId?: string | undefined; children: React.ReactNode;
}): React.ReactElement {
  const { go } = useP2Nav();
  const ready = useIsClient();
  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      className={className}
      data-ready={ready ? '' : undefined}
      onClick={(e) => { if (!isPlainClick(e)) return; e.preventDefault(); go(href, focusId); }}
    >
      {children}
    </Link>
  );
}
