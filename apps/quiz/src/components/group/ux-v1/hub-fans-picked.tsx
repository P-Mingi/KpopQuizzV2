'use client';

import { useRef, useState } from 'react';

import { ThisOrThatBonus } from '@/components/this-or-that/bonus';
import { Icon } from '@/components/ux-v1/icon';
import { useUxToast } from '@/components/ux-v1/toast';
import { getAnonId } from '@/lib/anon-id';
import { FANS_PICKED_ID, movementView } from '@/lib/ux-v1/p3/growth';

export interface FansPickedRow {
  id: string;
  rank: number;
  title: string;
  year: number | null;
  votes: number;
  movement: number | null;
  isNew: boolean;
}

interface HubFansPickedProps {
  groupSlug: string;
  groupName: string;
  /** "STAY picked" */
  title: string;
  /** Counted votes of the group, null when unknown (then not shown). */
  votes: number | null;
  /** The group had a ranking a week ago: the movement column means something. */
  hasMovement: boolean;
  songs: FansPickedRow[];
}

const comma = (v: number): string => v.toLocaleString('en-US');

type VoteState = 'idle' | 'checking' | 'open';

/**
 * "<Fandom> picked" (SYSTEM.md 5.3, prototype #hb-fp): the group's top 10 songs
 * from fans' This or that votes (G7's nightly ranking), the counted votes, the
 * weekly movement. The whole list is in the server HTML. "Vote" asks G7's pairs
 * endpoint whether this browser still has a pair to vote on today, then mounts
 * G7's bonus card under the list; with nothing left it says so instead of
 * opening an empty block.
 */
export function HubFansPicked({ groupSlug, groupName, title, votes, hasMovement, songs }: HubFansPickedProps): React.ReactElement {
  const toast = useUxToast();
  const [state, setState] = useState<VoteState>('idle');
  const slot = useRef<HTMLDivElement>(null);

  const vote = async (): Promise<void> => {
    if (state !== 'idle') { slot.current?.scrollIntoView({ block: 'center' }); return; }
    setState('checking');
    let has = false;
    try {
      const id = getAnonId();
      const res = await fetch(`/api/duel/pairs?group=${encodeURIComponent(groupSlug)}`, { credentials: 'include', headers: id ? { 'x-duel-anon': id } : {} });
      const raw = res.ok ? (await res.json()) as { pairs?: unknown } : null;
      has = Array.isArray(raw?.pairs) && raw.pairs.length > 0;
    } catch { has = false; }
    if (!has) {
      setState('idle');
      toast(`No ${groupName} pair left to vote on today. Come back tomorrow.`);
      return;
    }
    setState('open');
    window.setTimeout(() => slot.current?.scrollIntoView({ block: 'center' }), 60);
  };

  return (
    <section className="ux-sec g8-fp" id={FANS_PICKED_ID} aria-labelledby="g8-fp-h" data-testid="hub-fans-picked">
      <div className="ux-sec-h">
        <h2 id="g8-fp-h"><Icon name="heart" className="ux-si" />{title}</h2>
        <div className="g8-fp-side">
          {votes !== null && votes > 0 ? <p><span className="ux-num">{comma(votes)}</span> votes</p> : null}
          <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => { void vote(); }} disabled={state === 'checking'} aria-expanded={state === 'open'}>Vote</button>
        </div>
      </div>
      <ol className="g8-fp-l">
        {songs.map((s) => {
          const mv = hasMovement ? movementView(s.movement, s.isNew) : null;
          return (
            <li key={s.id} className="g8-fr">
              <span className="g8-fr-rk ux-num">{s.rank}</span>
              <span className="g8-fr-t"><b>{s.title}</b>{s.year !== null ? <small>{s.year}</small> : null}</span>
              <span className="g8-fr-w ux-num">{comma(s.votes)} votes</span>
              {mv ? (
                <span className={`g8-fr-dl is-${mv.tone}`}><span aria-hidden="true">{mv.text}</span><span className="ux-sr">{mv.label}</span></span>
              ) : <span className="g8-fr-dl" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <div ref={slot} className="g8-fp-vote">
        {state === 'open' ? <ThisOrThatBonus groupSlug={groupSlug} groupName={groupName} /> : null}
      </div>
      <p className="p3-note g8-fp-note">Ranked by fans&apos; This or that votes after quizzes.</p>
    </section>
  );
}
