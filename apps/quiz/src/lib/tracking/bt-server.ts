// V12 blindtest run tracking, server side rules (SYSTEM.md section 1). Pure: no
// database, no request object. app/api/track/bt-run/route.ts does the I/O.
//
// Everything a browser sends is clamped here before it can reach `bt_runs`:
// vocabulary checked against lib/tracking/bt-shared.ts, numbers bounded, song
// entries validated one by one. A body that is not a run is refused (null), an
// obvious bot is dropped.

import { BT_MODES, BT_PLAYLIST_RE, BT_SOURCES, UUID_RE } from './bt-shared';

import type { BtRunMode, BtRunSong, BtRunSource } from './bt-shared';

export const MAX_ROUNDS = 50;
export const MAX_SONG_MS = 60_000;
export const MAX_DURATION_MS = 3 * 60 * 60 * 1000;
export const MAX_SCORE = 1_000_000;

/** Fastest a human answers a clip. Runs whose every answer is under it are scripts. */
const MIN_HUMAN_MS = 120;

export type UaClass = 'mobile' | 'desktop' | 'bot';

const BOT_RE = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|phantomjs|puppeteer|playwright|selenium|curl\/|wget\/|python-requests|python-urllib|node-fetch|axios\/|go-http-client|okhttp|java\/|libwww|httpclient|facebookexternalhit|preview|monitor|uptime|scrapy|gptbot|claudebot|ccbot|bytespider/i;
const MOBILE_RE = /mobi|android|iphone|ipad|ipod|windows phone/i;

/** mobile, desktop or bot, from the User-Agent header. An empty UA is a bot. */
export function classifyUserAgent(ua: string | null | undefined): UaClass {
  const s = (ua ?? '').trim();
  if (s.length < 8 || BOT_RE.test(s)) return 'bot';
  return MOBILE_RE.test(s) ? 'mobile' : 'desktop';
}

/**
 * `bt_runs.is_test`: true everywhere except the production deployment. From the
 * deployment's own environment (VERCEL_ENV), never from the request (a Host header
 * can be set by the caller). Localhost and previews have no `production` value, so
 * the one production database never counts their runs.
 */
export function isTestEnv(vercelEnv: string | undefined = process.env.VERCEL_ENV): boolean {
  return vercelEnv !== 'production';
}

const int = (v: unknown, min: number, max: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : min;
  return Math.min(max, Math.max(min, n));
};

function parseSongs(v: unknown, rounds: number): BtRunSong[] {
  if (!Array.isArray(v)) return [];
  const out: BtRunSong[] = [];
  const seen = new Set<string>();
  for (const raw of v) {
    if (out.length >= rounds) break;
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Record<string, unknown>;
    if (typeof s.song_id !== 'string' || !UUID_RE.test(s.song_id)) continue;
    const id = s.song_id.toLowerCase();
    if (seen.has(id)) continue; // a song is asked once per run
    seen.add(id);
    out.push({
      song_id: id,
      kind: s.kind === 'artist' ? 'artist' : 'title',
      correct: s.correct === true,
      ms: int(s.ms, 0, MAX_SONG_MS),
    });
  }
  return out;
}

export interface ParsedContext {
  run_id: string;
  anon_id: string | null;
  playlist: string;
  mode: BtRunMode;
  source: BtRunSource;
  locale: string;
  rounds: number;
}

export interface ParsedStart extends ParsedContext { event: 'start' }

export interface ParsedFinish extends ParsedContext {
  event: 'finish';
  answered: number;
  correct: number;
  score: number;
  best_combo: number;
  duration_ms: number;
  completed: boolean;
  songs: BtRunSong[];
}

export type ParsedEvent = ParsedStart | ParsedFinish;

export type ParseResult =
  | { ok: true; event: ParsedEvent }
  | { ok: false; reason: 'invalid' | 'no_clip' | 'impossible' };

