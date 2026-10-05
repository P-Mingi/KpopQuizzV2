// V12 G5: the rules of saving one personality result, with the database behind an
// interface so they are unit tested without one. Used by POST /api/personality/result.
//
// The result is never taken from the client: the route receives the answer sheet
// and the server recomputes the result from the stored questions and profiles.

import { BRIDGE_QUESTIONS, BRIDGE_RESULT_KEY, BRIDGE_SLUGS } from './bridge';
import { nearestProfile, tallyWinner } from './engine';
import { isGroupSlug } from './parse';

import type { WmaData } from './data';

export interface SaveStore {
  wma(slug: string): Promise<WmaData | null>;
  /** groups.id of a bridge group, or null. */
  bridgeGroupId(slug: string): Promise<number | null>;
  /** Inserts one row. 'saved', 'already' (the signed-in fan already has a row for this group today) or 'failed'. */
  insert(row: { groupId: number; memberName: string }): Promise<'saved' | 'already' | 'failed'>;
}

export interface SaveOutcome {
  http: number;
  body: { saved: boolean; result?: string; status?: 'saved' | 'already' | 'failed'; error?: string };
}

const bad = (error: string, http = 400): SaveOutcome => ({ http, body: { saved: false, error } });

export async function saveResult(input: { body: unknown; store: SaveStore; allow: () => boolean }): Promise<SaveOutcome> {
  const b = input.body as { quiz?: unknown; group?: unknown; picks?: unknown } | null;
  if (!b || typeof b !== 'object') return bad('bad_request');
  if (b.quiz !== 'wma' && b.quiz !== 'kpdh') return bad('bad_request');
  if (!Array.isArray(b.picks) || b.picks.length > 20) return bad('bad_request');
  const picks = b.picks as unknown[] as number[];
  if (!input.allow()) return bad('rate_limited', 429);

  let groupId: number | null = null;
  let memberName: string | null = null;
  let result: string | null = null;

  if (b.quiz === 'wma') {
    if (!isGroupSlug(b.group)) return bad('bad_request');
    const data = await input.store.wma(b.group);
    if (!data) return bad('not_found', 404);
    result = nearestProfile(data.questions, picks, data.profiles);
    if (!result) return bad('bad_request');
    groupId = data.group.id;
    memberName = data.profiles.find((p) => p.id === result)?.name ?? null;
  } else {
    result = tallyWinner(BRIDGE_QUESTIONS, picks, BRIDGE_SLUGS);
    if (!result) return bad('bad_request');
    groupId = await input.store.bridgeGroupId(result);
    memberName = BRIDGE_RESULT_KEY;
  }

  // Fail soft: the page already shows the result, a result that cannot be stored is only not counted.
  if (groupId === null || !memberName) return { http: 200, body: { saved: false, result, status: 'failed' } };
  const status = await input.store.insert({ groupId, memberName });
  return { http: 200, body: { saved: status === 'saved', result, status } };
}
