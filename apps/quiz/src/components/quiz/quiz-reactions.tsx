'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { playReact } from '@/lib/sounds';

type Reaction = 'too_easy' | 'perfect' | 'too_hard' | 'banger';
type Counts = Record<Reaction, number>;

const EMPTY_COUNTS: Counts = { too_easy: 0, perfect: 0, too_hard: 0, banger: 0 };

// Fixed, on-brand emote set (M1.20). DB values unchanged (extends the existing
// system); these are the on-brand labels. Score-anchored: your reaction carries
// your result, so it reads as "reacted with 9/10".
const REACTIONS: Array<{ id: Reaction; label: string }> = [
  { id: 'perfect', label: 'Aced it' },
  { id: 'banger', label: 'Fire' },
  { id: 'too_hard', label: 'Hard' },
  { id: 'too_easy', label: 'Easy' },
];
const LABEL: Record<Reaction, string> = { perfect: 'Aced it', banger: 'Fire', too_hard: 'Hard', too_easy: 'Easy' };

interface ReactResponse {
  counts: Counts; userReaction: Reaction | null;
  userScore?: number | null; userTotal?: number | null; acedCount?: number;
}

export function QuizReactions({ quizId }: { quizId: string }): React.ReactElement {
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [selected, setSelected] = useState<Reaction | null>(null);
  const [acedCount, setAcedCount] = useState(0);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [myTotal, setMyTotal] = useState<number | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [pending, setPending] = useState(false);

  function apply(data: ReactResponse): void {
    setCounts(data.counts ?? EMPTY_COUNTS);
    setSelected(data.userReaction ?? null);
    setAcedCount(data.acedCount ?? 0);
    setMyScore(data.userScore ?? null);
    setMyTotal(data.userTotal ?? null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/quiz/${quizId}/react`);
        if (!res.ok) return;
        const data: ReactResponse = await res.json();
        if (!cancelled) apply(data);
      } catch { /* non-critical */ }
    })();
    return () => { cancelled = true; };
  }, [quizId]);

  async function handleReact(reaction: Reaction): Promise<void> {
    if (pending || selected === reaction) return;
    playReact();
    setPending(true);

    const prevSelected = selected;
    const prevCounts = counts;
    const nextCounts = { ...counts };
    if (prevSelected) nextCounts[prevSelected] = Math.max(0, nextCounts[prevSelected] - 1);
    nextCounts[reaction] = nextCounts[reaction] + 1;
    setCounts(nextCounts);
    setSelected(reaction);

    try {
      const res = await fetch(`/api/quiz/${quizId}/react`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reaction }),
      });
      if (res.status === 401) { setCounts(prevCounts); setSelected(prevSelected); setNeedsAuth(true); return; }
      if (!res.ok) { setCounts(prevCounts); setSelected(prevSelected); return; }
      apply((await res.json()) as ReactResponse);
    } catch {
      setCounts(prevCounts); setSelected(prevSelected);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full mt-4">
      <p className="text-[10px] uppercase tracking-wider text-ghost mb-2">How was this quiz?</p>
      <div className="flex gap-1.5">
        {REACTIONS.map((r) => {
          const active = selected === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleReact(r.id)}
              disabled={pending}
              className={`flex-1 flex flex-col items-center justify-center px-2 py-2 rounded-xl text-[11px] font-semibold border transition-all active:scale-[0.97] ${
                active ? 'border-accent bg-accent-bg text-accent scale-105' : 'border-default bg-surface text-secondary hover:border-accent hover:text-accent'
              } ${pending ? 'cursor-wait' : 'cursor-pointer'}`}
            >
              <span>{r.label}</span>
              <span className={`text-[10px] tabular-nums mt-[1px] ${active ? 'text-accent font-bold' : 'text-ghost font-medium'}`}>{counts[r.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Score-anchored proof */}
      {selected && myScore !== null && myTotal !== null ? (
        <p className="text-[10px] text-secondary mt-2 text-center">
          You reacted <strong className="text-accent">{LABEL[selected]}</strong> with <strong className="text-primary tabular-nums">{myScore}/{myTotal}</strong>
        </p>
      ) : acedCount > 0 ? (
        <p className="text-[10px] text-ghost mt-2 text-center">
          <strong className="text-accent tabular-nums">{acedCount}</strong> {acedCount === 1 ? 'fan' : 'fans'} aced this quiz
        </p>
      ) : null}

      {needsAuth && (
        <p className="text-[10px] text-ghost mt-2 text-center">
          <Link href="/login" className="text-accent font-medium hover:underline">Sign in</Link> to rate this quiz.
        </p>
      )}
    </div>
  );
}
