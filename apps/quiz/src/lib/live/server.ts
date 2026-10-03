// What the live API routes share: the production dependencies of the service
// (store, broadcaster, word list) and the small request helpers. Server only.

import { NextResponse } from 'next/server';

import { anonHash } from '@/lib/anon-hash';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isTestEnv } from '@/lib/tracking/bt-server';
import { isUxV12 } from '@/lib/ux-v12';

import { LIVE_EVENT, LIVE_TOKEN_HEADER } from './constants';
import { liveOpenChecker } from './open';
import { liveStatus } from './service';
import { LiveNotLiveError } from './store';
import { supabaseStore } from './supabase-store';

import type { LiveDeps } from './service';
import type { LiveStore } from './store';
import type { LivePublicState, LiveResult } from './types';
import type { NextRequest } from 'next/server';

/** A store whose every call says "not live": no Supabase URL or no service key in this environment. */
function closedStore(): LiveStore {
  const no = async (): Promise<never> => { throw new LiveNotLiveError('not_configured'); };
  return {
    ping: no, recentRooms: no, createRoom: no, getRoom: no, join: no, startRound: no, submitAnswer: no, closeRound: no,
    applyScores: no, moveStatus: no, updateSettings: no, resetGame: no, removePlayer: no, closeRoom: no, expireRooms: no,
  };
}

const configured = (): boolean => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Send one message to a private Realtime channel from the server, over the
 * Realtime HTTP endpoint (no socket to keep open in a serverless function). The
 * service role passes the Realtime Authorization policies; browsers have a
 * receive policy only. Resolves false when Realtime did not take it.
 */
export async function broadcastState(topic: string, state: LivePublicState): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const res = await fetch(`${url.replace(/\/+$/, '')}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ messages: [{ topic, event: LIVE_EVENT, payload: state, private: true }] }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`realtime broadcast answered ${res.status}`);
  return true;
}

// The moderation word list changes rarely: one read every five minutes per server instance.
const TERMS_TTL_MS = 5 * 60 * 1000;
let termsCache: { at: number; terms: string[] } | null = null;

async function bannedTerms(): Promise<string[]> {
  if (termsCache && Date.now() - termsCache.at < TERMS_TTL_MS) return termsCache.terms;
  const db = createServiceRoleClient();
  // The list is short (a few hundred terms at most); the range makes the cap explicit.
  const { data, error } = await db.from('verse_banned_terms').select('term').range(0, 999);
  if (error) return termsCache?.terms ?? [];
  const terms = ((data ?? []) as Array<{ term: string | null }>).map((r) => String(r.term ?? '').trim()).filter(Boolean);
  termsCache = { at: Date.now(), terms };
  return terms;
}

/** The dependencies of the service in production. */
export function liveDeps(): LiveDeps {
  return {
    store: configured() ? supabaseStore(createServiceRoleClient()) : closedStore(),
    broadcast: async (topic, state) => { await broadcastState(topic, state); },
    bannedTerms,
    isTest: isTestEnv(),
  };
}

/**
 * Is the live mode open (GET /api/live would answer 200)? For the pages that show a
 * door to /live or /join: a door is shown only when this is true. Same probe as the
 * route (liveStatus: a GET read on live_rooms), kept 60 seconds per server instance,
 * false on any error, false with the v12 flag off without any read (lib/live/open.ts).
 */
export const isLiveOpen: () => Promise<boolean> = liveOpenChecker({
  enabled: isUxV12,
  probe: async () => configured() && (await liveStatus(liveDeps())).status === 200,
});

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Flag off: the route does not exist. */
export function liveGate(): NextResponse | null {
  return isUxV12() ? null : NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
}

export function liveJson(result: LiveResult<unknown>): NextResponse {
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

export function liveToken(req: NextRequest): string | null {
  return req.headers.get(LIVE_TOKEN_HEADER);
}

/** The JSON body, or null when it is not JSON or larger than `maxBytes`. */
export async function liveBody(req: NextRequest, maxBytes = 64 * 1024): Promise<unknown | null> {
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    return text ? JSON.parse(text) as unknown : {};
  } catch {
    return null;
  }
}

/** Hashed address and day, never the address itself (lib/anon-hash.ts). */
export function liveIpHash(req: NextRequest): string {
  return anonHash(req);
}
