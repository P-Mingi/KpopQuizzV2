// Supabase implementation of RankedStore. Server only (service role: the new
// ranked tables have RLS on and NO policy, so nothing is readable or writable
// with the anon key). Fails soft: while the pending migration
// docs/pending-migrations/v11-p7-ranked.sql is not applied, the first read
// (ranked_seasons) fails with a missing-relation error and every route answers
// 503 {"ranked":"not_live"} before any write is attempted.

import { createClient } from '@supabase/supabase-js';

import { RankedNotLiveError } from './service';

import type { FinalRun, RunState, RunStatus, StoredAnswer } from './run';
import type { FinishedRun, Season } from './season';
import type { PoolSong, PrivateRound } from './select';
import type { CreateRunResult, RankedStore } from './service';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PgError {
  code?: string;
  message?: string;
}

// undefined_table, undefined_column, undefined_function + PostgREST schema-cache misses.
const MISSING_SCHEMA = new Set(['42P01', '42703', '42883', 'PGRST200', 'PGRST202', 'PGRST204', 'PGRST205']);

export function isMissingSchema(err: PgError | null | undefined): boolean {
  return !!err && typeof err.code === 'string' && MISSING_SCHEMA.has(err.code);
}

function fail(where: string, err: PgError): never {
  if (isMissingSchema(err)) throw new RankedNotLiveError('migration_missing');
  throw new Error(`ranked ${where}: ${err.code ?? ''} ${err.message ?? ''}`.trim());
}

type Page = { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: PgError | null }> };

/**
 * Paginate past PostgREST's 1000-row cap (same contract as lib/db/fetch-all, but it
 * keeps the Postgres error code so a missing table still maps to not_live).
 */
