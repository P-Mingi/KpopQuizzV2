'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { PersonCard } from '@/components/profile/person-card';
import { analytics } from '@/lib/analytics';

import type { DailyDebate as DailyDebateData, DebateComment } from '@/lib/db/queries/debate';

// F2b B3 - Daily Debate, the conversation centerpiece. Client island so the
// vote, the live split and the comment flow are interactive, but it is SSR'd
// with the baked data (question + split + comments) so the content is in the
// HTML and crawlable, and the page stays ISR.
//
// States:
//   unknown  - still checking the viewer (brief)
//   votable  - signed in, has not voted: active side buttons, comments hidden
//              (vote to reveal what people said)
//   voted    - locked, split %, both comment columns
//   anon     - locked read view + sign-in nudge on tap
//
// No streak, no XP: the debate is expression, not grind.

type Phase = 'unknown' | 'votable' | 'voted' | 'anon';

function useResetCountdown(): string {
  const [t, setT] = useState('');
  useEffect(() => {
    const calc = (): void => {
      const now = new Date();
      const tm = new Date(now);
      tm.setUTCHours(24, 0, 0, 0);
      const diff = tm.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setT(`${h}h ${m}m`);
    };
    calc();
    const iv = window.setInterval(calc, 60_000);
    return () => window.clearInterval(iv);
  }, []);
  return t;
}

