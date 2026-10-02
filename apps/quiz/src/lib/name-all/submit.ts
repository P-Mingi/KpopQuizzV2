// Name them all (V12 G6): what POST /api/name-all/result does, against injected
// dependencies so the rules are unit tested without a database.
//
// Order of the checks: the browser id, the burst limit, the group, the payload
// against the real roster, then the write. The browser id only keys the burst
// limit; it is never stored (the table has no user link, by design of migration 126).

import { checkRound } from './round';

import type { NameAllSet, SaveResult } from './server';

export interface SubmitDeps {
  getSet: (slug: string) => Promise<NameAllSet | null>;
  save: (opts: { set: NameAllSet; found: readonly string[]; seconds: number; roundId: string }) => Promise<SaveResult>;
  /** False when the key is over its limit. */
  hit: (key: string) => boolean;
  newId: () => string;
}

export interface SubmitOutcome {
  http: number;
  body: { ok: true } | { ok: false; error: 'bad_request' | 'no_browser_id' | 'rate_limited' | 'unknown_group' | 'unknown_member' | 'failed' };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export async function submitRound(body: unknown, anon: string | null, deps: SubmitDeps): Promise<SubmitOutcome> {
  if (!anon || !UUID.test(anon)) return { http: 400, body: { ok: false, error: 'no_browser_id' } };
  if (!deps.hit(anon.toLowerCase())) return { http: 429, body: { ok: false, error: 'rate_limited' } };
  const slug = (body as { group?: unknown } | null)?.group;
  if (typeof slug !== 'string' || !SLUG.test(slug)) return { http: 400, body: { ok: false, error: 'bad_request' } };
  let set: NameAllSet | null;
  try { set = await deps.getSet(slug); } catch { return { http: 503, body: { ok: false, error: 'failed' } }; }
  if (!set) return { http: 404, body: { ok: false, error: 'unknown_group' } };
  const check = checkRound(body, set.members);
  if (!check.ok) {
    return check.reason === 'unknown_member'
      ? { http: 400, body: { ok: false, error: 'unknown_member' } }
      : { http: 400, body: { ok: false, error: 'bad_request' } };
  }
  // nobody types a name in zero seconds
  if (check.found.length > 0 && check.seconds < 1) return { http: 400, body: { ok: false, error: 'bad_request' } };
  const saved = await deps.save({ set, found: check.found, seconds: check.seconds, roundId: deps.newId() });
  if (saved === 'failed') return { http: 503, body: { ok: false, error: 'failed' } };
  return { http: 200, body: { ok: true } };
}
