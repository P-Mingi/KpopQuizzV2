'use client';

import { useEffect, useState } from 'react';

// V-ESSAYS-MAX step 3 - the reaction control: a single heart, counts only. One
// per real user (server-enforced); logged-out is sent to sign in. No number is
// shown below the honest real count (it starts at 0 and reflects real users).
export function EssayReactions({ essayId, groupSlug }: { essayId: number; groupSlug: string }): React.ReactElement {
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch(`/api/verse/essays/reactions?essay_id=${essayId}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setCount(d.count ?? 0); setMine(!!d.mine); setSignedIn(!!d.signedIn); } }).catch(() => {});
  }, [essayId]);

  async function toggle(): Promise<void> {
    if (!signedIn) { window.location.href = `/login?returnTo=/verse/${groupSlug}/essays/${essayId}`; return; }
    // Optimistic, then reconcile to the server's real count.
    setMine((m) => !m); setCount((c) => c + (mine ? -1 : 1));
    const res = await fetch('/api/verse/essays/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ essay_id: essayId }) });
    const d = await res.json().catch(() => null);
    if (d && typeof d.count === 'number') { setCount(d.count); setMine(!!d.mine); }
  }

  return (
    <button type="button" onClick={() => void toggle()} aria-pressed={mine} aria-label={mine ? 'Remove your reaction' : 'React to this essay'}
      className="v-tap inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 text-sm font-bold"
      style={mine ? { borderColor: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta, var(--verse-accent))', background: 'var(--verse-soft)' } : { borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill={mine ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
      {count > 0 ? <span className="tabular-nums">{count}</span> : null}
    </button>
  );
}
