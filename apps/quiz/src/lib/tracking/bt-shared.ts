// V12 blindtest run tracking: the vocabulary and the pure helpers shared by the
// browser (lib/tracking/bt.ts) and the server (lib/tracking/bt-server.ts,
// app/api/track/bt-run). No import, no browser API, no server API: safe on both
// sides. See bt.ts for how a run is recorded.

/** NEXT_PUBLIC_* is inlined at build: the same value on the server and in the browser. */
export const BT_TRACKING: boolean =
  process.env.NEXT_PUBLIC_BT_TRACKING === '1' || process.env.NEXT_PUBLIC_BT_TRACKING === 'true';

export const BT_TRACK_ENDPOINT = '/api/track/bt-run';

export const BT_MODES = ['classic', 'intro', 'speed', 'verse', 'bridge', 'ranked'] as const;
export type BtRunMode = (typeof BT_MODES)[number];

export const BT_SOURCES = [
  'hub', 'landing-en', 'landing-fr', 'landing-es', 'landing-id', 'group-hub', 'daily', 'challenge', 'live', 'share', 'other',
] as const;
export type BtRunSource = (typeof BT_SOURCES)[number];

/** `all`, or `<kind>:<id>`. A multi-group pick is `group:a+b` (slugs sorted). */
export const BT_PLAYLIST_RE = /^(all|(group|theme|daily|challenge|live):[A-Za-z0-9][A-Za-z0-9_.+-]{0,79})$/;

export interface BtRunSong {
  song_id: string;
  kind: 'title' | 'artist';
  correct: boolean;
  /** ms from the clip start to the answer (the full timer on a timeout). */
  ms: number;
}

/** What every event carries, so a finish whose start was lost still makes a full row. */
export interface BtRunContext {
  run_id: string;
  playlist: string;
  mode: BtRunMode;
  source: BtRunSource;
  locale: string;
  rounds: number;
}

export interface BtRunResult {
  answered: number;
  correct: number;
  score: number;
  best_combo: number;
  duration_ms: number;
  completed: boolean;
  songs: BtRunSong[];
}

export type BtRunEvent =
  | ({ event: 'start' } & BtRunContext)
  | ({ event: 'finish' } & BtRunContext & BtRunResult);

export type BtRunPayload =
  | ({ event: 'start'; anon_id: string | null; clip_played: true } & BtRunContext)
  | ({ event: 'finish'; anon_id: string | null } & BtRunContext & BtRunResult);

// ---------------------------------------------------------------------------
// Pure helpers (unit tested in bt.test.ts).
// ---------------------------------------------------------------------------

const SLUG_OK = /[^A-Za-z0-9_.-]+/g;
const clean = (s: string): string => s.trim().replace(SLUG_OK, '-').replace(/^-+|-+$/g, '').slice(0, 64);

/** Today in UTC, `YYYY-MM-DD` (the daily blindtest turns at 00:00 UTC). */
export function utcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export interface BtPlaylistInput {
  /** What the run is: a free pick, the daily, or a friend's challenge. */
  kind: 'free' | 'daily' | 'challenge';
  /** generate's playlist id: 'all', a mix id ('gg', '3rd-gen', 'hits') or a group slug. */
  playlist?: string | null;
  /** Group slugs when the pick is one or several groups. */
  groups?: readonly string[] | null;
  /** Challenge code (the `c` of /blindtest?c=CODE). */
  code?: string | null;
  now?: Date;
}

/** The `bt_runs.playlist` value of a run. */
export function btPlaylistId(input: BtPlaylistInput): string {
  if (input.kind === 'daily') return `daily:${utcDate(input.now)}`;
  if (input.kind === 'challenge') return `challenge:${clean(input.code ?? '') || 'unknown'}`;
  const groups = (input.groups ?? []).map(clean).filter(Boolean);
  if (groups.length > 0) return `group:${[...new Set(groups)].sort().join('+').slice(0, 80)}`;
  const id = clean(input.playlist ?? '');
  if (!id || id === 'all') return 'all';
  return `theme:${id}`;
}

const LANDINGS: ReadonlyArray<[RegExp, BtRunSource]> = [
  [/^\/guess-the-kpop-song(\/|$)/, 'landing-en'],
  [/^\/fr\/blind-test-kpop(\/|$)/, 'landing-fr'],
  [/^\/es\/adivina-la-cancion-kpop(\/|$)/, 'landing-es'],
  [/^\/id\/tebak-lagu-kpop(\/|$)/, 'landing-id'],
];

/**
 * Where a run was started. The kind of run wins (daily, challenge), then a share
 * link (`?ref=share`), then the page: the hub, a landing, a group hub, live.
 */
export function btSourceFor(kind: 'free' | 'daily' | 'challenge', pathname: string, search = ''): BtRunSource {
  if (kind === 'daily') return 'daily';
  if (kind === 'challenge') return 'challenge';
  if (/[?&]ref=share(&|$)/.test(search)) return 'share';
  const path = pathname.replace(/\/+$/, '') || '/';
  for (const [re, source] of LANDINGS) if (re.test(path)) return source;
  if (/^\/(pt\/)?blindtest$/.test(path)) return 'hub';
  if (/^\/(pt\/)?groups\/[^/]+/.test(path)) return 'group-hub';
  if (/^\/(live|join)(\/|$)/.test(path)) return 'live';
  return 'other';
}

/** Best combo (right answers in a row) of a list of answers. */
export function bestCombo(answers: ReadonlyArray<{ correct: boolean }>): number {
  let best = 0;
  let streak = 0;
  for (const a of answers) {
    streak = a.correct ? streak + 1 : 0;
    if (streak > best) best = streak;
  }
  return best;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Body of one event. `anonId` is passed in so this stays pure. */
export function buildBtPayload(event: BtRunEvent, anonId: string | null): BtRunPayload {
  const ctx: BtRunContext = {
    run_id: event.run_id,
    playlist: event.playlist,
    mode: event.mode,
    source: event.source,
    locale: event.locale,
    rounds: event.rounds,
  };
  const anon_id = anonId && UUID_RE.test(anonId) ? anonId : null;
  if (event.event === 'start') return { event: 'start', anon_id, clip_played: true, ...ctx };
  return {
    event: 'finish',
    anon_id,
    ...ctx,
    answered: event.answered,
    correct: event.correct,
    score: event.score,
    best_combo: event.best_combo,
    duration_ms: event.duration_ms,
    completed: event.completed,
    songs: event.songs,
  };
}