/** Validate and clamp one event body. Never throws. */
export function parseBtEvent(body: unknown): ParseResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'invalid' };
  const b = body as Record<string, unknown>;
  if (b.event !== 'start' && b.event !== 'finish') return { ok: false, reason: 'invalid' };
  if (typeof b.run_id !== 'string' || !UUID_RE.test(b.run_id)) return { ok: false, reason: 'invalid' };
  if (typeof b.playlist !== 'string' || !BT_PLAYLIST_RE.test(b.playlist)) return { ok: false, reason: 'invalid' };
  if (typeof b.mode !== 'string' || !(BT_MODES as readonly string[]).includes(b.mode)) return { ok: false, reason: 'invalid' };
  if (typeof b.rounds !== 'number' || !Number.isFinite(b.rounds) || b.rounds < 1) return { ok: false, reason: 'invalid' };

  const rounds = int(b.rounds, 1, MAX_ROUNDS);
  const ctx: ParsedContext = {
    run_id: b.run_id.toLowerCase(),
    anon_id: typeof b.anon_id === 'string' && UUID_RE.test(b.anon_id) ? b.anon_id.toLowerCase() : null,
    playlist: b.playlist,
    mode: b.mode as BtRunMode,
    // An unknown source is not a reason to lose the run.
    source: typeof b.source === 'string' && (BT_SOURCES as readonly string[]).includes(b.source) ? (b.source as BtRunSource) : 'other',
    locale: typeof b.locale === 'string' && /^[a-z]{2}(-[a-z]{2})?$/.test(b.locale) ? b.locale : 'en',
    rounds,
  };

  if (b.event === 'start') {
    // The client sends a start only once a clip is really playing.
    if (b.clip_played !== true) return { ok: false, reason: 'no_clip' };
    return { ok: true, event: { event: 'start', ...ctx } };
  }

  const songs = parseSongs(b.songs, rounds);
  const answered = int(b.answered, 0, rounds);
  const correct = int(b.correct, 0, answered);
  const finish: ParsedFinish = {
    event: 'finish',
    ...ctx,
    answered,
    correct,
    score: int(b.score, 0, MAX_SCORE),
    best_combo: int(b.best_combo, 0, correct),
    duration_ms: int(b.duration_ms, 0, MAX_DURATION_MS),
    // Complete = the player reached the results screen having answered something
    // (a clip that would not load is skipped by the legacy player, not answered).
    completed: b.completed === true && answered > 0,
    songs,
  };
  if (impossibleTimings(finish)) return { ok: false, reason: 'impossible' };
  return { ok: true, event: finish };
}

/** Timings no player produces: several answers, each faster than a reflex, or a run shorter than its answers. */
export function impossibleTimings(f: Pick<ParsedFinish, 'answered' | 'duration_ms' | 'songs'>): boolean {
  if (f.answered >= 3 && f.songs.length >= 3 && f.songs.every((s) => s.ms < MIN_HUMAN_MS)) return true;
  if (f.answered >= 3 && f.duration_ms < f.answered * MIN_HUMAN_MS) return true;
  return false;
}

/** Song ids to count as played (`songs.play_count`): the songs the player heard and answered. */
export function playedSongIds(f: Pick<ParsedFinish, 'songs'>): string[] {
  return f.songs.map((s) => s.song_id);
}

// ---------------------------------------------------------------------------
// Rate limit: a sliding window in memory, per anon id and per IP hash. It is a
// guard against a loop or a script, not accounting: each serverless instance has
// its own window. The IP itself is never kept, only sha256(ip + day) (lib/anon-hash).
// ---------------------------------------------------------------------------

export interface RateLimiter {
  /** True when the key is still under its limit (and counts this hit). */
  hit: (key: string, max: number, now?: number) => boolean;
  size: () => number;
}

export function createRateLimiter(windowMs: number, maxKeys = 10_000): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    hit(key, max, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      if (hits.size >= maxKeys && !hits.has(key)) hits.clear(); // bounded memory
      hits.set(key, recent);
      return recent.length <= max;
    },
    size: () => hits.size,
  };
}

export const RATE_WINDOW_MS = 10 * 60 * 1000;
/** 30 runs (start + finish) per browser per 10 minutes. */
export const RATE_MAX_PER_ANON = 60;
/** Shared connections (a school, a carrier) get a wider window. */
export const RATE_MAX_PER_IP = 300;

/** Postgres / PostgREST codes that mean "the table or function is not there yet". */
export function isNotLiveError(err: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!err) return false;
  const code = err.code ?? '';
  if (code === '42P01' || code === '42883' || code === 'PGRST205' || code === 'PGRST202' || code === 'PGRST204') return true;
  return /does not exist|could not find the (table|function)|schema cache/i.test(err.message ?? '');
}
