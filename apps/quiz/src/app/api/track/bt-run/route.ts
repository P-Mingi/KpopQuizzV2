import { NextResponse } from 'next/server';

import { anonHash } from '@/lib/anon-hash';
import { setAnonCookie } from '@/lib/anon-claim';
import { isEditorialUser } from '@/lib/editorial/accounts';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { BT_TRACKING } from '@/lib/tracking/bt-shared';
import {
  RATE_MAX_PER_ANON, RATE_MAX_PER_IP, RATE_WINDOW_MS,
  classifyUserAgent, createRateLimiter, isNotLiveError, isTestEnv, parseBtEvent, playedSongIds,
} from '@/lib/tracking/bt-server';

import type { NextRequest } from 'next/server';
import type { ParsedFinish, ParsedStart } from '@/lib/tracking/bt-server';

// POST /api/track/bt-run - one blindtest run, two events (SYSTEM.md section 1).
//
//   { event: 'start',  run_id, anon_id, playlist, mode, source, locale, rounds, clip_played: true }
//   { event: 'finish', run_id, ..., answered, correct, score, best_combo, duration_ms, completed, songs }
//
// Follows NEXT_PUBLIC_BT_TRACKING alone: off = 404, as if the route did not exist.
//
// The player never gets an error from here. The game does not read the answer (it
// is sent with keepalive or sendBeacon), and while docs/pending-migrations/
// v12-g1-bt-runs.sql is not applied the route answers 200 { ok: false, reason:
// 'not_live' } and writes nothing.
//
// What is stored: bt_runs (service role, RLS on, no public policy). Never the IP
// (only a salted day hash, in memory, for the rate limit), never the user agent
// string (only mobile | desktop | bot). is_test comes from VERCEL_ENV, never from
// the request. XP: none. A free run awards nothing today and still awards nothing;
// the daily keeps its own path (/api/daily/complete), unchanged.
//
// Editorial (team) accounts never act as fans (SYSTEM.md 5.6): a run played while
// signed in as one is dropped, so it is never a player of any board or count
// (bt_fans_today, the admin page). isEditorialUser() answers false, without a
// read, while the v12 flag is off, and false while editorial_accounts does not
// exist or cannot be read: until the owner inserts the accounts nothing changes.
export const dynamic = 'force-dynamic';

const limiter = createRateLimiter(RATE_WINDOW_MS);

