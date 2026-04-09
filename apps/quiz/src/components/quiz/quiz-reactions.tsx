'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { playReact } from '@/lib/sounds';

type Reaction = 'too_easy' | 'perfect' | 'too_hard' | 'banger';

type Counts = Record<Reaction, number>;

const EMPTY_COUNTS: Counts = {
  too_easy: 0,
  perfect: 0,
  too_hard: 0,
  banger: 0,
};

const REACTIONS: Array<{ id: Reaction; label: string }> = [
  { id: 'too_easy', label: 'too easy' },
  { id: 'perfect', label: 'perfect' },
  { id: 'too_hard', label: 'too hard' },
  { id: 'banger', label: 'banger' },
];

interface Props {
  quizId: string;
}

/**
 * Four-pill reaction row shown after the result screen. Loads counts + the
 * caller's current reaction on mount, upserts on tap. If the viewer is not
 * authenticated, the first tap shows a small "Sign in to react" hint instead
 * of hitting the API.
 */
export function QuizReactions({ quizId }: Props): React.ReactElement {
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [selected, setSelected] = useState<Reaction | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [pending, setPending] = useState(false);

  // Load initial counts + the user's own reaction
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/quiz/${quizId}/react`);
        if (!res.ok) return;
        const data: { counts: Counts; userReaction: Reaction | null } = await res.json();
        if (cancelled) return;
        setCounts(data.counts ?? EMPTY_COUNTS);
        setSelected(data.userReaction ?? null);
      } catch {
        // Non-critical; show empty state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  async function handleReact(reaction: Reaction): Promise<void> {
    if (pending || selected === reaction) return;
    playReact();
    setPending(true);

    // Optimistic update
    const prevSelected = selected;
    const nextCounts = { ...counts };
    if (prevSelected) nextCounts[prevSelected] = Math.max(0, nextCounts[prevSelected] - 1);
    nextCounts[reaction] = nextCounts[reaction] + 1;
    setCounts(nextCounts);
    setSelected(reaction);

    try {
      const res = await fetch(`/api/quiz/${quizId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });

      if (res.status === 401) {
        // Roll back + prompt sign-in
        setCounts(counts);
        setSelected(prevSelected);
        setNeedsAuth(true);
        return;
      }

      if (!res.ok) {
        // Roll back on any other failure
        setCounts(counts);
        setSelected(prevSelected);
        return;
      }

      const data: { counts: Counts; userReaction: Reaction } = await res.json();
      setCounts(data.counts ?? nextCounts);
      setSelected(data.userReaction);
    } catch {
      // Roll back on network error
      setCounts(counts);
      setSelected(prevSelected);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full mt-4">
      <p className="text-[10px] uppercase tracking-wider text-ghost mb-2">
        How was this quiz?
      </p>
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
                active
                  ? 'border-accent bg-accent-bg text-accent scale-105'
                  : 'border-default bg-surface text-secondary hover:border-accent hover:text-accent'
              } ${pending ? 'cursor-wait' : 'cursor-pointer'}`}
            >
              <span>{r.label}</span>
              <span
                className={`text-[10px] tabular-nums mt-[1px] ${
                  active ? 'text-accent font-bold' : 'text-ghost font-medium'
                }`}
              >
                {counts[r.id]}
              </span>
            </button>
          );
        })}
      </div>

      {needsAuth && (
        <p className="text-[10px] text-ghost mt-2 text-center">
          <Link href="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>{' '}
          to rate this quiz.
        </p>
      )}
    </div>
  );
}
