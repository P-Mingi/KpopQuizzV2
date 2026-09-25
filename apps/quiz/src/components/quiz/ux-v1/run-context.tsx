'use client';

import { createContext, useContext } from 'react';

import type { QuizType } from '@/lib/db/types';
import type { ChallengePublic } from '@/lib/ux-v1/p4/challenge';

/** Everything the client run needs about the quiz, serialisable (server -> client). */
export interface P4RunQuiz {
  id: string;
  slug: string;
  title: string;
  quizType: QuizType;
  difficulty: string;
  questionCount: number;
  playCount: number;
  likeCount: number;
  groupName: string;
  groupSlug: string;
  /** Photocard / share preview photo: the quiz cover, else the group photo (same origin), else null. */
  photo: string | null;
  /** Same-origin group photo for the story image (canvas needs it untainted). */
  groupPhoto: string | null;
  creatorUsername: string;
  /** The quiz average in % (quizzes.total_score_sum / total_completions), null before any play. */
  averagePct: number | null;
  timerOn: boolean;
  timerSeconds: number;
  /** v11-p4-relaxed-runs.sql is applied (the relaxed control shows only then). */
  relaxedLive: boolean;
  commentCount: number;
  /** Keep playing: one big next quiz + one row (16.7), other quizzes of the group from the page's related list. */
  keepPlaying: Array<{ slug: string; title: string; quizType: string; difficulty: string; plays: number; photo: string | null }>;
  /** The group's blindtest playlist (lib/blind-test-playlists.ts rule), when it has one. */
  playlist: { songs: number } | null;
}

export interface LoadedChallenge extends ChallengePublic {
  sig: string;
}

export interface P4RunApi {
  quiz: P4RunQuiz;
  /** Starts a run (fetches the questions; a loaded challenge plays its snapshot). */
  start: () => void;
  loading: boolean;
  relaxed: boolean;
  setRelaxed: (on: boolean) => void;
  challenge: LoadedChallenge | null;
  /** Share sheet for the quiz page ("Share this quiz") or a challenge of your best. */
  openShare: (kind: 'quiz' | 'best', opts?: { score: number; total: number }) => void;
}

export const P4RunContext = createContext<P4RunApi | null>(null);

export function useP4Run(): P4RunApi {
  const v = useContext(P4RunContext);
  if (!v) throw new Error('useP4Run outside P4Run');
  return v;
}
