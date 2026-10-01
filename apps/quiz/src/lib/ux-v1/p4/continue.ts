// "Continue playing" store (DESIGN-SPEC 16.7: quit asks for confirmation once an
// answer would be lost and saves the run to Continue; home "Continue playing" resumes
// at the saved question). WIRING-MAP section 1: there is no server-side in-progress
// state, so the run lives in this browser (localStorage), written by the quiz game
// and read by the home page (P1 imports readContinueRuns from here).
//
// Client only. Holds the exact run (questions in the order the player saw them, the
// answers so far, the score, the time already spent), never an account id. Entries
// expire after 14 days; at most 6 are kept (newest first).

import type { SavedRun } from './engine';

const KEY = 'ux:continue:v1';
const MAX = 6;
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface ContinueEntry {
  quizId: string;
  slug: string;
  title: string;
  groupName: string;
  groupSlug: string;
  quizType: string;
  difficulty: string;
  /** questions in the run */
  total: number;
  /** questions answered before leaving */
  answered: number;
  savedAt: number;
  run: SavedRun;
  /** per-question answer times so far (the save payload's per_question_times) */
  perQuestionTimes: number[];
  /** played without the timer */
  relaxed: boolean;
}

function read(): ContinueEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as ContinueEntry[];
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    return list.filter((e) => e && typeof e.quizId === 'string' && typeof e.savedAt === 'number' && now - e.savedAt < TTL_MS && e.run && Array.isArray(e.run.questions));
  } catch {
    return [];
  }
}

function write(list: ContinueEntry[]): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch { /* storage full or blocked: the run is simply not kept */ }
}

/** Newest first. Empty on the server, in private mode, or when nothing is saved. */
export function readContinueRuns(): ContinueEntry[] {
  if (typeof window === 'undefined') return [];
  return read().sort((a, b) => b.savedAt - a.savedAt);
}

export function saveContinueRun(entry: ContinueEntry): void {
  if (typeof window === 'undefined') return;
  write([entry, ...read().filter((e) => e.quizId !== entry.quizId)]);
}

export function peekContinueRun(quizId: string): ContinueEntry | null {
  if (typeof window === 'undefined') return null;
  return read().find((e) => e.quizId === quizId) ?? null;
}

export function clearContinueRun(quizId: string): void {
  if (typeof window === 'undefined') return;
  write(read().filter((e) => e.quizId !== quizId));
}

/** The quiz page URL that resumes a saved run (read by the quiz game on load). */
export function resumeHref(slug: string): string {
  return `/q/${slug}?resume=1`;
}
