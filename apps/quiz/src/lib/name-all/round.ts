// Name them all (V12 G6): the rules of a round, pure (no spelling table here, so
// the client bundle of the game does not carry every group's spellings). The page,
// the API route and the tests all go through these functions.

import type { NameAllMember } from './match';

/** Every round lasts 60 seconds (SYSTEM.md 5.1), whatever the group size. */
export const ROUND_SECONDS = 60;

/** A stat is published only from this many finished v12 rounds of the group. */
export const STATS_MIN_ROUNDS = 30;

/** "0:42". */
export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The result headline (prototype ntRender, end state). */
export function resultHeadline(found: number, total: number): string {
  if (found === total) return `All ${total}. Nice.`;
  if (found >= total - 1) return `${found} of ${total}. So close.`;
  if (found >= total / 2) return `${found} of ${total}. Not bad.`;
  return `${found} of ${total}. Warm-up round.`;
}

// ---- what a finished round sends, and what is stored ------------------------------

export interface RoundPayload {
  group: string;
  /** Display names in the order they were found. */
  found: string[];
  /** Seconds on the clock when the round ended, 0 to 60. */
  seconds: number;
  gaveUp: boolean;
}

export type RoundCheck =
  | { ok: true; found: string[]; seconds: number }
  | { ok: false; reason: 'bad_request' | 'unknown_member' | 'empty_roster' };

/** Validates a payload against the group's real roster. Never trusts a name it does not know. */
export function checkRound(body: unknown, roster: readonly NameAllMember[]): RoundCheck {
  if (roster.length === 0) return { ok: false, reason: 'empty_roster' };
  if (!body || typeof body !== 'object') return { ok: false, reason: 'bad_request' };
  const b = body as Partial<Record<keyof RoundPayload, unknown>>;
  if (!Array.isArray(b.found) || typeof b.seconds !== 'number' || !Number.isFinite(b.seconds)) return { ok: false, reason: 'bad_request' };
  if (b.seconds < 0 || b.seconds > ROUND_SECONDS) return { ok: false, reason: 'bad_request' };
  if (b.found.length > roster.length) return { ok: false, reason: 'bad_request' };
  const names = new Set(roster.map((m) => m.name));
  const found: string[] = [];
  for (const f of b.found) {
    if (typeof f !== 'string') return { ok: false, reason: 'bad_request' };
    if (!names.has(f)) return { ok: false, reason: 'unknown_member' };
    if (found.includes(f)) return { ok: false, reason: 'bad_request' };
    found.push(f);
  }
  return { ok: true, found, seconds: Math.round(b.seconds) };
}

/** One row of `name_all_member_results` (migration 126 + the two v12 columns). */
export interface ResultRow {
  group_id: number;
  member_name: string;
  found: boolean;
  round_id: string;
  /** 1 for the first name typed, 2 for the second... null when not found. v12 column. */
  found_order: number | null;
  /** Seconds the round took. Null on the rows written before v12. v12 column. */
  round_seconds: number;
}

/** One row per member of the roster for a finished round, as the table has always held them. */
export function roundRows(opts: { groupId: number; roundId: string; roster: readonly NameAllMember[]; found: readonly string[]; seconds: number }): ResultRow[] {
  return opts.roster.map((m) => {
    const i = opts.found.indexOf(m.name);
    return {
      group_id: opts.groupId,
      member_name: m.name,
      found: i >= 0,
      round_id: opts.roundId,
      found_order: i >= 0 ? i + 1 : null,
      round_seconds: opts.seconds,
    };
  });
}

/** The same rows in the shape of migration 126 alone (before the v12 SQL is applied). */
export function legacyRows(rows: readonly ResultRow[]): Array<Pick<ResultRow, 'group_id' | 'member_name' | 'found' | 'round_id'>> {
  return rows.map(({ group_id, member_name, found, round_id }) => ({ group_id, member_name, found, round_id }));
}

// ---- what is published --------------------------------------------------------------

/** Raw aggregate of name_all_round_stats() (pending SQL). */
export interface RawStats {
  rounds: number;
  perfect_rounds: number;
  firsts: Array<{ member_name: string; n: number }>;
}

export interface NameAllStats {
  /** Finished v12 rounds of this group. */
  rounds: number;
  /** Share of those rounds that named everyone, 0 to 100. Null when no round did. */
  perfectPct: number | null;
  /** The member named first most often. Null on a tie or when nobody qualifies. */
  namedFirst: string | null;
}

export function parseRawStats(v: unknown): RawStats | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as { rounds?: unknown; perfect_rounds?: unknown; firsts?: unknown };
  const rounds = Number(o.rounds);
  const perfect = Number(o.perfect_rounds);
  if (!Number.isFinite(rounds) || !Number.isFinite(perfect) || rounds < 0 || perfect < 0 || perfect > rounds) return null;
  const firsts: RawStats['firsts'] = [];
  if (Array.isArray(o.firsts)) {
    for (const f of o.firsts) {
      const row = f as { member_name?: unknown; n?: unknown } | null;
      const n = Number(row?.n);
      if (row && typeof row.member_name === 'string' && Number.isFinite(n) && n > 0) firsts.push({ member_name: row.member_name, n });
    }
  }
  return { rounds, perfect_rounds: perfect, firsts };
}

/**
 * Only positive aggregates leave this function (SYSTEM.md 5.1): how many rounds
 * named everyone, and who is named first most often. Nothing about who is named
 * least. Null under STATS_MIN_ROUNDS rounds: a number that does not exist is hidden.
 */
export function publicStats(raw: RawStats | null, roster: readonly NameAllMember[]): NameAllStats | null {
  if (!raw || raw.rounds < STATS_MIN_ROUNDS) return null;
  const names = new Set(roster.map((m) => m.name));
  const firsts = raw.firsts.filter((f) => names.has(f.member_name)).sort((a, b) => b.n - a.n);
  const top = firsts[0];
  const tie = top && firsts[1] && firsts[1].n === top.n;
  return {
    rounds: raw.rounds,
    perfectPct: raw.perfect_rounds > 0 ? Math.round((100 * raw.perfect_rounds) / raw.rounds) : null,
    namedFirst: top && !tie ? top.member_name : null,
  };
}

// ---- URLs ----------------------------------------------------------------------------

export function prettyPath(groupSlug: string): string {
  return `/${groupSlug}-name-all-members`;
}
