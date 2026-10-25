import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { DAILY_ROTATION_UTC, getRotation, nextRotation, parisClock, rotationAt } from './rotation';

const APP = fileURLToPath(new URL('../../../../../', import.meta.url));
const read = (rel: string): string => readFileSync(`${APP}${rel}`, 'utf8');

describe('the rotation is the cron of the daily quiz', () => {
  it('is the schedule of vercel.json for /api/cron/ensure-daily-quiz', () => {
    const cfg = JSON.parse(read('vercel.json')) as { crons: Array<{ path: string; schedule: string }> };
    const cron = cfg.crons.find((c) => c.path === '/api/cron/ensure-daily-quiz');
    expect(cron?.schedule).toBe(`${DAILY_ROTATION_UTC.minute} ${DAILY_ROTATION_UTC.hour} * * *`);
    // vercel.json crons are UTC; the debate cron runs five minutes later
    expect(cfg.crons.find((c) => c.path === '/api/cron/ensure-daily-debate')?.schedule).toBe('10 0 * * *');
  });

  it('publishes the quiz of the UTC date, which is the date getQuizOfTheDay reads', () => {
    expect(read('src/app/api/cron/ensure-daily-quiz/route.ts')).toContain("new Date().toISOString().split('T')[0]");
    expect(read('src/lib/db/queries/quizzes.ts')).toContain("export async function getQuizOfTheDay(site: SiteId = SITE.id): Promise<QuizCardData | null> {\n  const today = new Date().toISOString().split('T')[0]!;");
  });
});

describe('nextRotation', () => {
  it('is 00:05 UTC, today before it and tomorrow after it', () => {
    expect(nextRotation(new Date('2026-10-25T00:04:59Z')).toISOString()).toBe('2026-10-25T00:05:00.000Z');
    expect(nextRotation(new Date('2026-10-25T00:05:00Z')).toISOString()).toBe('2026-10-26T00:05:00.000Z');
    expect(nextRotation(new Date('2026-10-25T18:38:00Z')).toISOString()).toBe('2026-10-26T00:05:00.000Z');
    expect(nextRotation(new Date('2026-12-31T23:59:00Z')).toISOString()).toBe('2027-01-01T00:05:00.000Z');
  });
});

describe('the Paris clock', () => {
  it('reads 02:05 in summer (CEST) and 01:05 in winter (CET)', () => {
    expect(parisClock(new Date('2026-07-01T00:05:00Z'))).toEqual({ time: '02:05', zone: 'CEST' });
    expect(parisClock(new Date('2026-12-01T00:05:00Z'))).toEqual({ time: '01:05', zone: 'CET' });
  });

  it('follows the clock change of the last Sunday of October (2026-10-25, 01:00 UTC)', () => {
    // the night of the 25th: still summer time at 00:05 UTC, winter time the next night
    const before = rotationAt(new Date('2026-10-25T00:00:00Z'));
    expect(before.nextAt).toBe('2026-10-25T00:05:00.000Z');
    expect(before.parisTime).toBe('02:05');
    expect(before.parisZone).toBe('CEST');
    const after = rotationAt(new Date('2026-10-25T12:00:00Z'));
    expect(after.nextAt).toBe('2026-10-26T00:05:00.000Z');
    expect(after.parisTime).toBe('01:05');
    expect(after.parisZone).toBe('CET');
    // and in March
    expect(rotationAt(new Date('2027-03-28T12:00:00Z')).parisTime).toBe('02:05');
    expect(rotationAt(new Date('2027-03-27T12:00:00Z')).parisTime).toBe('01:05');
  });

  it('counts the seconds left', async () => {
    const r = rotationAt(new Date('2026-10-25T23:05:00Z'));
    expect(r.secondsLeft).toBe(3600);
    expect(r.utcTime).toBe('00:05');
    expect((await getRotation({ now: new Date('2026-10-25T23:05:00Z') })).secondsLeft).toBe(3600);
  });
});
