import { Icon } from './icon';
import { UxLink } from './button';

import type { UxIconName } from './icon';

interface SectionHeaderProps {
  title: React.ReactNode;
  /** 20px pink line icon before the title (17.1: flame for Trending, trophy for All time best...). */
  icon?: UxIconName;
  /** Right side link ("See all", "All 90 groups"): a real href. */
  action?: { href: string; label: string };
  /** Right side node instead of a link (e.g. a search field). */
  aside?: React.ReactNode;
  /** Muted sub line under / next to the title. */
  sub?: React.ReactNode;
  /** Heading level; h2 by default (the page H1 is the page's own). */
  as?: 'h2' | 'h3';
  id?: string;
  className?: string;
}

/** Section title row: h2 20/600 with the pink icon, link or aside on the right. */
export function SectionHeader({ title, icon, action, aside, sub, as: H = 'h2', id, className }: SectionHeaderProps): React.ReactElement {
  return (
    <div className={['ux-sec-h', className ?? ''].filter(Boolean).join(' ')}>
      <H id={id}>
        {icon ? <Icon name={icon} className="ux-si" /> : null}
        {title}
      </H>
      {sub ? <p>{sub}</p> : null}
      {action ? <UxLink href={action.href}>{action.label}</UxLink> : null}
      {aside ?? null}
    </div>
  );
}