export function DailyDebate({ debate }: { debate: DailyDebateData }): React.ReactElement {
  const countdown = useResetCountdown();

  const [phase, setPhase] = useState<Phase>('unknown');
  const [mySide, setMySide] = useState<'a' | 'b' | null>(null);
  const [votesA, setVotesA] = useState(debate.votesA);
  const [votesB, setVotesB] = useState(debate.votesB);
  const [commentsA, setCommentsA] = useState<DebateComment[]>(debate.commentsA);
  const [commentsB, setCommentsB] = useState<DebateComment[]>(debate.commentsB);

  // Pre-submit compose state after tapping a side.
  const [pendingSide, setPendingSide] = useState<'a' | 'b' | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [expandA, setExpandA] = useState(false);
  const [expandB, setExpandB] = useState(false);
  const lsKey = `kq_debate_${debate.date}`;

  useEffect(() => {
    // Instant lock from localStorage, then confirm with the server (covers
    // other devices / cleared storage).
    let stored: 'a' | 'b' | null = null;
    try {
      const v = localStorage.getItem(lsKey);
      if (v === 'a' || v === 'b') stored = v;
    } catch { /* storage blocked */ }
    if (stored) { setPhase('voted'); setMySide(stored); }

    let cancelled = false;
    fetch('/api/debate/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { signedIn: false, voted: false, side: null }))
      .then((d: { signedIn: boolean; voted: boolean; side: 'a' | 'b' | null }) => {
        if (cancelled) return;
        if (!d.signedIn) { setPhase((p) => (p === 'voted' ? p : 'anon')); return; }
        if (d.voted && d.side) { setPhase('voted'); setMySide(d.side); }
        else setPhase((p) => (p === 'voted' ? p : 'votable'));
      })
      .catch(() => { if (!cancelled) setPhase((p) => (p === 'voted' ? p : 'anon')); });
    return () => { cancelled = true; };
  }, [lsKey]);

  const total = votesA + votesB;
  const pctA = total > 0 ? Math.round((votesA / total) * 100) : 50;
  const pctB = 100 - pctA;
  const locked = phase === 'voted' || phase === 'anon';

  function tapSide(side: 'a' | 'b'): void {
    if (phase === 'anon') {
      setShowNudge(true);
      analytics.crossPromo('community', 'login-debate');
      return;
    }
    if (phase !== 'votable') return;
    setPendingSide(side);
  }

  async function submitVote(): Promise<void> {
    if (!pendingSide || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/debate/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ side: pendingSide, comment: commentText.trim() || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { a?: number; b?: number; error?: string };
      if (!res.ok || data.error) {
        setSubmitting(false);
        return;
      }
      if (typeof data.a === 'number') setVotesA(data.a);
      if (typeof data.b === 'number') setVotesB(data.b);
      // Drop the viewer's own comment into their column immediately.
      const text = commentText.trim();
      if (text) {
        const mine: DebateComment = {
          voteId: `me-${debate.date}`,
          person: { username: 'you', displayName: 'You', avatarUrl: null, avatarBg: '#E8457A', avatarText: '#fff', xp: 0, followerCount: 0, nameAccent: null, nameFont: null, bias: null, pinnedBadgeId: null, avatarKind: 'photo', avatarRef: null },
          comment: text,
        };
        if (pendingSide === 'a') setCommentsA((c) => [mine, ...c]);
        else setCommentsB((c) => [mine, ...c]);
      }
      try { localStorage.setItem(lsKey, pendingSide); } catch { /* ignore */ }
      setMySide(pendingSide);
      setPhase('voted');
      setPendingSide(null);
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={card}>
      <style>{CSS}</style>

      <div className="dbt-head">
        <p style={seclab}>Daily debate</p>
        {countdown && <span className="dbt-reset">{countdown}</span>}
      </div>

      <p className="dbt-question">{debate.question}</p>

      {/* Side buttons + split bar */}
      <div className="dbt-sides">
        <SideButton
          label={debate.sideA}
          pct={pctA}
          locked={locked}
          chosen={mySide === 'a'}
          pending={pendingSide === 'a'}
          onTap={() => tapSide('a')}
          side="a"
        />
        <SideButton
          label={debate.sideB}
          pct={pctB}
          locked={locked}
          chosen={mySide === 'b'}
          pending={pendingSide === 'b'}
          onTap={() => tapSide('b')}
          side="b"
        />
      </div>

      {locked && (
        <div className="dbt-bar" aria-hidden="true">
          <span className="dbt-bar-a" style={{ width: `${pctA}%` }} />
          <span className="dbt-bar-b" style={{ width: `${pctB}%` }} />
        </div>
      )}
      {locked && (
        <p className="dbt-tally">{total} {total === 1 ? 'vote' : 'votes'} so far</p>
      )}

      {/* Compose box after tapping a side */}
      {pendingSide && phase === 'votable' && (
        <div className="dbt-compose">
          <p className="dbt-compose-label">
            You picked <strong>{pendingSide === 'a' ? debate.sideA : debate.sideB}</strong>. Defend your pick (optional).
          </p>
          <textarea
            className="dbt-textarea"
            placeholder="280 max"
            maxLength={280}
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <div className="dbt-compose-foot">
            <span className="dbt-count">{commentText.length}/280</span>
            <button type="button" className="dbt-post" disabled={submitting} onClick={() => void submitVote()}>
              {submitting ? 'Posting...' : 'Post vote'}
            </button>
          </div>
        </div>
      )}

      {/* Anon sign-in nudge */}
      {showNudge && phase === 'anon' && (
        <div className="dbt-nudge">
          <p>Sign in to vote in today&apos;s debate</p>
          <Link href="/login" className="btn-outline" style={{ textDecoration: 'none' }}>Sign in</Link>
        </div>
      )}

      {/* Comments: visible once voted, or to anon (read view). Hidden for a
          signed-in user who has not voted yet, so voting reveals the room. */}
      {(phase === 'voted' || phase === 'anon') && (debate.totalCommentsA > 0 || debate.totalCommentsB > 0) && (
        <div className="dbt-cols">
          <CommentColumn label={debate.sideA} comments={commentsA} total={debate.totalCommentsA} expanded={expandA} onExpand={() => setExpandA(true)} />
          <CommentColumn label={debate.sideB} comments={commentsB} total={debate.totalCommentsB} expanded={expandB} onExpand={() => setExpandB(true)} />
        </div>
      )}
    </section>
  );
}

function SideButton({ label, pct, locked, chosen, pending, onTap, side }: {
  label: string; pct: number; locked: boolean; chosen: boolean; pending: boolean; onTap: () => void; side: 'a' | 'b';
}): React.ReactElement {
  return (
    <button
      type="button"
      className={`dbt-side dbt-side-${side} ${chosen ? 'is-chosen' : ''} ${pending ? 'is-pending' : ''}`}
      onClick={onTap}
      aria-pressed={chosen}
    >
      <span className="dbt-side-label">{label}</span>
      {locked && <span className="dbt-side-pct">{pct}%</span>}
    </button>
  );
}

function CommentColumn({ label, comments, total, expanded, onExpand }: {
  label: string; comments: DebateComment[]; total: number; expanded: boolean; onExpand: () => void;
}): React.ReactElement {
  const shown = expanded ? comments : comments.slice(0, 5);
  return (
    <div className="dbt-col">
      <p className="dbt-col-head">{label} <span className="dbt-col-n">{total}</span></p>
      {shown.length === 0 ? (
        <p className="dbt-empty">No comments yet.</p>
      ) : (
        shown.map((c) => <CommentRow key={c.voteId} c={c} />)
      )}
      {!expanded && comments.length > 5 && (
        <button type="button" className="dbt-seeall" onClick={onExpand}>See all {comments.length}</button>
      )}
    </div>
  );
}

function CommentRow({ c }: { c: DebateComment }): React.ReactElement {
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);
  const isMine = c.voteId.startsWith('me-');

  async function report(): Promise<void> {
    if (busy || reported || isMine) return;
    setBusy(true);
    try {
      const res = await fetch('/api/debate/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vote_id: c.voteId, reason: 'inappropriate' }),
      });
      if (res.ok) setReported(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dbt-cmt">
      <div className="dbt-cmt-top">
        {isMine ? (
          <span className="dbt-cmt-you">You</span>
        ) : (
          <PersonCard person={c.person} compact showFollow={false} />
        )}
        {!isMine && (
          reported
            ? <span className="dbt-reported">Reported</span>
            : <button type="button" className="dbt-report" disabled={busy} onClick={() => void report()} aria-label="Report comment">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
              </button>
        )}
      </div>
      <p className="dbt-cmt-text">{c.comment}</p>
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--brand)', borderRadius: 16, padding: 16, marginBottom: 12,
};
const seclab: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--brand)', margin: 0,
};

