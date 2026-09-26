import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addDays, autoSchedule, autoScheduleCompact, pickBankEntryForDate, pickCatalogQotd, qotdRotationFixEnabled,
} from '@/lib/quiz-bank-scheduling';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  aboutMinutes, ageLabel, averagePct, countdownLabel, fansLabel, greetingFor, groupInitials, hoursLeftLabel,
  isVisibleGroupSlug, meanRunSeconds, minutesToUtcMidnight, pickedOnLabel, spreadBy,
} from './format';
import { LIVE_HUB_ORDER } from './hubs';
import { rotateQotd } from './qotd-rotation';
import { DEGRADED_HOLD_MS, DEGRADED_REVALIDATE_S, degradedAction, renderPhase, RenderHealth, settleRender } from './render-health';

import type { CatalogQuiz, OpenBankEntry, QotdLogRow, QuizBankEntry } from '@/lib/quiz-bank-scheduling';
import type { QotdStore } from './qotd-rotation';

// render-health lowers a degraded render's revalidate through unstable_cache: record the calls.
const cacheCalls: { keys: string[]; revalidate: number | false | undefined }[] = [];
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => Promise<unknown>, keys: string[], opts: { revalidate?: number | false }) => {
    cacheCalls.push({ keys, revalidate: opts?.revalidate });
    return fn;
  },
}));

