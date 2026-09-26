// Shared plumbing for the /api/ranked/* routes. Order of the gates matters:
//   1. flag off                -> 404 (flag off = today's site: these routes do not exist)
//   2. no DB env / no migration / no season -> 503 {"ranked":"not_live"} (read-only probe)
//   3. auth (when required)    -> 401 {"error":"sign_in_required"}
//   4. the handler; refusals map to their status, anything else is a 500 with no detail.
// Nothing is written before gate 2 has proven the ranked tables exist.

import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';

import { rankedServiceClient, SupabaseRankedStore } from './db';
import { liveSeason, RankedNotLiveError, RankedRequestError } from './service';

import type { Season } from './season';
import type { RankedStore } from './service';

export interface RankedContext {
  store: RankedStore;
  season: Season;
  userId: string | null;
  now: Date;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * GET on a POST-only ranked route: 404 with the flag off (like any unknown path
 * today), 405 with the flag on.
 */
export function postOnly(): NextResponse {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

export function notLive(reason: RankedNotLiveError['reason']): NextResponse {
  return NextResponse.json({ ranked: 'not_live', reason }, { status: 503, headers: NO_STORE });
}

async function sessionUserId(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function rankedRoute(
  auth: 'required' | 'optional',
  handler: (ctx: RankedContext) => Promise<unknown>,
): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const now = new Date();
    const store = new SupabaseRankedStore(rankedServiceClient());
    const season = await liveSeason(store, now);
    const userId = await sessionUserId();
    if (auth === 'required' && !userId) {
      return NextResponse.json({ error: 'sign_in_required' }, { status: 401, headers: NO_STORE });
    }
    const body = await handler({ store, season, userId, now });
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof RankedNotLiveError) return notLive(e.reason);
    if (e instanceof RankedRequestError) {
      return NextResponse.json({ error: e.code, ...e.extra }, { status: e.status, headers: NO_STORE });
    }
    // Log the message only: never request bodies (they carry answers and tokens).
    console.error('[ranked]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'ranked_error' }, { status: 500, headers: NO_STORE });
  }
}

// ---- body parsing -------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new RankedRequestError(400, 'invalid_body');
}

export function tokenOf(body: Record<string, unknown>): string {
  const t = body.token;
  if (typeof t !== 'string' || !UUID_RE.test(t)) throw new RankedRequestError(400, 'invalid_token');
  return t.toLowerCase();
}

export function roundOf(body: Record<string, unknown>): number {
  const r = body.round;
  if (typeof r !== 'number' || !Number.isInteger(r) || r < 0 || r > 99) throw new RankedRequestError(400, 'invalid_round');
  return r;
}

/** null = the client timer ran out. */
export function choiceOf(body: Record<string, unknown>): number | null {
  const c = body.choice;
  if (c === null) return null;
  if (typeof c !== 'number' || !Number.isInteger(c)) throw new RankedRequestError(400, 'invalid_choice');
  return c;
}

export function clientMsOf(body: Record<string, unknown>): number | null {
  const v = body.clientMs;
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new RankedRequestError(400, 'invalid_time');
  return v;
}

export function requireUser(ctx: RankedContext): string {
  if (!ctx.userId) throw new RankedRequestError(401, 'sign_in_required');
  return ctx.userId;
}
