'use client';

import Link from 'next/link';

import { isPlainClick } from '@/lib/ux-v1/a0/nav';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Link mode: when EVERY option has an href, the control is a <nav> of real links. */
  href?: string | undefined;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  /** Button mode: the pick. Link mode: also called on a plain click, before the navigation. */
  onChange?: ((value: T) => void) | undefined;
  /** Link mode only: a plain click calls this instead of the default soft navigation
   *  (a page's own router, e.g. one that also moves focus). Modified clicks (new tab)
   *  keep the browser's behaviour either way. */
  onNavigate?: ((href: string, value: T) => void) | undefined;
  /** Accessible name of the group or nav (e.g. "Sort"). */
  label: string;
  className?: string | undefined;
}

/**
 * Segmented control (sort, 5/10/15, appearance): a group of toggle buttons with
 * aria-pressed (16.9). Active text pink-ink on the raised pill (17.1).
 *
 * Link mode (every option has an `href`): a `<nav aria-label>` of real links, the
 * current one `aria-current="page"`, same pill look. Crawlable and working before
 * hydration; once hydrated a plain click navigates softly (no scroll jump, no
 * prefetch of every variant) or calls `onNavigate`.
 */
export function Segmented<T extends string>({ options, value, onChange, onNavigate, label, className }: SegmentedProps<T>): React.ReactElement {
  const cls = ['ux-seg', className ?? ''].filter(Boolean).join(' ');
  if (options.length > 0 && options.every((o) => o.href)) {
    return (
      <nav className={cls} aria-label={label}>
        {options.map((o) => {
          const href = o.href as string;
          const on = o.value === value;
          return (
            <Link
              key={o.value}
              href={href}
              prefetch={false}
              scroll={false}
              aria-current={on ? 'page' : undefined}
              onClick={(e) => {
                if (!isPlainClick(e)) return;
                if (on) { e.preventDefault(); return; }
                onChange?.(o.value);
                if (onNavigate) { e.preventDefault(); onNavigate(href, o.value); }
              }}
            >
              {o.label}
            </Link>
          );
        })}
      </nav>
    );
  }
  return (
    <div className={cls} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange?.(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
