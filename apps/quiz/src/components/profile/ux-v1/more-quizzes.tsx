'use client';

import { useState } from 'react';

import { QuizRows } from './rows';

import type { QuizCardData } from '@/lib/db/types';

/** "Show more" under the passport Quizzes list: the EXISTING read-only
 *  GET /api/quizzes/user?creatorId=&offset= (10 per page, published only). */
export function MoreQuizzes({ creatorId, offset, total }: { creatorId: string; offset: number; total: number }): React.ReactElement | null {
  const [more, setMore] = useState<QuizCardData[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const shown = offset + more.length;

  const load = async (): Promise<void> => {
    setBusy(true);
    setError(false);
    try {
      const r = await fetch(`/api/quizzes/user?creatorId=${encodeURIComponent(creatorId)}&offset=${shown}`);
      const d = (r.ok ? await r.json() : { quizzes: [] }) as { quizzes?: QuizCardData[] };
      const got = d.quizzes ?? [];
      if (!r.ok) setError(true);
      setMore((m) => [...m, ...got]);
      if (got.length < 10) setDone(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {more.length > 0 ? <QuizRows quizzes={more} /> : null}
      {!done && shown < total ? (
        <div className="p10-more">
          <button type="button" className="ux-btn ux-btn-ghost" onClick={() => { void load(); }} disabled={busy} aria-busy={busy || undefined}>
            {busy ? 'Loading' : `Show more (${total - shown})`}
          </button>
          {error ? <p className="ux-err" role="alert">We could not load more quizzes. Try again.</p> : null}
        </div>
      ) : null}
    </>
  );
}
