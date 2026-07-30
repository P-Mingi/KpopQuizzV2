'use client';

import { useState } from 'react';

import type { PollTally } from '@/lib/verse/presentation/poll';

// W-CUSTOM step 5 - the poll vote island. Renders the question + options; a click
// posts one real vote (server enforces one per user via UNIQUE). Signed-out users
// are routed to sign in. After voting (or if already voted) it shows the tallies.
export function PollVote({ initial, groupSlug }: { initial: PollTally; groupSlug: string }): React.ReactElement {
  const [counts, setCounts] = useState<number[]>(initial.counts);
  const [total, setTotal] = useState(initial.total);
  const [voted, setVoted] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function vote(i: number): Promise<void> {
    if (busy || voted != null) return;
    setBusy(true);
    const r = await fetch('/api/verse/poll/vote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ poll_id: initial.poll.id, option_index: i }),
    });
    setBusy(false);
    if (r.status === 401) { window.location.href = `/login?returnTo=/verse/${groupSlug}`; return; }
    if (!r.ok) return;
    const d = await r.json();
    if (Array.isArray(d.counts)) { setCounts(d.counts); setTotal(d.total ?? 0); setVoted(i); }
  }

  const showResults = voted != null;
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Space poll</h3>
      <p className="mb-3 text-sm font-semibold text-primary">{initial.poll.question}</p>
      <ul className="flex flex-col gap-2">
        {initial.poll.options.map((opt, i) => {
          const pct = total > 0 ? Math.round((counts[i]! / total) * 100) : 0;
          return (
            <li key={i}>
              <button
                type="button" onClick={() => vote(i)} disabled={busy || showResults}
                className="relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-[13px] font-semibold disabled:cursor-default"
                style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}
                aria-label={`Vote ${opt}`}
              >
                {showResults ? <span className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: 'var(--verse-soft-strong)' }} aria-hidden /> : null}
                <span className="relative flex justify-between">
                  <span>{opt}</span>
                  {showResults ? <span className="tabular-nums">{pct}%</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {showResults ? <p className="mt-2 text-[11px] text-tertiary tabular-nums">{total} vote{total === 1 ? '' : 's'}</p> : null}
    </div>
  );
}
