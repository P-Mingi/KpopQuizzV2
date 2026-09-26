'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';
import { percents, plural } from '@/lib/ux-v1/p8/format';

import { useP8Viewer, useRequireAuth } from './viewer';

import type { TodayDebate } from '@/lib/ux-v1/p8/types';

// Today's daily debate in the rail (desktop panel) and on phones (the surface box on
// top of the feed): tap a side = one vote (POST /api/debate/vote { side }, the
// existing one-per-day RPC), then the split shows. The viewer's vote comes from the
// existing GET /api/debate/me, and the same localStorage lock as the legacy island
// (kq_debate_<date>) so both surfaces agree. No XP, no streak (the route's rule).

type Side = 'a' | 'b';

export function useDebateVote(debate: TodayDebate): {
  side: Side | null; votes: [number, number]; busy: boolean; vote: (s: Side, comment?: string) => Promise<boolean>;
} {
  const v = useP8Viewer();
  const toast = useUxToast();
  const announce = useAnnounce();
  const [side, setSide] = useState<Side | null>(null);
  const [votes, setVotes] = useState<[number, number]>(debate.votes);
  const [busy, setBusy] = useState(false);
  const lsKey = `kq_debate_${debate.date}`;

  useEffect(() => {
    try { const s = localStorage.getItem(lsKey); if (s === 'a' || s === 'b') setSide(s); } catch { /* storage blocked */ }
  }, [lsKey]);

  useEffect(() => {
    if (!v.signedIn) return;
    let off = false;
    fetch('/api/debate/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { voted?: boolean; side?: Side | null } | null) => { if (!off && d?.voted && d.side) setSide(d.side); })
      .catch(() => {});
    return () => { off = true; };
  }, [v.signedIn]);

  const vote = async (s: Side, comment?: string): Promise<boolean> => {
    if (busy || side) return false;
    setBusy(true);
    let data: { a?: number; b?: number; error?: string } = {};
    let ok = false;
    try {
      const r = await fetch('/api/debate/vote', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(comment ? { side: s, comment } : { side: s }),
      });
      data = (await r.json().catch(() => ({}))) as typeof data;
      ok = r.ok && !data.error;
    } catch { ok = false; }
    setBusy(false);
    if (!ok) {
      toast(data.error === 'no_debate' ? 'Today\'s debate is not open yet.' : 'Your vote did not go through. Try again.');
      return false;
    }
    setSide(s);
    if (typeof data.a === 'number' && typeof data.b === 'number') setVotes([data.a, data.b]);
    try { localStorage.setItem(lsKey, s); } catch { /* storage blocked */ }
    toast('Vote counted');
    announce(`You voted ${s === 'a' ? debate.sides[0] : debate.sides[1]}.`);
    return true;
  };

  return { side, votes, busy, vote };
}

export function DebatePanel({ debate, variant = 'rail' }: { debate: TodayDebate; variant?: 'rail' | 'mobile' }): React.ReactElement {
  const v = useP8Viewer();
  const requireAuth = useRequireAuth();
  const { side, votes, busy, vote } = useDebateVote(debate);
  const total = votes[0] + votes[1];
  const pct = percents(votes);
  const done = side !== null;
  const pendingId = `p8-debate:${debate.date}`;

  useEffect(() => {
    if (!v.signedIn) return;
    const p = takePendingAction(pendingId);
    const s = (p?.payload as { side?: Side } | undefined)?.side;
    if (s === 'a' || s === 'b') void vote(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the session is known
  }, [v.signedIn]);

  const tap = (s: Side): void => {
    if (done) return;
    requireAuth({ title: 'Sign in to vote', sub: 'One vote per fan per day. No password needed.', action: { id: pendingId, payload: { side: s } } }, () => { void vote(s); });
  };

  const buttons = (
    <div className={`p8-vote${done ? ' is-done' : ''}`} role="group" aria-label={`Vote: ${debate.question}`}>
      {debate.sides.map((label, i) => {
        const s: Side = i === 0 ? 'a' : 'b';
        return (
          <button key={s} type="button" aria-pressed={side === s} aria-disabled={done || busy} onClick={() => tap(s)}>
            <span>{label}</span>
            {done ? <b>{pct[i]}%</b> : null}
          </button>
        );
      })}
    </div>
  );
  const count = plural(total, 'vote');
  const after = done ? (
    <p className="p8-vote-note">
      You voted. <Link href={`/community/debate/${debate.date}#replies`} className="ux-lnk" style={{ fontSize: 13 }}>See the replies</Link>
    </p>
  ) : null;

  if (variant === 'mobile') {
    return (
      <div className="p8-mine">
        <div className="p8-plabel"><Icon name="debate" size="sm" />Daily debate · {count}</div>
        <p className="p8-dq">{debate.question}</p>
        {buttons}
        {after}
      </div>
    );
  }
  return (
    <section className="ux-panel" aria-labelledby="p8-dd-h">
      <h2 className="p8-panel-h" id="p8-dd-h"><span><Icon name="debate" />Daily debate</span><small>{count}</small></h2>
      <p className="p8-dq">{debate.question}</p>
      {buttons}
      {after}
    </section>
  );
}
