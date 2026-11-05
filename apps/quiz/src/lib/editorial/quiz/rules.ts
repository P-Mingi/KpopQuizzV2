// Run O1, lot E1b: the rules of the quiz lane, pure and unit tested (quiz.test.ts).
//
// Owner decisions of 2026-11-03:
//   - at most 10 quizzes a UTC day and at most 1 per group a UTC day, IN ADDITION to the 3 a day of threads, debates and blogs
//     (lib/editorial/rules.ts, MAX_PER_DAY: untouched; the two counts never meet);
//   - an approved quiz gets a scheduled_at at a random time in the coming days, between 06:00 and 22:00 UTC and never between
//     23:50 and 00:30 UTC, honouring both caps; an admin action schedules a batch over N days, the groups with no published
//     quiz first. The time a quiz really goes live is its date: nothing is back-dated.
// The cron runs every 15 minutes, so the scheduler hands out distinct quarter-hour slots: two quizzes never wait for the same run.

import { ineligible, utcDayBounds } from '../rules';
import { checkQuizPayload, slugRefusal } from './payload';

import type { SkipReason } from '../rules';
import type { QuizDraft } from './types';

export const MAX_QUIZ_PER_DAY = 10;
export const MAX_QUIZ_PER_GROUP_PER_DAY = 1;
/** An approval spreads over this many days unless the admin asks for another number. */
export const DEFAULT_SCHEDULE_DAYS = 7;
export const MAX_SCHEDULE_DAYS = 60;
/** Quizzes of a review batch the reviewer reads (formats.md 12: a 25 percent sample), and the errors that reject the batch. */
export const SAMPLE_FRACTION = 0.25;
export const REJECT_AT_ERRORS = 2;

const MIN = 60_000;
const DAY = 86_400_000;
/** The window of a scheduled time, UTC: from 06:00 up to 22:00. */
export const WINDOW_START_MIN = 6 * 60;
export const WINDOW_END_MIN = 22 * 60;
/** Never from 23:50 to 00:30 UTC (the day change and the 00:05 quiz of the day). */
export const QUIET_FROM_MIN = 23 * 60 + 50;
export const QUIET_TO_MIN = 30;
/** The cron period: scheduled times are drawn from distinct slots of this size. */
export const SLOT_MIN = 15;
/** A quiz is never scheduled sooner than this after the moment the admin approves it. */
export const LEAD_MIN = 30;

const minuteOfDay = (ms: number): number => (((ms % DAY) + DAY) % DAY) / MIN;

/** 23:50 to 00:30 UTC. */
export function inQuietWindow(ms: number): boolean {
  const m = minuteOfDay(ms);
  return m >= QUIET_FROM_MIN || m < QUIET_TO_MIN;
}

/** A time a quiz may be scheduled at: 06:00 to 22:00 UTC, outside the quiet window. */
export function isQuizTimeAllowed(ms: number): boolean {
  const m = minuteOfDay(ms);
  return m >= WINDOW_START_MIN && m <= WINDOW_END_MIN && !inQuietWindow(ms);
}

export const utcDayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const dayStart = (ms: number): number => Date.parse(utcDayBounds(ms).start);

// ---------------------------------------------------------------------------------------------------------------------
// The publisher: which approved quiz goes live in this run.

export type QuizRuleDraft = Pick<QuizDraft, 'id' | 'account_id' | 'group_id' | 'status' | 'scheduled_at' | 'reviewed_by' | 'reviewed_at' | 'published_ref' | 'payload'>;

export type QuizSkipReason = SkipReason | 'no_group' | 'bad_payload' | 'group_mismatch' | 'hub_slug' | 'slug_taken' | 'group_cap';

export interface QuizPublishContext {
  now: number;
  /** The quizzes this pipeline published on the UTC day of `now`. */
  publishedToday: ReadonlyArray<{ group_id: number | null }>;
  isAdmin: (userId: string) => boolean;
  activeAccountIds: ReadonlySet<string>;
  /** The quiz that holds each slug of the due drafts (quizzes.slug is unique). A quiz of the same account and title is the draft's own, written by a run that stopped before it could say so: it is adopted, not refused. */
  slugOwners: ReadonlyMap<string, { creator_id: string; title: string }>;
  /** groups.slug by id, for the groups of the due drafts. */
  groupSlugById: ReadonlyMap<number, string>;
  /** Which of the group parts of hub-shaped slugs ("x" of "x-quiz") are slugs of a group. */
  groupSlugs: ReadonlySet<string>;
}

