// Quiz challenges ("Challenge a friend", "Beat {user}: 7/8"). Stored in the existing
// `battles` table (migration 073: quiz_id, questions snapshot 074, challenger_hash,
// challenger_score) and `battle_results` (one row per attempt, with anon_id / user_id
// for the claim flow of 155). No DDL. Shared by the API routes and the client.
//
// Link: /q/<slug>?c=<battle id>.<signature>. The quiz page stays the canonical URL
// (its canonical tag ignores the query), so a challenge link never creates a new
// indexable page. The signature (challenge-server.ts) is what makes a row a challenge.

import type { QuestionData } from './engine';

/** DESIGN-SPEC 16.7 / share sheet: "They play your exact questions · 48 hours". */
export const CHALLENGE_TTL_MS = 48 * 60 * 60 * 1000;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ChallengePublic {
  id: string;
  quizId: string;
  /** Challenger's public name (profiles.username), null for a guest challenger. */
  challenger: { name: string; accent: string | null; font: string | null } | null;
  score: number;
  total: number;
  /** Points per question: 3 on clue quizzes, 1 elsewhere (score is out of total x this). */
  maxScore: number;
  questions: QuestionData[];
  createdAt: string;
  expired: boolean;
}

/** /q/<slug>?c=<id>.<sig> (the signature comes from the server, challenge-server.ts). */
export function challengeHref(slug: string, id: string, sig: string): string {
  return `/q/${slug}?c=${id}.${sig}`;
}

/** Reads the ?c= value back: null unless it is "<uuid>.<16 hex>". */
export function parseChallengeParam(c: string | null | undefined): { id: string; sig: string } | null {
  if (!c) return null;
  const m = /^([0-9a-f-]{36})\.([0-9a-f]{16})$/i.exec(c.trim());
  if (!m || !UUID_RE.test(m[1]!)) return null;
  return { id: m[1]!.toLowerCase(), sig: m[2]!.toLowerCase() };
}

export function isExpired(createdAt: string, now: number = Date.now()): boolean {
  const t = Date.parse(createdAt);
  return !Number.isFinite(t) || now - t > CHALLENGE_TTL_MS;
}

/** "Beat mingi: 7/8" (or "Beat your friend: 7/8" for a guest challenger). */
export function challengeChip(c: Pick<ChallengePublic, 'challenger' | 'score' | 'maxScore'>): string {
  return `Beat ${c.challenger?.name ?? 'your friend'}: ${c.score}/${c.maxScore}`;
}

/** Results line for a challenge run: win or lose. Ties go to the player (>=), as the prototype. */
export interface ChallengeOutcome {
  won: boolean;
  /** the bold part: "You beat mingi" / "mingi wins this one" */
  head: string;
  /** the rest: " (7/8). Reply with your score." */
  tail: string;
  line: string;
}

export function challengeOutcome(score: number, c: Pick<ChallengePublic, 'challenger' | 'score' | 'maxScore'>): ChallengeOutcome {
  const theirs = `${c.score}/${c.maxScore}`;
  const won = score >= c.score;
  const head = won ? `You beat ${c.challenger?.name ?? 'your friend'}` : `${c.challenger?.name ?? 'Your friend'} wins this one`;
  const tail = won ? ` (${theirs}). Reply with your score.` : ` (${theirs}). Try again?`;
  return { won, head, tail, line: `${head}${tail}` };
}

/**
 * Server side: the snapshot is always rebuilt from the quiz's STORED questions, so a
 * client can never plant answers. The client sends the question texts in the order it
 * played them; each is matched to a stored question (first unused exact match). Any
 * text that does not match fails the whole request.
 */
export function orderStoredQuestions(stored: QuestionData[], playedTexts: string[]): QuestionData[] | null {
  if (!Array.isArray(playedTexts) || playedTexts.length === 0 || playedTexts.length > stored.length) return null;
  const used = new Set<number>();
  const out: QuestionData[] = [];
  for (const t of playedTexts) {
    if (typeof t !== 'string') return null;
    const i = stored.findIndex((q, k) => !used.has(k) && q.question === t);
    if (i < 0) return null;
    used.add(i);
    out.push(stored[i]!);
  }
  return out;
}
