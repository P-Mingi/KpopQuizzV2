// The debate under a quiz result (owner decision, run O1): about one result in three, at most once per visit,
// only an open debate the visitor has not voted on, signed-in visitors only. This file is the pure decision;
// the component only renders what it says. The decision is taken ONCE, before the block takes any space.

import type { Site } from '@/lib/analytics';

/** About one result in three. rand < this shows the block (rand is in [0, 1)). */
export const RESULT_DEBATE_ODDS = 1 / 3;

/**
 * THE guest switch (owner, run O1 #227): true, a guest gets the same block with one "Sign in to vote" button in place
 * of the two sides (the vote API is for signed-in fans only). False: a guest sees nothing.
 */
export const RESULT_DEBATE_FOR_GUESTS = true;

const DEBATE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Where a guest lands after signing in from the block: the community page, whose Daily debate panel is today's debate
 * with its two vote buttons (GET /community; /community/debate/<id> is the fan-debate page, not the daily one).
 * A fixed same-site path, so there is nothing to redirect through. The date only has to be a real YYYY-MM-DD for the
 * guest button to exist at all; anything else gives null and the block does not offer a sign-in.
 */
export function resultDebateSignInReturn(date: string): string | null {
  return DEBATE_DATE.test(date) ? '/community' : null;
}

/** localStorage key of a voted debate: the same lock the community debate surfaces use (kq_debate_<date>). */
export function debateDeviceKey(date: string): string {
  return `kq_debate_${date}`;
}

/** sessionStorage key: set when the block was shown, so a visit never shows it twice. */
export const RESULT_DEBATE_VISIT_KEY = 'kq_resdebate_visit';

export interface ResultDebateOpen {
  date: string;
  question: string;
  sideA: string;
  sideB: string;
}

/** What the server says about the viewer (GET /api/debate/open). */
export interface ResultDebateSlot {
  signedIn: boolean;
  /** today's open debate, null when there is none or the site has no debate of its own */
  debate: ResultDebateOpen | null;
  /** the viewer already voted this debate (database answer) */
  voted: boolean;
}

export interface ResultDebateInput {
  /** a draw in [0, 1), injected so tests are deterministic */
  rand: number;
  site: Site;
  /** the answer fetched while the quiz was played; null when it did not arrive in time */
  slot: ResultDebateSlot | null;
  /** the device already holds a vote for this debate */
  votedOnDevice: boolean;
  /** the block was already shown in this visit (tab session) */
  shownThisVisit: boolean;
}

/** True when the block shows under this result. Every refusal is silent: the result screen is then unchanged. */
export function decideResultDebate(i: ResultDebateInput): boolean {
  if (i.site !== 'kpop') return false; // the debates are the K-pop ones: never on the anime or hub site
  if (!i.slot || !i.slot.debate) return false; // not arrived in time, or no open debate
  if (!i.slot.signedIn && (!RESULT_DEBATE_FOR_GUESTS || resultDebateSignInReturn(i.slot.debate.date) === null)) return false;
  if (i.slot.voted || i.votedOnDevice) return false;
  if (i.shownThisVisit) return false;
  return i.rand < RESULT_DEBATE_ODDS;
}

/** Browser reads, each wrapped: storage can be blocked, and then the answer is the safe one. */
export function readVotedOnDevice(date: string): boolean {
  try { return localStorage.getItem(debateDeviceKey(date)) !== null; } catch { return false; }
}
export function readShownThisVisit(): boolean {
  try { return sessionStorage.getItem(RESULT_DEBATE_VISIT_KEY) !== null; } catch { return false; }
}
export function markShownThisVisit(): void {
  try { sessionStorage.setItem(RESULT_DEBATE_VISIT_KEY, '1'); } catch { /* blocked */ }
}
export function markVotedOnDevice(date: string, side: 'a' | 'b'): void {
  try { localStorage.setItem(debateDeviceKey(date), side); } catch { /* blocked */ }
}

/** Parse the /api/debate/open answer; anything odd is "no debate". */
export function parseSlot(raw: unknown): ResultDebateSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { signedIn?: unknown; voted?: unknown; debate?: unknown };
  const d = r.debate as Partial<ResultDebateOpen> | null | undefined;
  const debate = d && typeof d.date === 'string' && typeof d.question === 'string' && typeof d.sideA === 'string' && typeof d.sideB === 'string'
    ? { date: d.date, question: d.question, sideA: d.sideA, sideB: d.sideB }
    : null;
  return { signedIn: r.signedIn === true, voted: r.voted === true, debate };
}

// ---- the prefetch: asked while the quiz is played, read synchronously when the result mounts ----------

let pending: Promise<void> | null = null;
let current: ResultDebateSlot | null = null;

/** Start the one read of this visit (idempotent). Fire and forget. */
export function prefetchResultDebate(basePath: string, doFetch: typeof fetch = fetch): void {
  if (pending) return;
  pending = doFetch(`${basePath}/api/debate/open`, { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .then((raw: unknown) => { current = parseSlot(raw); })
    .catch(() => { current = null; });
}

/** What the prefetch knows right now. null: not asked, not arrived, or failed. Never waits. */
export function peekResultDebate(): ResultDebateSlot | null {
  return current;
}

/** After a vote, so a later result of the same visit knows it. */
export function noteResultDebateVoted(): void {
  if (current) current = { ...current, voted: true };
}

/** For tests. */
export function resetResultDebatePrefetch(): void {
  pending = null;
  current = null;
}

/** What the guest button asks of the shared sign-in sheet (useSignIn): the words, and the return to the debate. */
export function resultDebateSignInRequest(date: string): { title: string; sub: string; returnTo?: string } {
  const back = resultDebateSignInReturn(date);
  return { title: 'Sign in to vote', sub: 'One vote per fan per day. No password needed.', ...(back ? { returnTo: back } : {}) };
}