export interface QuizPublishPlan {
  pick: QuizRuleDraft | null;
  reason: 'ok' | 'quiet_window' | 'daily_cap' | 'nothing_due';
  skipped: { id: number; reason: QuizSkipReason }[];
}

/** The slug of a stored payload, or null when the payload is not a valid draft. */
export function payloadSlug(payload: unknown): string | null {
  const r = checkQuizPayload(payload);
  return r.ok ? r.value.slug : null;
}

export function planQuizPublish(drafts: readonly QuizRuleDraft[], ctx: QuizPublishContext): QuizPublishPlan {
  const skipped: QuizPublishPlan['skipped'] = [];
  if (inQuietWindow(ctx.now)) return { pick: null, reason: 'quiet_window', skipped };
  if (ctx.publishedToday.length >= MAX_QUIZ_PER_DAY) return { pick: null, reason: 'daily_cap', skipped };
  const groupsToday = new Map<number, number>();
  for (const p of ctx.publishedToday) if (p.group_id !== null) groupsToday.set(p.group_id, (groupsToday.get(p.group_id) ?? 0) + 1);
  const rc = { now: ctx.now, publishedToday: 0, lastAccountId: null, isAdmin: ctx.isAdmin, activeAccountIds: ctx.activeAccountIds };

  const due: QuizRuleDraft[] = [];
  for (const d of drafts) {
    const base = ineligible(d, rc);
    if (base) { skipped.push({ id: d.id, reason: base }); continue; }
    if (d.group_id === null) { skipped.push({ id: d.id, reason: 'no_group' }); continue; }
    const parsed = checkQuizPayload(d.payload);
    if (!parsed.ok) { skipped.push({ id: d.id, reason: 'bad_payload' }); continue; }
    if (ctx.groupSlugById.get(d.group_id) !== parsed.value.group_slug) { skipped.push({ id: d.id, reason: 'group_mismatch' }); continue; }
    if (slugRefusal(parsed.value.slug, parsed.value.group_slug, (s) => ctx.groupSlugs.has(s))) { skipped.push({ id: d.id, reason: 'hub_slug' }); continue; }
    const owner = ctx.slugOwners.get(parsed.value.slug);
    if (owner && !(owner.creator_id === d.account_id && owner.title === parsed.value.title)) { skipped.push({ id: d.id, reason: 'slug_taken' }); continue; }
    if ((groupsToday.get(d.group_id) ?? 0) >= MAX_QUIZ_PER_GROUP_PER_DAY) { skipped.push({ id: d.id, reason: 'group_cap' }); continue; }
    due.push(d);
  }
  due.sort((a, b) => Date.parse(a.scheduled_at ?? '') - Date.parse(b.scheduled_at ?? '') || a.id - b.id);
  const pick = due[0] ?? null;
  return pick ? { pick, reason: 'ok', skipped } : { pick: null, reason: 'nothing_due', skipped };
}

// ---------------------------------------------------------------------------------------------------------------------
// The scheduler: random times over N days, both caps honoured, the groups with no published quiz first.

export interface ScheduleItem { id: number; group_id: number | null }
/** A quiz already on the calendar (an approved draft outside the batch, a quiz published today): it takes a place of its day. */
export interface ScheduledSlot { group_id: number | null; at: string }
export interface ScheduleOptions {
  now: number;
  /** The number of UTC days the batch is spread over, today included while it still has room. */
  days: number;
  existing: readonly ScheduledSlot[];
  /** Groups with no published quiz: their drafts go first. */
  firstGroups: ReadonlySet<number>;
  /** 0 (inclusive) to 1 (exclusive); Math.random by default. */
  rand?: (() => number) | undefined;
  leadMin?: number | undefined;
}
export interface SchedulePlan {
  assigned: { id: number; scheduled_at: string }[];
  unplaced: { id: number; reason: 'no_group' | 'no_room' }[];
}

/** The days a schedule can use, as UTC midnight instants, with the free slot starts of each. */
function dayCalendar(opts: ScheduleOptions): Array<{ start: number; free: number[]; load: number; groups: Set<number> }> {
  const lead = (opts.leadMin ?? LEAD_MIN) * MIN;
  const today = dayStart(opts.now);
  const out: Array<{ start: number; free: number[]; load: number; groups: Set<number> }> = [];
  const n = Math.max(1, Math.min(MAX_SCHEDULE_DAYS, Math.floor(opts.days)));
  for (let i = 0; i < n; i++) {
    const start = today + i * DAY;
    const used = new Set<number>();
    let load = 0;
    const groups = new Set<number>();
    for (const e of opts.existing) {
      const t = Date.parse(e.at);
      if (!Number.isFinite(t) || utcDayKey(t) !== utcDayKey(start)) continue;
      load++;
      if (e.group_id !== null) groups.add(e.group_id);
      used.add(Math.floor((minuteOfDay(t) - WINDOW_START_MIN) / SLOT_MIN));
    }
    const free: number[] = [];
    for (let k = 0; WINDOW_START_MIN + (k + 1) * SLOT_MIN <= WINDOW_END_MIN; k++) {
      const slotStart = start + (WINDOW_START_MIN + k * SLOT_MIN) * MIN;
      if (slotStart >= opts.now + lead && !used.has(k)) free.push(slotStart);
    }
    out.push({ start, free, load, groups });
  }
  return out;
}

