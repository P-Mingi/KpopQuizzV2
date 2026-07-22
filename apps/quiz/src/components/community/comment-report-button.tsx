'use client';

import { useState } from 'react';

// Reuses the existing quiz report infra (/api/quiz/[id]/report) for a comment on
// the community wall. It flags the quiz the comment is on, since the reports
// table has no per-comment target for quiz comments; that is the "reuse existing
// infra" path from the spec, no schema change.
export function CommentReportButton({ quizId }: { quizId: string }): React.ReactElement {
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  async function report(): Promise<void> {
    if (busy || reported) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'inappropriate' }),
      });
      if (res.ok) setReported(true);
    } finally {
      setBusy(false);
    }
  }

  if (reported) return <span style={{ fontSize: 10.5, color: 'var(--txt3)', flexShrink: 0 }}>Reported</span>;
  return (
    <button
      type="button"
      onClick={() => void report()}
      disabled={busy}
      aria-label="Report comment"
      style={{ border: 'none', background: 'transparent', color: 'var(--txt3)', cursor: 'pointer', padding: 4, borderRadius: 6, flexShrink: 0, lineHeight: 0 }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    </button>
  );
}
