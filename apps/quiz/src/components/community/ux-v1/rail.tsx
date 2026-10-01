import Link from 'next/link';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { BadgeMedal } from '@/components/ux-v1/badge-medal';
import { Icon } from '@/components/ux-v1/icon';
import { PersonName } from '@/components/ux-v1/person-name';
import { compact } from '@/lib/ux-v1/p8/format';

import { CheerButton } from './actions';

import type { BadgeWatchRow, HappeningRow, Pulse } from '@/lib/ux-v1/p8/types';

// Rail panels (server): Happening now (activity_events, the pulse line, a cheer per
// row) and Badge watch (user_badges this week). Each self-hides below its floor
// (verse-laws 5: no empty panel advertised). The phone block (MobileRail) shows the
// same data in one bordered box after the third post (16.7).

/** "312 posts · 1.9k votes today · 48 new quizzes this week" (zero parts dropped). */
export function PulseLine({ pulse }: { pulse: Pulse }): React.ReactElement | null {
  const parts: React.ReactNode[] = [];
  if (pulse.posts > 0) parts.push(<span key="p"><b>{compact(pulse.posts)}</b> {pulse.posts === 1 ? 'post' : 'posts'}</span>);
  if (pulse.votesToday > 0) parts.push(<span key="v"><b>{compact(pulse.votesToday)}</b> {pulse.votesToday === 1 ? 'vote' : 'votes'} today</span>);
  if (pulse.newQuizzesWeek > 0) parts.push(<span key="q"><b>{compact(pulse.newQuizzesWeek)}</b> new {pulse.newQuizzesWeek === 1 ? 'quiz' : 'quizzes'} this week</span>);
  if (!parts.length) return null;
  return (
    <p className="p8-pl3" aria-label="Community pulse">
      {parts.map((p, i) => <span key={i}>{i > 0 ? ' · ' : ''}{p}</span>)}
    </p>
  );
}

export function HappeningRows({ rows }: { rows: HappeningRow[] }): React.ReactElement {
  return (
    <div className="p8-rows">
      {rows.map((r) => {
        const phrase = r.parts.map((p, i) => <span key={i}>{' '}{p.b ? <b>{p.t}</b> : p.t}</span>);
        return (
          <div key={r.id} className="p8-hn">
            <UxAvatar name={r.name} src={r.person?.avatarUrl ?? null} size={28} />
            <span className="p8-hn-t">
              {r.person
                ? <PersonName name={r.person.name} accent={r.person.accent} font={r.person.font} bias={r.person.bias} href={r.person.href ?? undefined} />
                : <b>{r.name}</b>}
              {r.href ? <Link href={r.href} className="p8-hn-go">{phrase}</Link> : phrase}
              <span className="p8-tm">{r.ago}</span>
            </span>
            <CheerButton eventId={r.id} count={r.cheers} who={r.person?.name ?? r.name} />
          </div>
        );
      })}
    </div>
  );
}

export function BadgeRows({ rows }: { rows: BadgeWatchRow[] }): React.ReactElement {
  return (
    <div className="p8-rows">
      {rows.map((b) => (
        <div key={b.badgeId} className="p8-hn">
          <span className="p8-medal"><BadgeMedal id={b.badgeId} earned size={32} /></span>
          <span className="p8-bw-t">
            <b>{b.name}</b>
            <span className="p8-tm">{b.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function HappeningPanel({ rows, pulse }: { rows: HappeningRow[]; pulse: Pulse }): React.ReactElement | null {
  if (!rows.length) return null;
  return (
    <section className="ux-panel" aria-labelledby="p8-hn-h">
      <h2 className="p8-panel-h" id="p8-hn-h"><span><i className="p8-live-dot" aria-hidden="true" />Happening now</span><small>live</small></h2>
      <PulseLine pulse={pulse} />
      <HappeningRows rows={rows} />
    </section>
  );
}

export function BadgePanel({ rows }: { rows: BadgeWatchRow[] }): React.ReactElement | null {
  if (!rows.length) return null;
  return (
    <section className="ux-panel" aria-labelledby="p8-bw-h">
      <h2 className="p8-panel-h" id="p8-bw-h"><span><Icon name="medal" />Badge watch</span><small>this week</small></h2>
      <BadgeRows rows={rows} />
    </section>
  );
}

/** Phones: Happening now (3 rows) + Badge watch (2 rows) in one box after the 3rd post. */
export function MobileRail({ rows, pulse, badges }: { rows: HappeningRow[]; pulse: Pulse; badges: BadgeWatchRow[] }): React.ReactElement | null {
  const hn = rows.slice(0, 3);
  const bw = badges.slice(0, 2);
  if (!hn.length && !bw.length) return null;
  return (
    <section className="p8-mrail" aria-label="Community activity">
      {hn.length ? (
        <>
          <h2 className="p8-panel-h">Happening now<small>live</small></h2>
          <PulseLine pulse={pulse} />
          <HappeningRows rows={hn} />
        </>
      ) : null}
      {bw.length ? (
        <>
          <h2 className="p8-panel-h" style={hn.length ? { marginTop: 28 } : undefined}>Badge watch<small>this week</small></h2>
          <BadgeRows rows={bw} />
        </>
      ) : null}
    </section>
  );
}
