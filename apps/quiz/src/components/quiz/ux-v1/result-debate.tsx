'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { markShownThisVisit } from '@/lib/result-debate/decide';
import { castResultDebateVote } from '@/lib/result-debate/vote';

import type { ResultDebateOpen } from '@/lib/result-debate/decide';

// Bunnyverse: this build's base path ('' on kpop and hub, '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

type Side = 'a' | 'b';

/**
 * The debate block under a quiz result. It is only ever mounted when decideResultDebate said yes, with the question
 * already in hand, so it takes its final size at first paint. After the vote the split fills the SAME two buttons
 * (the percent sits inside each), and the status line keeps its two-line room: nothing around it moves.
 * The vote is the normal debate vote (POST /api/debate/vote, one per day, no XP, no streak), measured from=result.
 */
export function ResultDebate({ debate }: { debate: ResultDebateOpen }): React.ReactElement {
  const [side, setSide] = useState<Side | null>(null);
  const [pct, setPct] = useState<[number, number] | null>(null);
  const [state, setState] = useState<'open' | 'sending' | 'ok' | 'failed'>('open');
  const first = useRef<HTMLButtonElement>(null);

  // once per visit: the block counts as shown from the moment it is on screen
  useEffect(() => { markShownThisVisit(); }, []);

  const vote = (s: Side): void => {
    if (state === 'sending' || state === 'ok') return;
    setState('sending');
    void castResultDebateVote(s, debate.date, BASE_PATH).then((r) => {
      if (!r.ok) { setState('failed'); return; }
      setSide(r.side);
      setPct(r.pct);
      setState('ok');
    });
  };

  const done = state === 'ok';
  const label = (s: Side): string => (s === 'a' ? debate.sideA : debate.sideB);

  let message: React.ReactNode = 'Tap a side. One vote a day.';
  if (state === 'sending') message = 'Saving your vote.';
  else if (state === 'failed') message = 'Your vote was not saved. Tap again.';
  else if (done && pct && side) message = <>You voted <b>{label(side)}</b>. <b>{pct[side === 'a' ? 0 : 1]}%</b> of fans agree.</>;
  else if (done) message = <>You voted <b>{side ? label(side) : ''}</b>. Thanks.</>;

  const option = (s: Side): React.ReactElement => {
    const share = pct ? (s === 'a' ? pct[0] : pct[1]) : null;
    const picked = done && side === s;
    return (
      <button
        type="button"
        ref={s === 'a' ? first : undefined}
        className={`ux-rdb-o${picked ? ' is-picked' : ''}`}
        onClick={() => vote(s)}
        aria-disabled={done || state === 'sending' ? true : undefined}
        aria-pressed={done ? picked : undefined}
        data-side={s}
      >
        <b>{label(s)}</b>
        <span className="ux-rdb-pc ux-num" aria-hidden={share === null}>{share !== null ? `${share}%` : ''}</span>
        <span className="ux-rdb-fill" style={share !== null ? { width: `${share}%` } : undefined} aria-hidden="true" />
      </button>
    );
  };

  return (
    <section className="ux-tot ux-rdb" data-testid="result-debate" data-state={done ? 'voted' : 'open'} aria-labelledby="rdb-h">
      <span className="ux-kicker"><Icon name="debate" />Daily debate</span>
      <h2 id="rdb-h">{debate.question}</h2>
      <div className={`ux-rdb-g${done ? ' is-voted' : ''}`} role="group" aria-label={`Vote: ${debate.question}`}>
        {option('a')}
        <span className="ux-tot-vs">or</span>
        {option('b')}
      </div>
      <div className="ux-tot-f ux-rdb-f">
        <span role="status" data-testid="result-debate-msg">{message}</span>
      </div>
    </section>
  );
}