export function planQuizSchedule(items: readonly ScheduleItem[], opts: ScheduleOptions): SchedulePlan {
  const rand = opts.rand ?? Math.random;
  const unplaced: SchedulePlan['unplaced'] = [];
  const queue: Array<ScheduleItem & { group_id: number }> = [];
  for (const it of items) {
    if (it.group_id === null) unplaced.push({ id: it.id, reason: 'no_group' });
    else queue.push({ id: it.id, group_id: it.group_id });
  }
  queue.sort((a, b) => Number(opts.firstGroups.has(b.group_id)) - Number(opts.firstGroups.has(a.group_id)) || a.id - b.id);

  const cal = dayCalendar(opts);
  // Room of a day: the day cap minus what is on it, never more than its free slots.
  const room = cal.map((d) => Math.max(0, Math.min(MAX_QUIZ_PER_DAY - d.load, d.free.length)));
  const usable = room.filter((r) => r > 0).length;
  const quota = usable === 0 ? 0 : Math.ceil(queue.length / usable);
  const placedOn: number[] = cal.map(() => 0);
  const byDay: number[][] = cal.map(() => []);
  const groupsOn = cal.map((d) => new Set(d.groups));
  const putOn = (day: number, it: ScheduleItem & { group_id: number }): void => {
    placedOn[day]!++;
    byDay[day]!.push(it.id);
    groupsOn[day]!.add(it.group_id);
  };

  // Pass 1 deals the queue day by day up to the quota (the first groups land on the earliest days); pass 2 fills what is left.
  const left: typeof queue = [];
  for (const it of queue) {
    const day = cal.findIndex((_d, i) => placedOn[i]! < Math.min(quota, room[i]!) && !groupsOn[i]!.has(it.group_id));
    if (day === -1) left.push(it); else putOn(day, it);
  }
  for (const it of left) {
    const day = cal.findIndex((_d, i) => placedOn[i]! < room[i]! && !groupsOn[i]!.has(it.group_id));
    if (day === -1) unplaced.push({ id: it.id, reason: 'no_room' }); else putOn(day, it);
  }

  const assigned: SchedulePlan['assigned'] = [];
  cal.forEach((d, i) => {
    const ids = byDay[i]!;
    if (!ids.length) return;
    const slots = [...d.free];
    for (let k = slots.length - 1; k > 0; k--) { // Fisher-Yates: a random distinct slot for each quiz
      const j = Math.floor(rand() * (k + 1));
      [slots[k], slots[j]] = [slots[j]!, slots[k]!];
    }
    ids.forEach((id, n) => {
      const at = slots[n]! + Math.floor(rand() * SLOT_MIN) * MIN;
      assigned.push({ id, scheduled_at: new Date(at).toISOString() });
    });
  });
  assigned.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at) || a.id - b.id);
  return { assigned, unplaced: unplaced.sort((a, b) => a.id - b.id) };
}

// ---------------------------------------------------------------------------------------------------------------------
// The review batch (formats.md 12): a 25 percent sample is read, two errors in it reject the batch.

/** How many of a batch's quizzes are in the sample the reviewer reads: 25 percent, at least one. */
export function sampleSize(size: number): number {
  return size <= 0 ? 0 : Math.max(1, Math.ceil(size * SAMPLE_FRACTION));
}

/** The ids of the sample, drawn with a seed (the batch id) so the same batch always shows the same sample. */
export function drawSample(ids: readonly number[], seed: number): number[] {
  const pool = [...ids].sort((a, b) => a - b);
  let s = (seed >>> 0) || 1;
  const next = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(next() * (k + 1));
    [pool[k], pool[j]] = [pool[j]!, pool[k]!];
  }
  return pool.slice(0, sampleSize(pool.length)).sort((a, b) => a - b);
}

/** The verdict on a batch: two errors or more in the sample reject it. */
export function batchVerdict(errors: number): 'approved' | 'rejected' {
  return errors >= REJECT_AT_ERRORS ? 'rejected' : 'approved';
}
