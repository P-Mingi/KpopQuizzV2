import Image from 'next/image';
import Link from 'next/link';

import { PersonName } from '@/components/ux-v1/person-name';
import { comma, deltaView } from '@/lib/ux-v1/p9/format';

import type { AvatarView, DeltaView } from '@/lib/ux-v1/p9/format';
import type { PersonRow, WarRow } from '@/lib/ux-v1/p9/data';

// The leaderboard's podium and rows (prototype #leaderboard .podium / .pod / .lrow).
// Isomorphic (no hooks, no 'use client'): the server panes and the client Ranked
// pane render the same markup. DOM order = rank order (#1, #2, #3); the grid puts
// #1 in the centre (verse-laws 2: layout moves boxes, never the reading order).

/* ---------------------------------------------------------- avatars --- */

/** A group photo (public/idols through next/image) or the group's initials. */
export function GroupAvatar({ photo, initials, size }: { photo: string | null; initials: string; size: 'pod' | 'row' | 'sm' }): React.ReactElement {
  const cls = size === 'pod' ? 'p9-pav' : size === 'row' ? 'ux-gav p9-gav' : 'ux-gav p9-gav-sm';
  const sizes = size === 'pod' ? '(max-width: 760px) 88px, 120px' : size === 'row' ? '40px' : '28px';
  return (
    <span className={cls} aria-hidden="true">
      {photo ? <Image src={photo} alt="" fill sizes={sizes} className="p9-img" /> : <span className="p9-ini">{initials}</span>}
    </span>
  );
}

/** A fan's avatar: photo or custom art, their preset colour, else neutral initials (16.8). */
export function PersonAvatar({ avatar, name, size }: { avatar: AvatarView; name: string; size: 'pod' | 'row' | 'sm' }): React.ReactElement {
  const cls = size === 'pod' ? 'p9-pav' : size === 'row' ? 'ux-gav p9-gav' : 'ux-gav p9-gav-sm';
  const initial = (name || 'K').trim().charAt(0).toUpperCase() || 'K';
  const style: React.CSSProperties | undefined = !avatar.src && avatar.bg ? { background: avatar.bg, color: avatar.fg ?? undefined } : undefined;
  return (
    <span className={cls} style={style} aria-hidden="true">
      {avatar.src
        // eslint-disable-next-line @next/next/no-img-element -- avatar hosts vary (OAuth, storage); tiny, lazy
        ? <img src={avatar.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="p9-img" />
        : <span className="p9-ini">{initial}</span>}
    </span>
  );
}

/* ----------------------------------------------------------- podium --- */

export interface PodiumItem {
  key: string;
  rank: number;
  avatar: React.ReactNode;
  /** The name, a link to the fandom's hub or the fan's passport. */
  title: React.ReactNode;
  sub: React.ReactNode;
  value: React.ReactNode;
}

/** Top 3, frameless (prototype .podium): #1 centre, larger, pink ring, pink points. */
export function Podium({ items, label }: { items: PodiumItem[]; label: string }): React.ReactElement | null {
  if (items.length < 3) return null;
  return (
    <ol className="p9-podium" aria-label={label}>
      {items.slice(0, 3).map((it) => (
        <li key={it.key} className="p9-pod" data-rank={it.rank}>
          {it.avatar}
          <span className="p9-prk ux-num">#{it.rank}</span>
          <h3 className="p9-pname">{it.title}</h3>
          <small className="p9-psub">{it.sub || ' '}</small>
          <span className="p9-pts ux-num">{it.value}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------- rows --- */

export interface RowItem {
  key: string;
  rank: number;
  avatar: React.ReactNode;
  name: React.ReactNode;
  sub?: React.ReactNode;
  value: React.ReactNode;
  delta?: DeltaView | undefined;
}

export function Delta({ d }: { d: DeltaView }): React.ReactElement {
  return (
    <span className={`p9-dl is-${d.tone}`}>
      <span aria-hidden="true">{d.text}</span>
      <span className="ux-sr">{d.label}</span>
    </span>
  );
}

/** Ranked rows (prototype .lrow): rank, avatar, name + sub, points, change since last week.
 *  `top` colours the first three rows' ranks pink-ink (the prototype's .lrows-top). */
export function BoardRows({ items, top, label, className }: { items: RowItem[]; top?: boolean; label: string; className?: string }): React.ReactElement | null {
  if (!items.length) return null;
  const cls = ['ux-rows', 'p9-rows', top ? 'p9-rows-top' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <ol className={cls} aria-label={label} start={items[0]!.rank}>
      {items.map((it) => (
        <li key={it.key} className="p9-lrow">
          <span className="p9-rk ux-num">{it.rank}</span>
          {it.avatar}
          <span className="p9-grow">
            <span className="p9-nm">{it.name}</span>
            {it.sub ? <span className="p9-sub">{it.sub}</span> : null}
          </span>
          <span className="p9-val ux-num">{it.value}</span>
          {it.delta ? <Delta d={it.delta} /> : null}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------- board builders --- */

export function warPodiumItems(rows: WarRow[]): PodiumItem[] {
  return rows.slice(0, 3).map((r) => ({
    key: r.slug,
    rank: r.rank,
    avatar: <GroupAvatar photo={r.photo} initials={r.initials} size="pod" />,
    title: <Link href={r.href} className="p9-link">{r.name}</Link>,
    sub: r.sub,
    value: <>{comma(r.points)}<span className="ux-sr"> points</span></>,
  }));
}

export function warRowItems(rows: WarRow[]): RowItem[] {
  return rows.map((r) => ({
    key: r.slug,
    rank: r.rank,
    avatar: <GroupAvatar photo={r.photo} initials={r.initials} size="row" />,
    name: <Link href={r.href} className="p9-link">{r.name}</Link>,
    sub: r.sub || undefined,
    value: <>{comma(r.points)}<span className="ux-sr"> points</span></>,
    delta: deltaView(r.delta),
  }));
}

function unit(u: string): React.ReactElement {
  return <small className="p9-unit"> {u}</small>;
}

export function personPodiumItems(rows: PersonRow[], u: string): PodiumItem[] {
  return rows.slice(0, 3).map((r) => ({
    key: r.username,
    rank: r.rank,
    avatar: <PersonAvatar avatar={r.avatar} name={r.username} size="pod" />,
    title: <PersonName name={r.username} accent={r.accent} font={r.font} href={r.href} showBias={false} className="p9-link" />,
    sub: r.sub,
    value: <>{comma(r.value)}{unit(u)}</>,
  }));
}

export function personRowItems(rows: PersonRow[], u: string): RowItem[] {
  return rows.map((r) => ({
    key: r.username,
    rank: r.rank,
    avatar: <PersonAvatar avatar={r.avatar} name={r.username} size="row" />,
    name: <PersonName name={r.username} accent={r.accent} font={r.font} bias={r.bias} href={r.href} className="p9-link" />,
    sub: r.sub,
    value: <>{comma(r.value)}{unit(u)}</>,
  }));
}