async function pageAll<T>(where: string, make: () => Page, size = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await make().range(from, from + size - 1);
    if (error) fail(where, error);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

/** Service-role client, or RankedNotLiveError('no_env') when the env is absent (preview/CI). */
export function rankedServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new RankedNotLiveError('no_env');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

interface RunRow {
  token: string;
  user_id: string;
  season: number;
  status: RunStatus;
  rounds: PrivateRound[];
  answers: StoredAnswer[];
  step: number;
  issued_at: string;
  expires_at: string;
}

const RUN_COLUMNS = 'token, user_id, season, status, rounds, answers, step, issued_at, expires_at';

function toState(row: RunRow): RunState {
  return {
    token: row.token,
    userId: row.user_id,
    season: row.season,
    status: row.status,
    rounds: row.rounds,
    answers: row.answers ?? [],
    step: row.step,
    issuedAt: new Date(row.issued_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

interface SongRow {
  id: string;
  deezer_track_id: number;
  title: string;
  artist_name: string;
  album_name: string | null;
  album_cover_big: string | null;
  preview_url: string;
  gender: string | null;
  generation: string | null;
  tier: string | null;
}

interface StatRow {
  song_id: string;
  times_played: number;
  times_correct: number;
}

// The pool changes slowly (catalog imports, ranked stats); one read per 10 min per
// server instance is plenty and keeps a ranked issue from reading 4k rows each time.
const POOL_TTL_MS = 10 * 60_000;
let poolCache: { at: number; songs: PoolSong[] } | null = null;
const SEASON_TTL_MS = 60_000;
let seasonCache: { at: number; seasons: Season[] } | null = null;

export class SupabaseRankedStore implements RankedStore {
  constructor(private readonly db: SupabaseClient) {}

  async seasons(): Promise<Season[]> {
    if (seasonCache && Date.now() - seasonCache.at < SEASON_TTL_MS) return seasonCache.seasons;
    const { data, error } = await this.db.from('ranked_seasons').select('id, starts_at, ends_at').order('id');
    if (error) fail('seasons', error);
    const seasons = ((data ?? []) as Array<{ id: number; starts_at: string; ends_at: string }>).map((r) => ({
      id: r.id,
      startsAt: new Date(r.starts_at).toISOString(),
      endsAt: new Date(r.ends_at).toISOString(),
    }));
    seasonCache = { at: Date.now(), seasons };
    return seasons;
  }

  async songPool(): Promise<PoolSong[]> {
    if (poolCache && Date.now() - poolCache.at < POOL_TTL_MS) return poolCache.songs;
    // Same clean pool as /api/blind-test/generate for "All K-pop" (active, no
    // remix/instrumental/karaoke; curated subset when SONGS_IS_CURATED is on).
    const curated = process.env.SONGS_IS_CURATED === 'true';
    const songs = await pageAll<SongRow>('songPool', () => {
      let q = this.db
        .from('songs')
        .select('id, deezer_track_id, title, artist_name, album_name, album_cover_big, preview_url, gender, generation, tier')
        .eq('status', 'active')
        .not('title', 'ilike', '%remix%')
        .not('title', 'ilike', '%instrumental%')
        .not('title', 'ilike', '%inst.%')
        .not('title', 'ilike', '%karaoke%');
      if (curated) q = q.eq('is_curated', true);
      return q.order('id');
    });
    const stats = await pageAll<StatRow>('songStats', () =>
      this.db.from('ranked_song_stats').select('song_id, times_played, times_correct').order('song_id'),
    );
    const byId = new Map(stats.map((s) => [s.song_id, s]));
    const pool = songs.map((s): PoolSong => {
      const st = byId.get(s.id);
      return {
        id: s.id,
        title: s.title,
        artist: s.artist_name,
        album: s.album_name,
        cover: s.album_cover_big,
        previewUrl: s.preview_url,
        deezerTrackId: s.deezer_track_id,
        gender: s.gender,
        generation: s.generation,
        tier: s.tier,
        timesPlayed: st?.times_played ?? 0,
        timesCorrect: st?.times_correct ?? 0,
      };
    });
    poolCache = { at: Date.now(), songs: pool };
    return pool;
  }

  async freshPreview(deezerTrackId: number): Promise<{ previewUrl: string | null; cover: string | null }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4_000);
    try {
      const res = await fetch(`https://api.deezer.com/track/${deezerTrackId}`, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) return { previewUrl: null, cover: null };
      const track = (await res.json()) as { preview?: unknown; album?: { cover_big?: unknown } };
      const preview = typeof track.preview === 'string' && track.preview.startsWith('https://') ? track.preview : null;
      const cover = typeof track.album?.cover_big === 'string' && track.album.cover_big.startsWith('https://') ? track.album.cover_big : null;
      return { previewUrl: preview, cover };
    } finally {
      clearTimeout(timer);
    }
  }

  async openRuns(userId: string): Promise<RunState[]> {
    const { data, error } = await this.db.from('ranked_runs').select(RUN_COLUMNS).eq('user_id', userId).eq('status', 'issued');
    if (error) fail('openRuns', error);
    return ((data ?? []) as RunRow[]).map(toState);
  }

  async startedSince(userId: string, since: Date): Promise<number> {
    const { count, error } = await this.db
      .from('ranked_runs')
      .select('token', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('issued_at', since.toISOString());
    if (error) fail('startedSince', error);
    return count ?? 0;
  }

  async createRun(input: { userId: string; season: number; rounds: PrivateRound[]; dayStart: Date; dailyLimit: number; ttlMs: number }): Promise<CreateRunResult> {
    const { data, error } = await this.db.rpc('ranked_issue_run', {
      p_user: input.userId,
      p_season: input.season,
      p_rounds: input.rounds,
      p_day_start: input.dayStart.toISOString(),
      p_daily_limit: input.dailyLimit,
      p_ttl_seconds: Math.round(input.ttlMs / 1000),
    });
    if (error) fail('createRun', error);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { issued_token: string | null; runs_today: number | null; outcome: 'ok' | 'limit' | 'busy'; expires_at: string | null }
      | undefined;
    if (!row) throw new Error('ranked createRun: empty result');
    return {
      outcome: row.outcome,
      token: row.issued_token,
      startedToday: row.runs_today ?? 0,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    };
  }

  async getRun(token: string, userId: string): Promise<RunState | null> {
    const { data, error } = await this.db.from('ranked_runs').select(RUN_COLUMNS).eq('token', token).eq('user_id', userId).maybeSingle();
    if (error) fail('getRun', error);
    return data ? toState(data as RunRow) : null;
  }

  async saveRun(next: RunState, prevStep: number): Promise<boolean> {
    const { data, error } = await this.db
      .from('ranked_runs')
      .update({ answers: next.answers, step: next.step })
      .eq('token', next.token)
      .eq('user_id', next.userId)
      .eq('status', 'issued')
      .eq('step', prevStep)
      .select('token');
    if (error) fail('saveRun', error);
    return (data ?? []).length === 1;
  }

  async finalizeRun(next: RunState, final: FinalRun): Promise<boolean> {
    const { data, error } = await this.db.rpc('ranked_finalize_run', {
      p_token: next.token,
      p_user: next.userId,
      p_status: final.status,
      p_answers: next.answers,
      p_points: final.score.points,
      p_correct: final.score.correct,
      p_best_combo: final.score.bestCombo,
      p_avg_answer_ms: final.score.avgAnswerMs,
      p_song_results: final.songResults.map((r) => ({ song_id: r.songId, correct: r.correct })),
    });
    if (error) fail('finalizeRun', error);
    return data === true;
  }

  async finishedRuns(userId: string, season: number): Promise<FinishedRun[]> {
    const rows = await pageAll<{ token: string; points: number; correct_count: number; avg_answer_ms: number | null; finished_at: string }>('finishedRuns', () =>
      this.db
        .from('ranked_runs')
        .select('token, points, correct_count, avg_answer_ms, finished_at')
        .eq('user_id', userId)
        .eq('season', season)
        .in('status', ['submitted', 'quit'])
        .not('points', 'is', null)
        .order('finished_at')
        .order('token'),
    );
    return rows.map((r) => ({
      id: r.token,
      points: r.points,
      correct: r.correct_count,
      avgAnswerMs: r.avg_answer_ms,
      finishedAt: new Date(r.finished_at).toISOString(),
    }));
  }

  async standing(season: number, userId: string): Promise<{ position: number | null; total: number }> {
    const { data, error } = await this.db.rpc('ranked_player_standing', { p_season: season, p_user: userId });
    if (error) fail('standing', error);
    const row = (Array.isArray(data) ? data[0] : data) as { position: number | null; total: number } | undefined;
    return { position: row?.position ?? null, total: Number(row?.total ?? 0) };
  }

  async isLegend(season: number, userId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('ranked_legends')
      .select('user_id', { count: 'exact', head: true })
      .eq('season', season)
      .eq('user_id', userId);
    if (error) fail('isLegend', error);
    return (count ?? 0) > 0;
  }

  async expiredOpenRuns(now: Date, limit: number): Promise<RunState[]> {
    const { data, error } = await this.db
      .from('ranked_runs')
      .select(RUN_COLUMNS)
      .eq('status', 'issued')
      .lt('expires_at', now.toISOString())
      .order('expires_at')
      .limit(limit);
    if (error) fail('expiredOpenRuns', error);
    return ((data ?? []) as RunRow[]).map(toState);
  }

  async nightly(): Promise<unknown> {
    const { data, error } = await this.db.rpc('ranked_nightly');
    if (error) fail('nightly', error);
    return data;
  }
}