const CSS = `
.dbt-head{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.dbt-reset{ font-size:11px; color:var(--txt3); font-variant-numeric:tabular-nums; }
.dbt-question{ font-family:var(--font-display); font-size:18px; font-weight:800; line-height:1.25; color:var(--txt1); margin:8px 0 14px; letter-spacing:-0.01em; }
.dbt-sides{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.dbt-side{
  display:flex; flex-direction:column; align-items:center; gap:3px; min-height:56px; justify-content:center;
  border-radius:12px; border:1.5px solid var(--border); background:var(--surface-alt);
  color:var(--txt1); font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; padding:8px 10px;
  transition:border-color .16s ease, background .16s ease, transform .1s ease;
}
.dbt-side:active{ transform:scale(0.98); }
.dbt-side.is-pending{ border-color:var(--brand); background:var(--brand-light); }
.dbt-side.is-chosen{ border-color:var(--brand); background:var(--brand-light); color:var(--brand-dark); }
.dbt-side-label{ text-align:center; line-height:1.2; }
.dbt-side-pct{ font-size:15px; font-weight:800; color:var(--brand); font-variant-numeric:tabular-nums; }
.dbt-bar{ display:flex; height:6px; border-radius:9999px; overflow:hidden; margin-top:10px; background:var(--surface-alt); }
.dbt-bar-a{ background:var(--brand-btn); }
.dbt-bar-b{ background:var(--brand); opacity:0.4; }
.dbt-tally{ font-size:11px; color:var(--txt3); margin:6px 0 0; text-align:center; font-variant-numeric:tabular-nums; }
.dbt-compose{ margin-top:12px; border-top:1px solid var(--border); padding-top:12px; }
.dbt-compose-label{ font-size:12.5px; color:var(--txt2); margin:0 0 8px; }
.dbt-textarea{
  width:100%; box-sizing:border-box; border:1px solid var(--border); border-radius:10px;
  background:var(--bg-primary); color:var(--txt1); font-family:inherit; font-size:14px;
  padding:9px 11px; resize:vertical; min-height:44px; outline:none; line-height:1.45;
}
.dbt-textarea:focus{ border-color:var(--brand); }
.dbt-compose-foot{ display:flex; align-items:center; justify-content:space-between; margin-top:8px; }
.dbt-count{ font-size:11px; color:var(--txt3); font-variant-numeric:tabular-nums; }
.dbt-post{
  min-height:40px; padding:0 20px; border-radius:10px; border:none; cursor:pointer;
  background:var(--brand-btn); color:#fff; font-family:inherit; font-size:13px; font-weight:700;
  transition:background .16s ease, opacity .16s ease;
}
.dbt-post:hover:not(:disabled){ background:var(--brand-btn-hover); }
.dbt-post:disabled{ opacity:0.6; cursor:default; }
.dbt-nudge{
  margin-top:12px; padding:12px; border-radius:12px; background:var(--surface-alt);
  border:1px solid var(--border); text-align:center;
}
.dbt-nudge p{ font-size:13px; color:var(--txt2); margin:0 0 8px; }
.dbt-cols{ display:grid; grid-template-columns:1fr; gap:14px; margin-top:16px; border-top:1px solid var(--border); padding-top:14px; }
@media (min-width:520px){ .dbt-cols{ grid-template-columns:1fr 1fr; gap:12px; } }
.dbt-col-head{ font-size:12px; font-weight:800; color:var(--txt1); margin:0 0 8px; display:flex; align-items:center; gap:6px; }
.dbt-col-n{ font-size:11px; font-weight:700; color:var(--txt3); font-variant-numeric:tabular-nums; }
.dbt-empty{ font-size:12px; color:var(--txt3); margin:0; }
.dbt-cmt{ padding:8px 0; border-top:1px solid var(--border); }
.dbt-cmt:first-of-type{ border-top:none; }
.dbt-cmt-top{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.dbt-cmt-you{ font-size:13px; font-weight:700; color:var(--brand); }
.dbt-cmt-text{ font-size:13px; color:var(--txt2); margin:4px 0 0; line-height:1.45; word-break:break-word; }
.dbt-report{ border:none; background:transparent; color:var(--txt3); cursor:pointer; padding:4px; border-radius:6px; flex-shrink:0; }
.dbt-report:hover{ color:var(--wrong,#c0392b); }
.dbt-reported{ font-size:10.5px; color:var(--txt3); flex-shrink:0; }
.dbt-seeall{ margin-top:8px; border:none; background:transparent; color:var(--brand); font-family:inherit; font-size:12px; font-weight:700; cursor:pointer; padding:2px 0; }
`;