/* A seeded source so shuffles are reproducible. */
function seeded(seed = 7): () => number {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

function bank(id: string, category: string, group: number | null, date: string | null = null, status = 'verified'): QuizBankEntry {
  return {
    id, title: id, description: null, group_id: group, quiz_type: 'multiple_choice', difficulty: 'medium', category,
    questions: [], scheduled_date: date, status, verified_at: null, verification_notes: null, published_quiz_id: null,
    created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
  };
}

// The 18 open quiz_bank rows as read (read only) on 2026-09-25: the reason the
// rotation stopped after 2026-06-30.
const OPEN_BANK: OpenBankEntry[] = [
  ['2026-04-03', 'fun', null], ['2026-04-05', 'true_false', null], ['2026-12-15', 'era', 7], ['2026-12-16', 'group_specific', 11],
  ['2026-12-17', 'fun', null], ['2027-04-24', 'era', 6], ['2027-08-25', 'fun', null], ['2028-02-24', 'era', 11],
  ['2028-02-25', 'knowledge', null], ['2028-04-26', 'group_specific', 10], ['2028-04-28', 'fun', null], ['2029-01-12', 'fun', null],
  ['2029-09-18', 'knowledge', null], ['2029-09-19', 'group_specific', 12], ['2029-11-21', 'fun', null], ['2029-11-23', 'group_specific', 4],
  ['2029-11-25', 'true_false', null], ['2030-01-28', 'knowledge', null],
].map(([d, c, g], i) => ({ id: `b${String(i).padStart(2, '0')}`, scheduled_date: d as string, category: c as string, group_id: g as number | null, status: 'scheduled' }));

describe('root cause: no bank row matches a day after 2026-06-30', () => {
  it('every open row is either a missed date or a date far in the future', () => {
    for (let d = '2026-07-01'; d <= '2026-12-14'; d = addDays(d, 1)) {
      expect(OPEN_BANK.some((e) => e.scheduled_date === d)).toBe(false);
    }
    expect(OPEN_BANK.filter((e) => e.scheduled_date! < '2026-07-01').map((e) => e.scheduled_date)).toEqual(['2026-04-03', '2026-04-05']);
  });

  it('the legacy scheduler cannot place same-category leftovers (they stay out or drift)', () => {
    // The legacy walk compares a candidate with the closest scheduled entry at ANY
    // distance: after one "fun" quiz is placed, every later day still has that
    // "fun" quiz as its closest predecessor, so the other five are never placed
    // within the 365-day search (in production they were placed only once another
    // category happened to precede them, years ahead).
    const quizzes = Array.from({ length: 6 }, (_, i) => bank(`f${i}`, 'fun', null));
    const legacy = autoSchedule(quizzes, [], '2026-07-01', { compact: false });
    expect(legacy.size).toBe(1);
    const compact = autoSchedule(quizzes, [], '2026-07-01', { compact: true, random: seeded() });
    expect(compact.size).toBe(6);
  });
});

describe('autoScheduleCompact', () => {
  it('fills consecutive days with no gap, and respects neighbours when it can', () => {
    const quizzes = [
      bank('a', 'fun', 1), bank('b', 'era', 2), bank('c', 'fun', 3), bank('d', 'knowledge', 1), bank('e', 'era', 4), bank('f', 'true_false', null),
    ];
    const out = autoScheduleCompact(quizzes, [], '2026-10-01', seeded(3));
    const days = [...out.values()].sort();
    expect(days).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']);
    const byDay = new Map([...out.entries()].map(([id, d]) => [d, quizzes.find((q) => q.id === id)!]));
    for (let i = 1; i < days.length; i++) {
      const a = byDay.get(days[i - 1]!)!; const b = byDay.get(days[i]!)!;
      expect(a.group_id != null && a.group_id === b.group_id).toBe(false);
      expect(a.category === b.category).toBe(false);
    }
  });

  it('never leaves a day empty, even when every quiz shares a category', () => {
    const quizzes = Array.from({ length: 5 }, (_, i) => bank(`f${i}`, 'fun', null));
    const out = autoScheduleCompact(quizzes, [], '2026-10-01', seeded());
    expect([...out.values()].sort()).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
  });

  it('skips days already taken', () => {
    const existing = [bank('x', 'era', 9, '2026-10-02', 'scheduled')];
    const out = autoScheduleCompact([bank('a', 'fun', 1), bank('b', 'knowledge', 2)], existing, '2026-10-01', seeded());
    expect([...out.values()].sort()).toEqual(['2026-10-01', '2026-10-03']);
  });

  it('autoSchedule uses it only with the switch (default OFF)', () => {
    expect(qotdRotationFixEnabled({})).toBe(false);
    expect(qotdRotationFixEnabled({ QOTD_ROTATION_FIX: '0' })).toBe(false);
    expect(qotdRotationFixEnabled({ QOTD_ROTATION_FIX: '1' })).toBe(true);
    expect(qotdRotationFixEnabled({ QOTD_ROTATION_FIX: 'true' })).toBe(true);
    const quizzes = Array.from({ length: 4 }, (_, i) => bank(`f${i}`, 'fun', null));
    const compact = autoSchedule(quizzes, [], '2026-10-01', { compact: true, random: seeded() });
    expect([...compact.values()].sort()).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  });
});

describe('pickBankEntryForDate', () => {
  it('takes missed dates first (oldest), then undated, then the earliest future date', () => {
    expect(pickBankEntryForDate(OPEN_BANK, '2026-07-01', { group_id: 3, category: 'group_specific' })?.scheduled_date).toBe('2026-04-03');
    const noMissed = OPEN_BANK.filter((e) => e.scheduled_date! > '2026-07-01');
    expect(pickBankEntryForDate([...noMissed, { id: 'u', scheduled_date: null, category: 'knowledge', group_id: null, status: 'verified' }], '2026-07-01')?.id).toBe('u');
    expect(pickBankEntryForDate(noMissed, '2026-07-01')?.scheduled_date).toBe('2026-12-15');
  });

  it('avoids the previous day group or category when another row exists', () => {
    const rows: OpenBankEntry[] = [
      { id: 'a', scheduled_date: '2026-06-01', category: 'fun', group_id: null, status: 'scheduled' },
      { id: 'b', scheduled_date: '2026-06-02', category: 'era', group_id: 5, status: 'scheduled' },
    ];
    expect(pickBankEntryForDate(rows, '2026-07-01', { group_id: null, category: 'fun' })?.id).toBe('b');
    expect(pickBankEntryForDate(rows, '2026-07-01', { group_id: 5, category: 'fun' })?.id).toBe('a'); // relaxes category
  });

  it('ignores published / draft rows and returns null on an empty bank', () => {
    expect(pickBankEntryForDate([{ id: 'p', scheduled_date: null, category: 'fun', group_id: null, status: 'published' }], '2026-07-01')).toBeNull();
    expect(pickBankEntryForDate([], '2026-07-01')).toBeNull();
  });
});

function quiz(id: string, over: Partial<CatalogQuiz> = {}): CatalogQuiz {
  return { id, group_id: 1, play_count: 50, like_count: 5, total_completions: 40, total_score_sum: 220, question_count: 10, report_count: 0, created_at: '2026-09-01T00:00:00Z', ...over };
}

describe('pickCatalogQotd', () => {
  it('never repeats a quiz featured in the last 90 days', () => {
    const recent: QotdLogRow[] = [{ quiz_id: 'a', featured_date: '2026-07-15' }];
    expect(pickCatalogQotd([quiz('a', { like_count: 40 }), quiz('b')], recent, '2026-09-25')?.id).toBe('b');
    const old: QotdLogRow[] = [{ quiz_id: 'a', featured_date: '2026-06-01' }];
    expect(pickCatalogQotd([quiz('a', { like_count: 40 }), quiz('b')], old, '2026-09-25')?.id).toBe('a');
  });

  it('skips short, reported or never-played quizzes', () => {
    const out = pickCatalogQotd([quiz('s', { question_count: 4 }), quiz('r', { report_count: 3 }), quiz('z', { play_count: 0 })], [], '2026-09-25');
    expect(out).toBeNull();
  });

  it('prefers another group than the last 3 days, deterministic ties', () => {
    const cands = [quiz('a', { group_id: 1 }), quiz('b', { group_id: 2 }), quiz('c', { group_id: 1 })];
    const recent: QotdLogRow[] = [{ quiz_id: 'c', featured_date: '2026-09-24' }];
    expect(pickCatalogQotd(cands, recent, '2026-09-25')?.id).toBe('b');
    expect(pickCatalogQotd([quiz('y'), quiz('x')], [], '2026-09-25')?.id).toBe('x');
  });
});

/* In-memory store: the same contract as the Supabase one. */
function memoryStore(open: OpenBankEntry[], catalog: CatalogQuiz[], log: QotdLogRow[] = []): QotdStore & { flags: Map<string, string>; log: QotdLogRow[] } {
  const flags = new Map<string, string>(); // date -> quiz id
  const bankRows = open.map((e) => ({ ...e }));
  const published = new Map<string, string>(); // bank id -> quiz id
  const logRows = [...log];
  return {
    flags,
    log: logRows,
    async qotdFor(date) { return flags.get(date) ?? null; },
    async ensureDailyQuiz(date) {
      if (flags.has(date)) return flags.get(date)!;
      const row = bankRows.find((e) => e.scheduled_date === date && (e.status === 'verified' || e.status === 'scheduled'));
      if (!row) return null;
      const id = `q-${row.id}`;
      row.status = 'published';
      published.set(row.id, id);
      flags.set(date, id);
      logRows.push({ quiz_id: id, featured_date: date });
      return id;
    },
    async openBankEntries() { return bankRows.filter((e) => e.status === 'verified' || e.status === 'scheduled').map((e) => ({ ...e })); },
    async qotdNeighbour(date) {
      const id = flags.get(date);
      if (!id) return null;
      const b = bankRows.find((e) => published.get(e.id) === id);
      const c = catalog.find((q) => q.id === id);
      return { group_id: b?.group_id ?? c?.group_id ?? null, category: b?.category ?? null };
    },
    async moveBankEntry(id, date) {
      const row = bankRows.find((e) => e.id === id);
      if (!row || bankRows.some((e) => e.scheduled_date === date)) return false;
      row.scheduled_date = date;
      return true;
    },
    async catalogCandidates() { return catalog; },
    async logSince(date) { return logRows.filter((r) => r.featured_date >= date); },
    async featureQuiz(quizId, date) { flags.set(date, quizId); logRows.push({ quiz_id: quizId, featured_date: date }); },
  };
}

describe('rotateQotd', () => {
  it('keeps an existing pick, publishes a scheduled bank row as today', async () => {
    const s = memoryStore([{ id: 'x', scheduled_date: '2026-09-25', category: 'fun', group_id: null, status: 'scheduled' }], []);
    expect((await rotateQotd(s, '2026-09-25')).method).toBe('bank');
    expect((await rotateQotd(s, '2026-09-25')).method).toBe('existing');
  });

  it('pulls the next open bank row, then falls back to the catalog, one pick per day', async () => {
    const catalog = Array.from({ length: 40 }, (_, i) => quiz(`c${i}`, { group_id: (i % 7) + 1, like_count: i }));
    const s = memoryStore(OPEN_BANK, catalog);
    const methods: string[] = [];
    let day = '2026-09-26';
    for (let i = 0; i < 30; i++, day = addDays(day, 1)) {
      const r = await rotateQotd(s, day);
      methods.push(r.method);
      expect(r.quizId).toBeTruthy();
    }
    expect(methods.slice(0, 18).every((m) => m === 'bank-pulled')).toBe(true);
    expect(methods.slice(18).every((m) => m === 'catalog')).toBe(true);
    const days = [...s.flags.keys()];
    expect(new Set(days).size).toBe(30);
    const ids = [...s.flags.values()];
    expect(new Set(ids).size).toBe(30); // nothing repeats inside 90 days
  });

  it('reports none when bank and catalog are empty', async () => {
    const r = await rotateQotd(memoryStore([], []), '2026-09-25');
    expect(r).toMatchObject({ method: 'none', quizId: null });
  });
});

describe('format helpers', () => {
  it('countdown to the UTC rollover', () => {
    const now = new Date('2026-09-25T17:48:00Z');
    expect(minutesToUtcMidnight(now)).toBe(372);
    expect(countdownLabel(372)).toBe('6h 12m');
    expect(countdownLabel(12)).toBe('12m');
    expect(hoursLeftLabel(372)).toBe('6 hours left');
    expect(hoursLeftLabel(75)).toBe('1 hour left');
    expect(hoursLeftLabel(1)).toBe('1 minute left');
  });

  it('picked-on labels never pretend an old pick is today', () => {
    expect(pickedOnLabel('2026-09-25', '2026-09-25')).toBe('today');
    expect(pickedOnLabel('2026-09-24', '2026-09-25')).toBe('yesterday');
    expect(pickedOnLabel('2026-06-30', '2026-09-25')).toBe('June 30');
    expect(pickedOnLabel('2025-06-30', '2026-09-25')).toBe('June 30, 2025');
  });

  it('average and time are real or absent', () => {
    expect(averagePct(222, 30, 10)).toBe(74);
    expect(averagePct(20, 2, 10)).toBeNull(); // under 3 runs
    expect(averagePct(0, 0, 10)).toBeNull();
    expect(meanRunSeconds([{ attempt_count: 3, avg_time_seconds: 100, total_questions: 10 }, { attempt_count: 1, avg_time_seconds: 200, total_questions: 10 }], 10)).toBe(125);
    expect(meanRunSeconds([], 10)).toBeNull();
    expect(aboutMinutes(125)).toBe('about 2 min');
    expect(aboutMinutes(20)).toBe('about 1 min');
    expect(aboutMinutes(null)).toBeNull();
  });

  it('labels', () => {
    expect(greetingFor(8)).toBe('Good morning');
    expect(greetingFor(14)).toBe('Good afternoon');
    expect(greetingFor(21)).toBe('Good evening');
    expect(greetingFor(2)).toBe('Good evening');
    expect(groupInitials('Cortis')).toBe('CO');
    expect(groupInitials('Hearts2hearts')).toBe('HE');
    expect(groupInitials('Red Velvet')).toBe('RV');
    expect(groupInitials('General K-pop')).toBe('K');
    expect(fansLabel(1)).toBe('1 fan');
    expect(fansLabel(1204)).toBe('1,204 fans');
    const now = new Date('2026-09-25T12:00:00Z');
    expect(ageLabel('2026-09-23T10:00:00Z', now)).toBe('2 days ago');
    expect(ageLabel('2026-09-24T11:00:00Z', now)).toBe('yesterday');
    expect(ageLabel('2026-09-25T09:00:00Z', now)).toBe('3 hours ago');
    expect(isVisibleGroupSlug('zzz-quarantine-hidden')).toBe(false);
    expect(isVisibleGroupSlug('bts')).toBe(true);
  });
});

describe('home link parity with the live home', () => {
  it('the groups rail keeps every live hub, in the live order (home-group-pills.tsx ORDER)', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const src = fs.readFileSync(path.resolve(here, '../../../components/home/home-group-pills.tsx'), 'utf8');
    const block = /const ORDER = \[([\s\S]*?)\];/.exec(src)?.[1] ?? '';
    const live = [...block.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
    expect(live.length).toBeGreaterThan(10);
    expect([...LIVE_HUB_ORDER]).toEqual(live);
  });

  it('spreadBy keeps every item and avoids equal neighbours when it can', () => {
    const row = ['a1', 'a2', 'b1', 'a3', 'c1', 'c2'];
    const out = spreadBy(row, (x) => x[0]!);
    expect([...out].sort()).toEqual([...row].sort());
    for (let i = 1; i < out.length; i++) expect(out[i]![0]).not.toBe(out[i - 1]![0]);
    expect(spreadBy(['a1', 'a2'], (x) => x[0]!)).toEqual(['a1', 'a2']); // no other order exists
    expect(spreadBy(['a', 'b', 'c'], (x) => x)).toEqual(['a', 'b', 'c']); // already fine: order kept
  });
});

describe('a render that lost a read is never kept in the page cache (C3-003)', () => {
  afterEach(() => { vi.unstubAllEnvs(); cacheCalls.length = 0; });

  it('knows the build, a runtime regeneration and dev apart', () => {
    expect(renderPhase({ NEXT_PHASE: 'phase-production-build', NODE_ENV: 'production' })).toBe('build');
    expect(renderPhase({ NODE_ENV: 'production' })).toBe('runtime');
    expect(renderPhase({ NODE_ENV: 'development' })).toBe('dev');
  });

  it('throws at runtime (the cached page stays), renders briefly at build, gives up holding after the window', () => {
    expect(degradedAction('runtime', 0, 1000)).toBe('throw');
    expect(degradedAction('runtime', 0, DEGRADED_HOLD_MS - 1)).toBe('throw');
    expect(degradedAction('runtime', 0, DEGRADED_HOLD_MS)).toBe('short-cache');
    expect(degradedAction('build', 0, 0)).toBe('short-cache');
    expect(degradedAction('dev', 0, 0)).toBe('short-cache');
  });

  it('records the reads that failed and returns their fallback', async () => {
    const h = new RenderHealth();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await h.read('ok', Promise.resolve(3), 0)).toBe(3);
    expect(await h.read('groups', Promise.reject(new Error('503')), [] as number[])).toEqual([]);
    expect(h.failed).toEqual(['groups']);
    // Next's own signals (dynamic bail-out, notFound, redirect) still pass through.
    const bail = Object.assign(new Error('bail'), { digest: 'DYNAMIC_SERVER_USAGE' });
    await expect(h.read('x', Promise.reject(bail), null)).rejects.toBe(bail);
  });

  it('settleRender: complete = no-op; runtime = throw; build = revalidate in 30 s', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await settleRender(new RenderHealth());
    expect(cacheCalls).toEqual([]);

    const lost = new RenderHealth();
    lost.failed.push('groups');
    vi.stubEnv('NODE_ENV', 'production');
    await expect(settleRender(lost, 1_000)).rejects.toThrow(/reads failed \(groups\): keeping the cached page/);
    // still failing after the hold window in this process: rendered, short revalidate
    await expect(settleRender(lost, 1_000 + DEGRADED_HOLD_MS)).resolves.toBeUndefined();
    expect(cacheCalls.at(-1)).toEqual({ keys: ['ux-v1:p1:degraded-render'], revalidate: DEGRADED_REVALIDATE_S });
    // a complete render resets the window
    await settleRender(new RenderHealth(), 2_000 + DEGRADED_HOLD_MS);
    await expect(settleRender(lost, 3_000 + DEGRADED_HOLD_MS)).rejects.toThrow();

    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    cacheCalls.length = 0;
    await expect(settleRender(lost, 4_000 + DEGRADED_HOLD_MS)).resolves.toBeUndefined();
    expect(cacheCalls).toEqual([{ keys: ['ux-v1:p1:degraded-render'], revalidate: 30 }]);
  });
});
