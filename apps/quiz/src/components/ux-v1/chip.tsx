import Link from 'next/link';

import { Icon } from './icon';

import type { UxIconName } from './icon';

interface ChipProps {
  children: React.ReactNode;
  /** Filter chip / post-type chip style: pink-soft (17.1). */
  filter?: boolean;
  /** Toggle chip: renders a <button aria-pressed>; pressed = ink fill. */
  pressed?: boolean;
  /** Removable filter chip: shows an X and calls onRemove (label gets "Remove ..."). */
  onRemove?: () => void;
  onClick?: () => void;
  href?: string;
  icon?: UxIconName;
  className?: string;
}

/**
 * Chip (36px pill, 15/500). Static (<span>), link, toggle (aria-pressed) or
 * removable filter chip. Server-safe; pass handlers only from client components.
 */
export function Chip({ children, filter, pressed, onRemove, onClick, href, icon, className }: ChipProps): React.ReactElement {
  const cls = ['ux-chip', filter ? 'ux-chip-filter' : '', className ?? ''].filter(Boolean).join(' ');
  const lead = icon ? <Icon name={icon} size="sm" /> : null;
  if (href) return <Link href={href} className={cls}>{lead}{children}</Link>;
  if (onRemove) {
    return (
      <button type="button" className={cls} onClick={onRemove} aria-label={`Remove filter ${typeof children === 'string' ? children : ''}`.trim()}>
        {lead}{children}<Icon name="x" size="sm" />
      </button>
    );
  }
  if (onClick || pressed !== undefined) {
    return <button type="button" className={cls} aria-pressed={pressed} onClick={onClick}>{lead}{children}</button>;
  }
  return <span className={cls}>{lead}{children}</span>;
}

/** Chip row (wrap, 8px gap). */
export function Chips({ children, className, label }: { children: React.ReactNode; className?: string; label?: string }): React.ReactElement {
  return <div className={['ux-chips', className ?? ''].filter(Boolean).join(' ')} role={label ? 'group' : undefined} aria-label={label}>{children}</div>;
}
