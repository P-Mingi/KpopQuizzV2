import Link from 'next/link';

import { Icon } from './icon';

import type { UxIconName } from './icon';

interface PanelProps {
  /** Panel title (h3 15/600) with an optional 18px pink icon and a muted aside. */
  title?: React.ReactNode;
  icon?: UxIconName;
  aside?: React.ReactNode;
  sub?: React.ReactNode;
  children: React.ReactNode;
  as?: 'section' | 'div' | 'aside';
  titleAs?: 'h2' | 'h3';
  /** Accessible name for a titleless landmark. */
  label?: string;
  className?: string;
}

/**
 * Bordered panel (17.1): the community rail panels, the passport and settings
 * boxes. --line border, radius 20, padding 20/20/16, raised background.
 */
export function Panel({ title, icon, aside, sub, children, as: Tag = 'section', titleAs: H = 'h3', label, className }: PanelProps): React.ReactElement {
  return (
    <Tag className={['ux-panel', className ?? ''].filter(Boolean).join(' ')} aria-label={title ? undefined : label}>
      {title ? (
        <H className="ux-panel-h">
          <span>{icon ? <Icon name={icon} /> : null}{title}</span>
          {aside ? <small>{aside}</small> : null}
        </H>
      ) : null}
      {sub ? <p className="ux-panel-sub">{sub}</p> : null}
      {children}
    </Tag>
  );
}

/** Bordered content box (17.1 "About this quiz", results stats row wrapper):
 *  radius 20, padding 24/26 (20 on phones). */
export function UxBox({ children, as: Tag = 'section', className, label }: { children: React.ReactNode; as?: 'section' | 'div'; className?: string; label?: string }): React.ReactElement {
  return <Tag className={['ux-box', className ?? ''].filter(Boolean).join(' ')} aria-label={label}>{children}</Tag>;
}

/** Three numbers in one bordered row with hairline dividers, max 440 wide (17.4
 *  results: You / Average / Time; blindtest results). Values are the run's real ones. */
export function UxStatsRow({ items, className }: { items: { value: React.ReactNode; label: string }[]; className?: string | undefined }): React.ReactElement {
  return (
    <div className={['ux-stats3', className ?? ''].filter(Boolean).join(' ')}>
      {items.map((it) => <div key={it.label}><b>{it.value}</b><span>{it.label}</span></div>)}
    </div>
  );
}

/** Pinned "your row" (leaderboard, ranked ladder, hall of fame): surface pill row;
 *  `you` = the signed-in fan's own row, pink-soft with the pink edge (17.1). */
export function PinnedRow({ rank, lead, children, end, you, className }: {
  rank?: React.ReactNode; lead?: React.ReactNode; children: React.ReactNode; end?: React.ReactNode; you?: boolean | undefined; className?: string | undefined;
}): React.ReactElement {
  return (
    <div className={['ux-pin', you ? 'is-you' : '', className ?? ''].filter(Boolean).join(' ')}>
      {rank !== undefined ? <span className="ux-pin-rk">{rank}</span> : null}
      {lead}
      <span className="ux-pin-grow">{children}</span>
      {end}
    </div>
  );
}

interface UxRowProps {
  href?: string;
  /** Leading visual: <span className="ux-rn">1</span>, a .ux-thumb, a .ux-gav, an avatar. */
  lead?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
}

/** List row (All time best, New quizzes, From the community, history): title
 *  15/600 (pink-ink on hover when it is a link), muted 13 sub line, end slot. Put
 *  rows inside <div className="ux-rows"> for the hairline dividers. */
export function UxRow({ href, lead, title, sub, end, className }: UxRowProps): React.ReactElement {
  const body = (
    <>
      {lead}
      <span className="ux-row-grow">
        <span className="ux-rt">{title}</span>
        {sub ? <span className="ux-rs">{sub}</span> : null}
      </span>
      {end ? <span className="ux-row-end">{end}</span> : null}
    </>
  );
  const cls = ['ux-row', className ?? ''].filter(Boolean).join(' ');
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
