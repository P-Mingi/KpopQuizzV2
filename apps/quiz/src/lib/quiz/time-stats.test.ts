import { describe, expect, it } from 'vitest';

import { nextTimeStats, recordTimeSample, timeSample } from './time-stats';

describe('timeSample', () => {
  it('accepts a real run', () => {
    expect(timeSample(7, 10, 84.26)).toEqual({ score: 7, totalQuestions: 10, seconds: 84.26 });
    expect(timeSample(0, 1, 0.4)).toEqual({ score: 0, totalQuestions: 1, seconds: 0.4 });
  });

  it('refuses what is not a run', () => {
    expect(timeSample(7, 10, null)).toBeNull();
    expect(timeSample(7, 10, 0)).toBeNull();
    expect(timeSample(7, 10, -5)).toBeNull();
    expect(timeSample(7, 10, Number.POSITIVE_INFINITY)).toBeNull();
    expect(timeSample(7, 10, 999999)).toBeNull();
    expect(timeSample(7.5, 10, 30)).toBeNull();
    expect(timeSample(-1, 10, 30)).toBeNull();
    expect(timeSample(7, 0, 30)).toBeNull();
    expect(timeSample(7, 100000, 30)).toBeNull();
    expect(timeSample('7', 10, 30)).toBeNull();
  });
});

describe('nextTimeStats', () => {
  it('starts a row from the first run', () => {
    expect(nextTimeStats(null, 42.34)).toEqual({ attempt_count: 1, avg_time_seconds: 42.3, fastest_time_seconds: 42.3 });
  });

  it('keeps a running average and the fastest time', () => {
    expect(nextTimeStats({ attempt_count: 3, avg_time_seconds: 60, fastest_time_seconds: 50 }, 20))
      .toEqual({ attempt_count: 4, avg_time_seconds: 50, fastest_time_seconds: 20 });
    expect(nextTimeStats({ attempt_count: 1, avg_time_seconds: 30, fastest_time_seconds: 30 }, 90))
      .toEqual({ attempt_count: 2, avg_time_seconds: 60, fastest_time_seconds: 30 });
    expect(nextTimeStats({ attempt_count: 2, avg_time_seconds: 10, fastest_time_seconds: null }, 12.25))
      .toEqual({ attempt_count: 3, avg_time_seconds: 10.8, fastest_time_seconds: 12.3 });
  });
});

// A tiny stand-in for the query builder: records what the function asks for.
function fakeDb(existing: Record<string, unknown> | null, fail = false) {
  const calls: { op: string; values: Record<string, unknown> | undefined; filters: [string, unknown][] }[] = [];
  const builder = (op: string, values?: Record<string, unknown>) => {
    const call = { op, values, filters: [] as [string, unknown][] };
    calls.push(call);
    const chain = {
      select: () => chain,
      eq: (k: string, v: unknown) => { call.filters.push([k, v]); return chain; },
      maybeSingle: async () => { if (fail) throw new Error('db down'); return { data: existing }; },
      then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
    };
    return chain;
  };
  return {
    calls,
    from: () => ({
      select: () => builder('select').select(),
      update: (values: Record<string, unknown>) => builder('update', values),
      insert: (values: Record<string, unknown>) => { builder('insert', values); return Promise.resolve({ error: null }); },
    }),
  };
}

describe('recordTimeSample', () => {
  const sample = { score: 7, totalQuestions: 10, seconds: 30 };

  it('inserts the first row of a (quiz, score, count)', async () => {
    const db = fakeDb(null);
    await recordTimeSample(db, 'quiz-1', sample);
    expect(db.calls.map((c) => c.op)).toEqual(['select', 'insert']);
    expect(db.calls[0]!.filters).toEqual([['quiz_id', 'quiz-1'], ['score', 7], ['total_questions', 10]]);
    expect(db.calls[1]!.values).toEqual({ quiz_id: 'quiz-1', score: 7, total_questions: 10, attempt_count: 1, avg_time_seconds: 30, fastest_time_seconds: 30 });
  });

  it('updates the existing row by id', async () => {
    const db = fakeDb({ id: 'row-9', attempt_count: 1, avg_time_seconds: 50, fastest_time_seconds: 50 });
    await recordTimeSample(db, 'quiz-1', sample);
    expect(db.calls.map((c) => c.op)).toEqual(['select', 'update']);
    expect(db.calls[1]!.values).toMatchObject({ attempt_count: 2, avg_time_seconds: 40, fastest_time_seconds: 30 });
    expect(db.calls[1]!.filters).toEqual([['id', 'row-9']]);
  });

  it('never throws when the database fails', async () => {
    await expect(recordTimeSample(fakeDb(null, true), 'quiz-1', sample)).resolves.toBeUndefined();
  });
});
