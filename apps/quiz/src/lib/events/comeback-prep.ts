// Audit 04 section 3 (P2-3, owner 2026-11-09): the comeback timeline of the fandom quizzes. Pure planning over the owner's release
// calendar (public.comebacks, with the source columns of L24); it decides what is due, it writes nothing and publishes nothing.
//
//   T-14 to T-8   list      the announced comebacks of the next two weeks (a report for the owner)
//   T-7 to T-3    draft     a fandom level test is drafted for the group (scripts/build-fandom-test.mts), at most 3 drafts a day
//   T-2           publish   the approved draft goes out under the Team badge (the publisher cron does it; this only reports it is due)
//   T+2 to T+9    revise    once the release is out and its title track is on MusicBrainz, a revision adds the new title track
//                           (lib/editorial/quiz/revise.ts, an admin approves)
//
// Dated sources only: official notices and the group's verified accounts, bylined outlets, MusicBrainz after release; Soompi and allkpop
// are leads, never kprofiles. A row counts only when it is `announced` with a verified https source (comebackSourceUrl, the rule of the
// weekly topics); anything else is ignored (fail closed, also before L24 is applied: no column, no source, no plan).

import { comebackSourceUrl } from '@/lib/editorial/templates';

import type { ComebackRow } from '@/lib/editorial/templates';

const DAY = 86_400_000;
/** At most this many fandom drafts a day, inside the lane caps of lib/editorial/quiz/rules.ts (10 a day, 1 per group). */
export const MAX_FANDOM_DRAFTS_PER_DAY = 3;
export type ComebackPhase = 'list' | 'draft' | 'publish' | 'revise';
export interface ComebackAction { key: string; comeback: number; group_id: number | null; artist: string; title: string; release_date: string; phase: ComebackPhase; source_url: string }

export interface ComebackContext {
  /** Fandom drafts already filed today (UTC). */
  draftsToday: number;
  /** Keys already done (`comeback:{id}:{phase}`). */
  done: ReadonlySet<string>;
  /** Groups that already have a fandom test published or drafted: one per group. */
  groupsWithTest: ReadonlySet<number>;
  /** Comebacks whose title track is on MusicBrainz (their ids): a revision needs it. */
  titleTrackOnMusicBrainz: ReadonlySet<number>;
}

const dayStart = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

/** Which phase a comeback is in at `now`, by whole UTC days to the release (negative = after). Null = none. */
export function phaseAt(releaseDate: string, now: number): ComebackPhase | null {
  const t = Math.floor((dayStart(releaseDate) - Math.floor(now / DAY) * DAY) / DAY); // days to release
  if (t >= 8 && t <= 14) return 'list';
  if (t >= 3 && t <= 7) return 'draft';
  if (t >= 0 && t <= 2) return 'publish';
  if (t <= -2 && t >= -9) return 'revise';
  return null;
}

export function planComebackPrep(rows: readonly ComebackRow[], now: number, ctx: ComebackContext): { actions: ComebackAction[]; skipped: Array<{ comeback: number; reason: string }> } {
  const actions: ComebackAction[] = [];
  const skipped: Array<{ comeback: number; reason: string }> = [];
  let room = Math.max(0, MAX_FANDOM_DRAFTS_PER_DAY - ctx.draftsToday);
  const groupsUsed = new Set(ctx.groupsWithTest);
  const sorted = [...rows].sort((a, b) => a.release_date.localeCompare(b.release_date) || a.id - b.id);
  for (const c of sorted) {
    const src = comebackSourceUrl(c);
    if (!src) { skipped.push({ comeback: c.id, reason: 'not_announced_with_source' }); continue; }
    const phase = phaseAt(c.release_date, now);
    if (!phase) continue;
    const key = `comeback:${c.id}:${phase}`;
    if (ctx.done.has(key)) { skipped.push({ comeback: c.id, reason: 'done' }); continue; }
    if (phase === 'draft') {
      if (c.group_id === null) { skipped.push({ comeback: c.id, reason: 'no_group' }); continue; }
      if (groupsUsed.has(c.group_id)) { skipped.push({ comeback: c.id, reason: 'group_has_test' }); continue; }
      if (room <= 0) { skipped.push({ comeback: c.id, reason: 'day_cap' }); continue; }
      room--;
      groupsUsed.add(c.group_id);
    }
    if (phase === 'revise' && !ctx.titleTrackOnMusicBrainz.has(c.id)) { skipped.push({ comeback: c.id, reason: 'title_track_not_on_musicbrainz' }); continue; }
    actions.push({ key, comeback: c.id, group_id: c.group_id, artist: c.artist, title: c.title, release_date: c.release_date, phase, source_url: src });
  }
  return { actions, skipped };
}
