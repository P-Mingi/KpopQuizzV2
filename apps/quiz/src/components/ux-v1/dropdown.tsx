'use client';

import Link from 'next/link';

import { isPlainClick } from '@/lib/ux-v1/a0/nav';

import { Icon } from './icon';
import { UxPopover } from './popover';

export interface UxDropdownOption {
  value: string;
  label: string;
  /** Link option: the menu item is a real <a href> (new tab works; soft navigation once hydrated). */
  href?: string | undefined;
  /** Real count of what this pick shows (right-aligned, tabular). Hidden when absent. */
  count?: number | null | undefined;
}

interface UxDropdownProps {
  /** Control name shown when nothing is picked ("Type", "Level", "Group"). */
  label: string;
  /** Current value (null = nothing picked). */
  value: string | null;
  options: UxDropdownOption[];
  /** The pick (button options), or a plain click on a link option before it navigates. */
  onChange?: ((value: string) => void) | undefined;
  /** Link options only: a plain click calls this instead of the default soft navigation
   *  (a page's own router, e.g. one that also moves focus). Modified clicks keep the
   *  browser's behaviour. */
  onNavigate?: ((href: string, value: string) => void) | undefined;
  className?: string | undefined;
}

/**
 * Filter dropdown (44px pill + menu of radio items). Picking adds a removable chip
 * on the page (the page owns the chips). aria-haspopup=menu + aria-expanded (16.9).
 * Options with an `href` are `<a role="menuitemradio" aria-checked>` links (Space
 * and Enter pick, like the button items); an optional count sits on the right.
 */
export function UxDropdown({ label, value, options, onChange, onNavigate, className }: UxDropdownProps): React.ReactElement {
  const current = options.find((o) => o.value === value);
  return (
    <UxPopover
      wrap
      menu
      label={label}
      className="ux-ddpop"
      trigger={(p) => (
        <button type="button" className={['ux-dd', className ?? ''].filter(Boolean).join(' ')} {...p}>
          {current ? <span>{label}: <b>{current.label}</b></span> : <span>{label}</span>}
          <Icon name="chev" />
        </button>
      )}
    >
      {(close) => options.map((o) => {
        const on = o.value === value;
        const body = (
          <>
            <span>{o.label}</span>
            {typeof o.count === 'number' ? <small className="ux-num">{o.count.toLocaleString('en-US')}</small> : null}
          </>
        );
        if (o.href) {
          const href = o.href;
          return (
            <Link
              key={o.value}
              href={href}
              prefetch={false}
              scroll={false}
              role="menuitemradio"
              aria-checked={on}
              className="ux-mi"
              onClick={(e) => {
                if (!isPlainClick(e)) return;
                close();
                if (on) { e.preventDefault(); return; }
                onChange?.(o.value);
                if (onNavigate) { e.preventDefault(); onNavigate(href, o.value); }
              }}
              onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
            >
              {body}
            </Link>
          );
        }
        return (
          <button
            key={o.value}
            type="button"
            role="menuitemradio"
            aria-checked={on}
            className="ux-mi"
            onClick={() => { onChange?.(o.value); close(); }}
          >
            {body}
          </button>
        );
      })}
    </UxPopover>
  );
}
