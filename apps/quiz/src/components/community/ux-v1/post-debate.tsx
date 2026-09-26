'use client';

import { useEffect, useId, useState } from 'react';

import { useUxToast } from '@/components/ux-v1/toast';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';
import { closesIn, plural } from '@/lib/ux-v1/p8/format';

import { DebateBars } from './feed-card';
import { REPLY_EVENT } from './replies';
import { useDebateVote } from './debate-panel';
import { useP8Viewer, useRequireAuth } from './viewer';

import type { P8Comment } from '@/lib/ux-v1/p8/post';
import type { DebateData } from '@/lib/ux-v1/p8/types';

// The vote block of a debate post (DESIGN-SPEC 13.2 DEBATE: one vote per fan,
// results after voting). The daily debate's reply rides with the vote (the existing
// RPC stores one vote + one optional comment per fan per day), so the optional reply
// field sits right under the sides: a tap on a side sends both. A fan debate votes
// through /api/ux-v1/p8/debates/<id>/vote (pending store).

export function DailyDebateVote({ date, question, sides, votes, open }: { date: string; question: string; sides: [string, string]; votes: [number, number]; open: boolean }): React.ReactElement {
  const v = useP8Viewer();
  const requireAuth = useRequireAuth();
  const uid = useId().replace(/:/g, '');
  const { side, votes: live, busy, vote } = useDebateVote({ date, question, sides, votes });
  const [text, setText] = useState('');
  const total = live[0] + live[1];
  const pendingId = `p8-debate-post:${date}`;
  const debate: DebateData = { daily: true, open, closesAt: null, comments: 0, total, options: [{ label: sides[0], votes: live[0] }, { label: sides[1], votes: live[1] }] };

  const cast = async (s: 'a' | 'b', comment: string): Promise<void> => {
    const ok = await vote(s, comment || undefined);
    if (ok && comment) {
      const c: P8Comment = {
        id: `vote-${Date.now()}`, likeType: 'debate_vote', person: v.username ? { name: v.displayName ?? v.username, username: v.username, href: `/u/${v.username}`, avatarUrl: v.avatarUrl, accent: null, font: null, bias: null, level: null, levelTitle: null, isSystem: false } : null,
        name: v.displayName ?? v.username ?? 'You', body: comment, meta: `voted ${s === 'a' ? sides[0] : sides[1]}`, at: new Date().toISOString(), ago: 'just now', likes: null, replies: [], canReply: false,
      };
      window.dispatchEvent(new CustomEvent(REPLY_EVENT, { detail: c }));
      setText('');
    }
  };

  useEffect(() => {
    if (!v.signedIn) return;
    const p = takePendingAction(pendingId);
    const pl = p?.payload as { side?: 'a' | 'b'; comment?: string } | undefined;
    if (pl?.side === 'a' || pl?.side === 'b') void cast(pl.side, pl.comment ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the session is known
  }, [v.signedIn]);

  if (side || !open) {
    return (
      <>
        <DebateBars debate={debate} label={`Results: ${question}`} />
        <p className="p8-help">
          {[plural(total, 'vote'), open ? closesIn(new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString()) : 'closed'].join(' · ')}
          {side ? ` · you voted ${side === 'a' ? sides[0] : sides[1]}` : ''}
        </p>
      </>
    );
  }

  const tap = (s: 'a' | 'b'): void => {
    const comment = text.trim();
    requireAuth({ title: 'Sign in to vote', sub: 'One vote per fan per day, with an optional reply. No password needed.', action: { id: pendingId, payload: { side: s, comment } } }, () => { void cast(s, comment); });
  };

  return (
    <>
      <div className="p8-vote" role="group" aria-label={`Vote: ${question}`}>
        {sides.map((label, i) => (
          <button key={label} type="button" aria-pressed={false} aria-disabled={busy} onClick={() => tap(i === 0 ? 'a' : 'b')}><span>{label}</span></button>
        ))}
      </div>
      <p className="p8-help">{plural(total, 'vote')} · {closesIn(new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString())} · results show after you vote</p>
      <div className="ux-field" style={{ marginTop: 16, maxWidth: 560 }}>
        <label htmlFor={`p8-dv-${uid}`} style={{ fontSize: 14 }}>Add a reply to your vote <small>Optional</small></label>
        <textarea id={`p8-dv-${uid}`} className="ux-inp" rows={2} maxLength={280} value={text} placeholder="Why this side? Then tap it above." onChange={(e) => setText(e.target.value)} style={{ minHeight: 48 }} />
      </div>
    </>
  );
}

export function FanDebateVote({ id, question, debate }: { id: number; question: string; debate: DebateData }): React.ReactElement {
  const v = useP8Viewer();
  const toast = useUxToast();
  const requireAuth = useRequireAuth();
  const [picked, setPicked] = useState<number | null>(null);
  const [counts, setCounts] = useState(debate.options.map((o) => o.votes));
  const [busy, setBusy] = useState(false);
  const pendingId = `p8-fan-vote:${id}`;

  const cast = async (i: number): Promise<void> => {
    if (busy || picked !== null) return;
    setBusy(true);
    let ok = false;
    let data: { counts?: number[]; error?: string } = {};
    try {
      const r = await fetch(`/api/ux-v1/p8/debates/${id}/vote`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ option_index: i }) });
      data = (await r.json().catch(() => ({}))) as typeof data;
      ok = r.ok;
    } catch { ok = false; }
    setBusy(false);
    if (!ok) { toast(data.error === 'closed' ? 'This debate is closed.' : 'Your vote did not go through. Try again.'); return; }
    setPicked(i);
    if (Array.isArray(data.counts)) setCounts(data.counts);
    toast('Vote counted');
  };

  useEffect(() => {
    if (!v.signedIn) return;
    const p = takePendingAction(pendingId);
    const i = (p?.payload as { i?: number } | undefined)?.i;
    if (typeof i === 'number') void cast(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the session is known
  }, [v.signedIn]);

  const total = counts.reduce((s, c) => s + c, 0);
  if (picked !== null || !debate.open) {
    const shown: DebateData = { ...debate, total, options: debate.options.map((o, i) => ({ ...o, votes: counts[i] ?? 0 })) };
    return (
      <>
        <DebateBars debate={shown} label={`Results: ${question}`} />
        <p className="p8-help">{plural(total, 'vote')} · {debate.open ? closesIn(debate.closesAt) : 'closed'}</p>
      </>
    );
  }
  return (
    <>
      <div className="p8-vote" role="group" aria-label={`Vote: ${question}`}>
        {debate.options.map((o, i) => (
          <button key={i} type="button" aria-pressed={false} aria-disabled={busy} onClick={() => requireAuth({ title: 'Sign in to vote', sub: 'One vote per fan. No password needed.', action: { id: pendingId, payload: { i } } }, () => { void cast(i); })}>
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      <p className="p8-help">{plural(total, 'vote')} · {closesIn(debate.closesAt)} · results show after you vote</p>
    </>
  );
}