const json = (body: Record<string, unknown>, status = 200): NextResponse =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** The signed-in player, or null. A session problem never loses the run. */
async function playerId(): Promise<string | null> {
  try {
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

type Db = ReturnType<typeof createServiceRoleClient>;
type DbError = { code?: string | null; message?: string | null } | null;

interface Written { written: boolean; error: DbError }

function baseRow(e: ParsedStart | ParsedFinish, player: string | null, uaClass: string): Record<string, unknown> {
  return {
    id: e.run_id,
    player_id: player,
    anon_id: e.anon_id,
    playlist: e.playlist,
    mode: e.mode,
    source: e.source,
    locale: e.locale,
    rounds: e.rounds,
    user_agent_class: uaClass,
    is_test: isTestEnv(),
  };
}

function resultCols(e: ParsedFinish): Record<string, unknown> {
  return {
    finished_at: new Date().toISOString(),
    answered: e.answered,
    correct: e.correct,
    score: e.score,
    best_combo: e.best_combo,
    duration_ms: e.duration_ms,
    completed: e.completed,
    songs: e.songs,
  };
}

async function writeStart(db: Db, e: ParsedStart, player: string | null, uaClass: string): Promise<Written> {
  // A repeated start (a retry, a second tab) keeps the first row.
  const { data, error } = await db.from('bt_runs')
    .upsert(baseRow(e, player, uaClass), { onConflict: 'id', ignoreDuplicates: true })
    .select('id');
  return { written: !error && Array.isArray(data) && data.length > 0, error };
}

async function writeFinish(db: Db, e: ParsedFinish, player: string | null, uaClass: string): Promise<Written> {
  // Close the open row. `finished_at IS NULL` makes a second finish a no-op, so a
  // run is counted once whatever the browser sends.
  let closing = db.from('bt_runs')
    .update({ ...resultCols(e), ...(player ? { player_id: player } : {}) })
    .eq('id', e.run_id)
    .is('finished_at', null);
  // Only the browser that started a run closes it.
  closing = e.anon_id ? closing.eq('anon_id', e.anon_id) : closing.is('anon_id', null);
  const closed = await closing.select('id');
  if (closed.error) return { written: false, error: closed.error };
  if (Array.isArray(closed.data) && closed.data.length > 0) return { written: true, error: null };

  // No open row: the start was lost (offline, blocked) or the run is already
  // closed. Insert the whole run; an existing id is left alone.
  const { data, error } = await db.from('bt_runs')
    .upsert({ ...baseRow(e, player, uaClass), ...resultCols(e) }, { onConflict: 'id', ignoreDuplicates: true })
    .select('id');
  return { written: !error && Array.isArray(data) && data.length > 0, error };
}

// With the switch off the route does not exist for any method (a 404, like today).
export function GET(): NextResponse {
  return BT_TRACKING ? json({ error: 'method_not_allowed' }, 405) : json({ error: 'not_found' }, 404);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!BT_TRACKING) return json({ error: 'not_found' }, 404);

  // sendBeacon posts text/plain: read the text, then parse.
  let body: unknown = null;
  try {
    const text = await req.text();
    if (text.length > 16_000) return json({ ok: false, reason: 'invalid' });
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, reason: 'invalid' });
  }

  const uaClass = classifyUserAgent(req.headers.get('user-agent'));
  if (uaClass === 'bot') return json({ ok: false, reason: 'dropped' });

  const parsed = parseBtEvent(body);
  if (!parsed.ok) return json({ ok: false, reason: parsed.reason === 'invalid' ? 'invalid' : 'dropped' });
  const e = parsed.event;

  // Both keys are checked (and counted) on every event.
  const ipOk = limiter.hit(`i:${anonHash(req)}`, RATE_MAX_PER_IP);
  const anonOk = e.anon_id ? limiter.hit(`a:${e.anon_id}`, RATE_MAX_PER_ANON) : true;
  if (!ipOk || !anonOk) return json({ ok: false, reason: 'rate_limited' }, 429);

  try {
    const player = await playerId();
    if (player && (await isEditorialUser(player))) return json({ ok: false, reason: 'dropped' });
    const db = createServiceRoleClient();
    const res = e.event === 'start' ? await writeStart(db, e, player, uaClass) : await writeFinish(db, e, player, uaClass);

    if (res.error) {
      if (isNotLiveError(res.error)) return json({ ok: false, reason: 'not_live' });
      console.error('bt-run write failed:', res.error.code ?? '', res.error.message ?? '');
      return json({ ok: false, reason: 'error' });
    }

    // songs.play_count: once per run, when the finish row was really written, and
    // never for a test run (localhost, previews).
    if (e.event === 'finish' && res.written && !isTestEnv()) {
      const ids = playedSongIds(e);
      if (ids.length > 0) {
        const { error } = await db.rpc('bt_bump_song_plays', { p_song_ids: ids });
        if (error && !isNotLiveError(error)) console.error('bt_bump_song_plays failed:', error.code ?? '', error.message ?? '');
      }
    }

    const out = json(e.event === 'finish' ? { ok: true, recorded: res.written, xp_awarded: 0 } : { ok: true, recorded: res.written });
    // Proof of possession for the claim after sign-in (lib/anon-claim.ts): the id is
    // mirrored only once this server has written a run carrying it.
    if (e.anon_id && res.written) setAnonCookie(out, e.anon_id);
    return out;
  } catch (err) {
    console.error('bt-run failed:', err instanceof Error ? err.message : 'unknown');
    return json({ ok: false, reason: 'error' });
  }
}
