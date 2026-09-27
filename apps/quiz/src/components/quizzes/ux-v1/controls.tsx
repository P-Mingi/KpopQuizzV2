'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { Segmented } from '@/components/ux-v1/segmented';
import { UxDropdown } from '@/components/ux-v1/dropdown';
import { useIsClient } from '@/components/ux-v1/use-is-client';

import { p2Trigger } from '@/lib/ux-v1/p2/filters';

import { isPlainClick, useP2Nav } from './nav-context';

import type { P2Facet } from '@/lib/ux-v1/p2/filters';

// /quizzes controls (P2): A0's Segmented and UxDropdown in their link mode (every
// sort and filter option is a real <a href>: crawlable, works before hydration,
// opens in a new tab), driven by the page's router (soft navigation + focus), and
// the removable filter chips (links to the same view without the filter).

export interface P2LinkOption {
  key: string;
  label: string;
  href: string;
  current: boolean;
  /** Real count of quizzes this pick shows (null when the counts are unavailable). */
  count?: number | null | undefined;
}

/** Menu minimum width (A0 .ux-ddpop) and the gap it keeps to the window's right edge. */
const POP_MIN = 200;
const POP_EDGE = 16;

interface ControlsProps {
  sort: P2LinkOption[];
  types: P2LinkOption[];
  levels: P2LinkOption[];
  groups: P2LinkOption[];
  /** The facet counts were read (false = options without counts). */
  countsLive: boolean;
}

/** Sort (Segmented links) + Type / Level / Group (UxDropdown link menus with counts). */
export function P2Controls({ sort, types, levels, groups, countsLive }: ControlsProps): React.ReactElement {
  const { go } = useP2Nav();
  const ready = useIsClient();
  const ref = useRef<HTMLDivElement>(null);

  // Phones scroll the sort control sideways: keep the current sort in view.
  useEffect(() => {
    const nav = ref.current?.querySelector<HTMLElement>('.p2-sort');
    const on = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !on || nav.scrollWidth <= nav.clientWidth) return;
    const left = on.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + on.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = Math.max(0, left - 16);
    }
  }, [sort]);

  // Menus open under their trigger, left-aligned, and shift left just enough to stay
  // 16px inside the window (the prototype's ddOpen: left = min(trigger left, width - 216)).
  // The shift is a custom property on this row (--p2-pop-0..2), read by p2.css.
  const dds = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = dds.current;
    if (!row) return;
    const place = (): void => {
      const width = document.documentElement.clientWidth;
      Array.from(row.children).forEach((wrap, i) => {
        const pop = wrap.querySelector<HTMLElement>('.ux-ddpop');
        const w = Math.max(POP_MIN, pop?.offsetWidth ?? 0);
        const shift = Math.min(0, width - POP_EDGE - w - wrap.getBoundingClientRect().left);
        row.style.setProperty(`--p2-pop-${i}`, `${Math.round(shift * 10) / 10}px`);
      });
    };
    place();
    const size = new ResizeObserver(place);
    size.observe(row);
    size.observe(document.documentElement);
    // A menu wider than its minimum is measured when it opens.
    const open = new MutationObserver(place);
    open.observe(row, { attributes: true, attributeFilter: ['hidden'], subtree: true });
    return () => { size.disconnect(); open.disconnect(); };
  }, [types, levels, groups]);

  const menu = (facet: P2Facet, label: string, items: P2LinkOption[]): React.ReactElement => (
    <UxDropdown
      label={label}
      className={`p2-dd p2-dd-${facet}`}
      value={items.find((o) => o.current)?.key ?? null}
      options={items.map((o) => ({ value: o.key, label: o.label, href: o.href, count: o.count }))}
      onNavigate={(href) => go(href, p2Trigger(facet))}
    />
  );

  return (
    <div ref={ref} className="p2-ctl" data-counts={countsLive ? 'live' : 'off'} data-ready={ready ? '' : undefined}>
      <Segmented
        label="Sort quizzes"
        className="p2-sort"
        value={sort.find((o) => o.current)?.key ?? ''}
        options={sort.map((o) => ({ value: o.key, label: o.label, href: o.href }))}
        onNavigate={(href) => go(href)}
      />
      <div ref={dds} className="p2-dds">
        {menu('type', 'Type', types)}
        {menu('level', 'Level', levels)}
        {menu('group', 'Group', groups)}
      </div>
    </div>
  );
}

/** Active filter: a pink-soft chip that is a link to the same view without it. */
export function P2Chip({ label, href, focus }: { label: string; href: string; focus: string }): React.ReactElement {
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
      onClick={(e) => { if (!isPlainClick(e)) return; e.preventDefault(); go(href, focus); }}
    >
      {label}
      <Icon name="x" size="sm" />
    </Link>
  );
}

/** A soft-navigating link styled by the caller (Clear filters, first page). */
export function P2NavLink({ href, className, focus, children }: {
  href: string; className?: string | undefined; focus?: string | undefined; children: React.ReactNode;
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
      onClick={(e) => { if (!isPlainClick(e)) return; e.preventDefault(); go(href, focus); }}
    >
      {children}
    </Link>
  );
}
