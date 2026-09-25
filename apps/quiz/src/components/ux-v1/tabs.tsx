'use client';

import Link from 'next/link';
import { useRef } from 'react';

import { Icon } from './icon';

import type { UxIconName } from './icon';

export interface UxTabItem {
  id: string;
  label: string;
  icon?: UxIconName;
  /** Link tabs (a real URL per tab, e.g. ?tab=players): rendered as <a aria-current>. */
  href?: string;
}

interface UxTabsProps {
  items: UxTabItem[];
  value: string;
  onChange?: (id: string) => void;
  /** Accessible name of the tab list. */
  label: string;
  /** Button tabs control panels with ids `${idPrefix}-panel-${id}` (see tabPanelProps). */
  idPrefix?: string;
  className?: string;
}

/**
 * Tabs (community, leaderboard, passport). Active = pink-soft pill with pink-ink
 * text (17.1). Button tabs are a real ARIA tablist (role=tab, aria-selected,
 * arrow keys, Home/End, roving tabindex); link tabs are a nav of links with
 * aria-current, for tabs that have their own URL.
 */
export function UxTabs({ items, value, onChange, label, idPrefix = 'ux-tabs', className }: UxTabsProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const cls = ['ux-utabs', className ?? ''].filter(Boolean).join(' ');
  const linkMode = items.every((t) => typeof t.href === 'string');

  if (linkMode) {
    return (
      <nav className={cls} aria-label={label}>
        {items.map((t) => (
          <Link key={t.id} href={t.href as string} aria-current={t.id === value ? 'page' : undefined} scroll={false}>
            {t.icon ? <Icon name={t.icon} size="sm" /> : null}{t.label}
          </Link>
        ))}
      </nav>
    );
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const i = items.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    const target = items[next];
    if (!target) return;
    e.preventDefault();
    onChange?.(target.id);
    const btn = ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    btn?.focus();
  };

  return (
    <div ref={ref} className={cls} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${t.id}`}
            aria-selected={on}
            // Only the selected panel is guaranteed to be in the DOM (pages may
            // render just the active one), so only its tab points at it.
            aria-controls={on ? `${idPrefix}-panel-${t.id}` : undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange?.(t.id)}
          >
            {t.icon ? <Icon name={t.icon} size="sm" /> : null}{t.label}
          </button>
        );
      })}
    </div>
  );
}
