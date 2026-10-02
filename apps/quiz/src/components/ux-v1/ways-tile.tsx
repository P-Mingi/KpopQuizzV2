import Link from 'next/link';

import { Icon } from './icon';

import type { UxIconName } from './icon';

interface WaysTileProps {
  /** Where the way to play starts: a real link (a page, or `#id` on the same page). */
  href: string;
  icon: UxIconName;
  title: string;
  /** Shows the "New" pill after the title. */
  isNew?: boolean | undefined;
  /** One sentence: "18 Stray Kids songs, ten-second clips." Real counts only. */
  children?: React.ReactNode;
  /** Muted foot line: "Most played first", "12,480 results". Hidden when absent. */
  foot?: React.ReactNode;
  titleAs?: 'h2' | 'h3' | 'h4' | undefined;
  className?: string | undefined;
}

/**
 * v12 ways-to-play tile (prototype `.gtile`): pink-soft icon square, title (with an
 * optional New pill), one sentence, a foot line pinned to the bottom. The whole
 * tile is one link. Server-safe.
 */
export function WaysTile({ href, icon, title, isNew, children, foot, titleAs: T = 'h3', className }: WaysTileProps): React.ReactElement {
  const cls = ['ux-gtile', className ?? ''].filter(Boolean).join(' ');
  const inner = (
    <>
      <span className="ux-gtile-ic"><Icon name={icon} /></span>
      <T className="ux-gtile-t">{title}{isNew ? <> <span className="ux-badge-new">New</span></> : null}</T>
      {children ? <p className="ux-gtile-d">{children}</p> : null}
      {foot ? <span className="ux-gtile-ft">{foot}</span> : null}
    </>
  );
  return href.startsWith('#')
    ? <a href={href} className={cls}>{inner}</a>
    : <Link href={href} className={cls} prefetch={false}>{inner}</Link>;
}

/** Grid of tiles: 4 columns (2 from 1100px down), or `columns={2}`. Render it only
 *  when there are at least two ways to play (prototype rule). */
export function WaysTiles({ children, columns = 4, className }: { children: React.ReactNode; columns?: 2 | 4 | undefined; className?: string | undefined }): React.ReactElement {
  return <div className={['ux-gtiles', columns === 2 ? 'ux-gtiles-2' : '', className ?? ''].filter(Boolean).join(' ')}>{children}</div>;
}
