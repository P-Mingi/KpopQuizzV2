'use client';

import { useEffect, useState } from 'react';

// Your standing on THIS quiz (Workstream M, M1.19). CLIENT island so /q stays
// static/ISR. A concrete, bounded per-quiz rank (allowed); never a global
// percentile / "top X%". Renders nothing when signed out.
interface RankData { signedIn: boolean; played: boolean; bestScore?: number; total?: number; rank?: number; totalPlayers?: number }

export function QuizMyRank({ quizId }: { quizId: string }): React.ReactElement | null {
  const [data, setData] = useState<RankData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/quiz/${quizId}/my-rank`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: RankData | null) => { if (!cancelled) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [quizId]);

  if (!data || !data.signedIn) return null;

  const base: React.CSSProperties = {
    marginTop: 10, padding: '10px 12px', borderRadius: 10,
    background: 'var(--brand-light)', border: '1px solid var(--brand)',
    fontSize: 12.5, color: 'var(--txt1)', fontWeight: 600,
  };

  if (!data.played) {
    return <div style={base}>Play this quiz to claim your spot on the board.</div>;
  }

  return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <span>Your best: <strong style={{ color: 'var(--brand)' }}>{data.bestScore}/{data.total}</strong></span>
      <span style={{ color: 'var(--txt2)' }}>Rank <strong style={{ color: 'var(--txt1)' }}>#{data.rank}</strong> of {data.totalPlayers}</span>
    </div>
  );
}
