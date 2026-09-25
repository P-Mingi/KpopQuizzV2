'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { PersonName } from '@/components/ux-v1/person-name';
import { groupPhotoUrl, photoFocal } from '@/lib/ux-v1/a0/group-photos';
import { comma, secs } from '@/lib/ux-v1/p6/points';
import { filterGroups, initials } from '@/lib/ux-v1/p6/playlists';

import { useHub } from './hub-context';

import type { BtGroup } from '@/lib/ux-v1/p6/playlists';

// Client islands of the server-rendered hub. Each reads the controller through
// useHub(); links keep their real href (crawlable, and a modified click opens the
// playlist page), a plain click starts the run in place like the prototype.

function plainClick(e: React.MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

function hoursLeft(ms: number): string {
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `${h} ${h === 1 ? 'hour' : 'hours'} left`;
  const m = Math.max(1, Math.floor(ms / 60000));
  return `${m} ${m === 1 ? 'minute' : 'minutes'} left`;
}

/** Hero eyebrow: fans on today's board (server count, refreshed by the board fetch);
 *  the page's kicker "K-pop Blind Test" while nobody has played today. */
export function BtLiveCount({ initial }: { initial: number }): React.ReactElement {
  const hub = useHub();
  const total = hub?.board ? hub.board.total : initial;
  return (
    <p className="p6-eyebrow">
      {total > 0
        ? <><span className="p6-pulse" aria-hidden="true" />{comma(total)} {total === 1 ? 'fan' : 'fans'} playing today</>
        : 'K-pop Blind Test'}
    </p>
  );
}

/** Ways to play: Blindtest of the day (one try per day). */
export function BtDailyCard(): React.ReactElement {
  const hub = useHub();
  const b = hub?.board;
  let foot = '';
  if (b) {
    const me = b.me;
    if (hub?.playedToday && me?.played && me.score !== null) foot = `Played · ${me.score}/10${me.rank ? ` · #${comma(me.rank)} today` : ''}`;
    else if (hub?.playedToday) foot = 'Played today · see the board';
    else foot = `${comma(b.total)} played · ${hoursLeft(b.resetsInMs)}`;
  }
  return (
    <a
      className="p6-mcard"
      href="/blindtest?daily=true"
      onClick={(e) => { if (!hub || !plainClick(e)) return; e.preventDefault(); hub.playDaily(); }}
    >
      <Icon name="cal" size="lg" />
      <h3>Blindtest of the day</h3>
      <p>Ten songs, the same for everyone. One try, then see your rank.</p>
      <span className="p6-ft">{foot}</span>
    </a>
  );
}

interface RankedMe { season?: { id: number; daysLeft: number }; me?: { score: number; tier?: { label?: string } } | null }

/** Ways to play: Ranked footer, from P7's GET /api/ranked/me (hidden until ranked is live). */
export function BtRankedFoot(): React.ReactElement | null {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/ranked/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<RankedMe>) : null))
      .then((d) => {
        if (!alive || !d?.season) return;
        if (d.me?.tier?.label) setLine(`${d.me.tier.label} · ${comma(d.me.score)} points`);
        else setLine(`Season ${d.season.id} · ${d.season.daysLeft} ${d.season.daysLeft === 1 ? 'day' : 'days'} left`);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return <span className="p6-ft">{line ?? ''}</span>;
}

/** Ways to play: Challenge a friend (a run, then a link with the exact songs). */
export function BtChallengeCard(): React.ReactElement {
  const hub = useHub();
  return (
    <a
      className="p6-mcard"
      href="/blindtest#bt-start"
      onClick={(e) => { if (!hub || !plainClick(e)) return; e.preventDefault(); hub.startSelected(); }}
    >
      <Icon name="target" size="lg" />
      <h3>Challenge a friend</h3>
      <p>Play a run, then send a link. They get your exact ten songs.</p>
      <span className="p6-ft">Your link works for 48 hours</span>
    </a>
  );
}

/** Today's board: top 5 with flair + your row (Play, or your score). */
export function BtBoard(): React.ReactElement {
  const hub = useHub();
  const b = hub?.board ?? null;
  const me = b?.me ?? null;
  return (
    <div className="ux-rows p6-board" id="bt-board" aria-live="polite">
      {b?.top.map((r) => (
        <div className="p6-lrow" key={r.rank}>
          <span className="p6-rk ux-num">{r.rank}</span>
          <UxAvatar name={r.name} src={r.avatarUrl} size={40} />
          <span className="p6-grow">
            <PersonName name={r.name} accent={r.accent} font={r.font} bias={r.bias} href={r.username ? `/u/${r.username}` : undefined} />
            <span className="p6-sub ux-num">{r.score}/10</span>
          </span>
          <span className="p6-pts ux-num">{secs(r.timeMs)}</span>
        </div>
      ))}
      {b && b.top.length === 0 ? (
        <div className="p6-lrow p6-empty"><span className="p6-grow">No scores yet today. The first fan to play tops the board.</span></div>
      ) : null}
      {me ? (
        <div className="p6-lrow is-you">
          <span className="p6-rk ux-num is-sm">{me.played && me.rank ? `#${comma(me.rank)}` : '-'}</span>
          <UxAvatar name={me.name} src={me.avatarUrl} size={40} />
          <span className="p6-grow">
            <b>You</b>
            <span className="p6-sub ux-num">{me.played && me.score !== null ? `${me.score}/10 · played today` : 'not played today'}</span>
          </span>
          {me.played && me.timeMs !== null
            ? <span className="p6-pts ux-num">{secs(me.timeMs)}</span>
            : <UxButton size="sm" variant="ghost" onClick={() => hub?.playDaily()}>Play</UxButton>}
        </div>
      ) : null}
    </div>
  );
}

const FIRST = 24;

function GroupRow({ g, onStart }: { g: BtGroup; onStart: (g: BtGroup, e: React.MouseEvent) => void }): React.ReactElement {
  return (
    <a className="p6-gi" href={`/blindtest/group-${g.slug}`} aria-label={`${g.name} blindtest, ${g.songs} songs`} onClick={(e) => onStart(g, e)}>
      <span className="p6-gn">{g.name}</span>
      <span className="p6-gc ux-num">{g.songs}<span className="p6-gcs"> songs</span></span>
      <Icon name="play" size="sm" className="p6-gp" />
    </a>
  );
}

/**
 * Play by group (17.5, v11.1): search on the right, the popular six as photo
 * tiles, then every playable group in a 4-column index, first 24 then "Show all".
 * Every group is a real link in the server HTML (the rest sits in a native
 * <details>, crawlable collapse); typing filters the whole list live.
 */
export function BtGroupIndex({ popular }: { popular: BtGroup[] }): React.ReactElement | null {
  const hub = useHub();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  if (!hub) return null;
  const groups = hub.groups;
  const start = (g: BtGroup, e: React.MouseEvent): void => {
    if (!plainClick(e)) return;
    e.preventDefault();
    hub.startGroup(g);
  };
  const filtered = filterGroups(groups, q);
  const searching = q.trim().length > 0;
  return (
    <>
      <div className="ux-sec-h p6-btg-h">
        <h2 id="p6-btg-h"><Icon name="users" className="ux-si" />Play by group</h2>
        <label className="p6-gsearch">
          <Icon name="search" size="sm" />
          <span className="ux-sr">Search groups</span>
          <input type="search" autoComplete="off" placeholder={`Search ${groups.length} groups`} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {!searching ? (
        <div className="p6-btpop" role="list" aria-label="Popular group playlists">
          {popular.map((g) => {
            const src = groupPhotoUrl(g.slug);
            return (
              <a className="p6-bpt" role="listitem" key={g.slug} href={`/blindtest/group-${g.slug}`} onClick={(e) => start(g, e)}>
                <span className="p6-bpi">
                  {src
                    ? <Image src={src} alt="" fill sizes="(max-width: 1100px) 30vw, 180px" style={{ objectFit: 'cover', objectPosition: photoFocal(g.slug) }} />
                    : <span className="p6-bpi-fb" aria-hidden="true">{initials(g.name)}</span>}
                </span>
                <b>{g.name}</b>
                <small className="ux-num">{g.songs} songs</small>
              </a>
            );
          })}
        </div>
      ) : null}
      {searching ? (
        <>
          <div className="p6-btidx" aria-label="Matching group playlists">
            {filtered.map((g) => <GroupRow key={g.slug} g={g} onStart={start} />)}
          </div>
          {filtered.length === 0 ? <p className="p6-btg-empty ux-muted" role="status">No group matches. Try the All K-pop playlist.</p> : null}
        </>
      ) : (
        <>
          <div className="p6-btidx" aria-label="All group playlists">
            {groups.slice(0, FIRST).map((g) => <GroupRow key={g.slug} g={g} onStart={start} />)}
          </div>
          {groups.length > FIRST ? (
            <details className="p6-more" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
              <summary className="ux-btn ux-btn-ghost">Show all {groups.length} groups</summary>
              <div className="p6-btidx">
                {groups.slice(FIRST).map((g) => <GroupRow key={g.slug} g={g} onStart={start} />)}
              </div>
            </details>
          ) : null}
        </>
      )}
    </>
  );
}
