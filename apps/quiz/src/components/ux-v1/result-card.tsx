import { distributionRows } from '@/lib/ux-v1/a0/distribution';

import { Icon } from './icon';

import type { DistributionInput } from '@/lib/ux-v1/a0/distribution';

interface ResultCardProps {
  /** Small pink line above the name: "You are", "Your group is". */
  eyebrow: string;
  /** The result: a member or a group name. */
  name: string;
  /** Public role or one-line reason under the name: "Leader and producer". */
  role?: string | undefined;
  /** The paragraph that describes the player. */
  description?: React.ReactNode;
  /** Up to three trait pills. */
  traits?: readonly string[] | undefined;
  /** Group photo from `public/idols/` (groups only; a member result shows the
   *  initial, never a picture). */
  photo?: { src: string; alt: string } | undefined;
  /** "16% of STAY got Bang Chan": pass it only when the share is real. */
  same?: React.ReactNode;
  /** The buttons row (share, retake). */
  actions?: React.ReactNode;
  /** Heading level of the name (the page decides where its one H1 is). */
  nameAs?: 'h1' | 'h2' | undefined;
  className?: string | undefined;
}

/** Trait pills (prototype `.traits`). Renders nothing for an empty list. */
export function Traits({ items, className }: { items: readonly string[]; className?: string | undefined }): React.ReactElement | null {
  const list = items.map((t) => t.trim()).filter(Boolean);
  if (!list.length) return null;
  return <ul className={['ux-traits', className ?? ''].filter(Boolean).join(' ')}>{list.map((t) => <li key={t}>{t}</li>)}</ul>;
}

/**
 * v12 result card (prototype `.rescard`, Which member are you and the KPop Demon
 * Hunters bridge quiz): photo or initial, eyebrow, the result name, role, the
 * description, trait pills, the "same result" line and the actions. Server-safe.
 */
export function ResultCard({ eyebrow, name, role, description, traits, photo, same, actions, nameAs: T = 'h2', className }: ResultCardProps): React.ReactElement {
  const initial = name.replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toUpperCase() || 'K';
  return (
    <div className={['ux-rescard', className ?? ''].filter(Boolean).join(' ')}>
      <div className="ux-rescard-who">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a 92px local photo from public/idols
          <span className="ux-rescard-ph"><img src={photo.src} alt={photo.alt} width={92} height={92} /></span>
        ) : <span className="ux-rescard-ph" aria-hidden="true">{initial}</span>}
        <div>
          <div className="ux-rescard-you">{eyebrow}</div>
          <T className="ux-rescard-name">{name}</T>
          {role ? <div className="ux-rescard-role">{role}</div> : null}
        </div>
      </div>
      {description ? <p className="ux-rescard-desc">{description}</p> : null}
      {traits ? <Traits items={traits} /> : null}
      {same ? <p className="ux-same"><Icon name="users" /><span>{same}</span></p> : null}
      {actions ? <div className="ux-rescard-acts">{actions}</div> : null}
    </div>
  );
}

interface DistributionProps {
  /** One row per outcome with its real share (0 to 100). */
  items: readonly DistributionInput[];
  /** The viewer's own outcome: its row is highlighted. */
  meId?: string | null | undefined;
  /** Accessible name of the list ("How everyone came out"). */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * v12 result distribution (prototype `.dist`): name, bar, share, largest first.
 * Renders nothing when there is no real share to show (rule 7: a number that does
 * not exist is hidden). Server-safe.
 */
export function Distribution({ items, meId, label, className }: DistributionProps): React.ReactElement | null {
  const rows = distributionRows(items, meId);
  if (!rows.length) return null;
  return (
    <ul className={['ux-dist', className ?? ''].filter(Boolean).join(' ')} aria-label={label}>
      {rows.map((r) => (
        <li key={r.id} className={r.me ? 'is-me' : undefined}>
          <b>{r.label}{r.me ? <span className="ux-sr"> (your result)</span> : null}</b>
          <span className="ux-dist-bar" aria-hidden="true"><i style={{ width: `${r.width}%` }} /></span>
          <span className="ux-dist-pct">{r.text}</span>
        </li>
      ))}
    </ul>
  );
}
