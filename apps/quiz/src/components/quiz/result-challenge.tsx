'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/toast-provider';
import { analytics } from '@/lib/analytics';
import { getAnonId } from '@/lib/anon-id';

// W2 PART A - the trigger. Spawns a challenge at the emotional peak (the quiz
// result screen) instead of from a nav entry, and carries the run into it: the
// opponent faces the SAME quiz, the SAME questions, and THIS score to beat.
//
// The old "Battle a fan" CTA sent the player to /battle?quiz=<id>, which minted a
// fresh unrelated question set, so nothing was at stake. This posts the run that
// was just played to POST /api/battle/challenge.
//
// Guests are never gated: the whole flow works on an anon hash, exactly like the
// rest of the battle system. Signing in only attaches a name.

export interface ResultChallengeQuestion {
  question: string;
  options?: string[];
  correct: number | boolean;
}

interface ResultChallengeProps {
  quizId: string;
  quizTitle: string;
  groupSlug: string;
  score: number;
  maxScore: number;
  timeTakenSec: number;
  questions: ResultChallengeQuestion[];
  answers: (number | null)[];
}

/**
 * The battle format is 4-option multiple choice with a numeric correct index.
 * Clue quizzes (no options) and any question storing `correct` as a boolean cannot
 * be replayed faithfully, so the block hides itself rather than shipping a battle
 * that does not match the run. Min-gate: no dead doors.
 */
export function canChallenge(questions: ResultChallengeQuestion[]): boolean {
  return (
    questions.length > 0 &&
    questions.every(
      (q) => Array.isArray(q.options) && q.options.length >= 2 && typeof q.correct === 'number',
    )
  );
}

export function ResultChallenge({
  quizId,
  quizTitle,
  groupSlug,
  score,
  maxScore,
  timeTakenSec,
  questions,
  answers,
}: ResultChallengeProps): React.ReactElement | null {
  const { showToast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<'friend' | 'random' | null>(null);
  const [emptyPool, setEmptyPool] = useState(false);
  // One challenge per result screen: both buttons reuse it instead of opening a
  // second identical battle (and burning the per-hour cap).
  const battleIdRef = useRef<string | null>(null);

  const perQuestion = questions.map((q, i) => answers[i] === q.correct);

  const createChallenge = useCallback(async (): Promise<string | null> => {
    if (battleIdRef.current) return battleIdRef.current;
    try {
      const res = await fetch('/api/battle/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          questions: questions.map((q) => ({ question: q.question, options: q.options })),
          score,
          per_question: perQuestion,
          time_ms: Math.max(0, Math.round(timeTakenSec * 1000)),
          anon_id: getAnonId(),
        }),
      });
      if (res.status === 429) {
        showToast('You have opened a lot of challenges. Try again in a bit.', 'info');
        return null;
      }
      const data = (await res.json()) as { battleId?: string };
      if (!res.ok || !data.battleId) {
        showToast('Could not create the challenge.', 'error');
        return null;
      }
      battleIdRef.current = data.battleId;
      return data.battleId;
    } catch {
      showToast('Could not create the challenge.', 'error');
      return null;
    }
  }, [quizId, questions, score, perQuestion, timeTakenSec, showToast]);

  // PART C: the share IS the challenge. Same ?b= accept flow, same utm tags as the
  // existing battle copy-link, but the text carries the real score and quiz title.
  const onChallengeFriend = useCallback(async () => {
    setBusy('friend');
    const battleId = await createChallenge();
    setBusy(null);
    if (!battleId) return;

    const url = `${window.location.origin}/battle?b=${battleId}&utm_source=share&utm_medium=social&utm_campaign=battle_challenge`;
    const text = `I got ${score}/${maxScore} on "${quizTitle}", beat me`;
    analytics.shareClick('battle');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: quizTitle, text, url });
        return;
      } catch {
        // cancelled, fall through to clipboard
      }
    }
    try {
      await navigator.clipboard?.writeText(`${text} ${url}`);
      showToast('Challenge link copied. Send it to a friend!', 'success');
    } catch {
      showToast('Could not copy the link.', 'error');
    }
  }, [createChallenge, score, maxScore, quizTitle, showToast]);

  // PART B: push my run into the open pool, then pull someone else's real run.
  const onRandomOpponent = useCallback(async () => {
    setBusy('random');
    setEmptyPool(false);
    await createChallenge(); // PUSH: my run becomes an open challenge either way
    try {
      const params = new URLSearchParams({ score: String(score) });
      if (groupSlug) params.set('groupSlug', groupSlug);
      const res = await fetch(`/api/battle/random?${params.toString()}`);
      const data = (await res.json()) as { battle?: { battleId: string } | null };
      if (data.battle?.battleId) {
        analytics.gameStart('battle');
        router.push(`/battle?b=${data.battle.battleId}&utm_source=result&utm_medium=internal&utm_campaign=battle_random`);
        return;
      }
      // Honest empty state. We do NOT fabricate an opponent to fill the queue.
      setEmptyPool(true);
    } catch {
      setEmptyPool(true);
    } finally {
      setBusy(null);
    }
  }, [createChallenge, score, groupSlug, router]);

  return (
    <div className="bg-surface border border-default rounded-xl p-4 mt-3 animate-fade-in text-center">
      <p className="text-[15px] font-bold text-primary">
        {score}/{maxScore}. Want to battle someone on this?
      </p>
      <p className="text-[13px] text-secondary mt-1">
        They play the same questions and have to beat your score.
      </p>

      <div className="flex gap-2.5 mt-3">
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => void onChallengeFriend()}
          disabled={busy !== null}
        >
          {busy === 'friend' ? 'Creating...' : 'Challenge a friend'}
        </button>
        <button
          type="button"
          className="btn-outline flex-1"
          onClick={() => void onRandomOpponent()}
          disabled={busy !== null}
        >
          {busy === 'random' ? 'Finding...' : 'Random opponent'}
        </button>
      </div>

      {emptyPool && (
        <p className="text-[13px] text-secondary mt-3">
          No open runs right now, so you are the first. Your run is waiting for the next
          challenger.
        </p>
      )}
    </div>
  );
}
