import { describe, expect, it } from 'vitest';

import { SERIES_DIRECTORY_PATH, openingOfTheDayPath, utcDay } from './opening-of-the-day';

import type { SeriesDb } from './series';

type Row = Record<string, unknown> | null;

/** A client whose tables answer one row each (or an error), and which records the filters it was given. */
function fake(tables: Record<string, Row | Error>, log: string[] = []): SeriesDb {
  const builder = (table: string): unknown => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = (col: string, val: unknown) => { log.push(`${table}.${col}=${String(val)}`); return b; };
    b.maybeSingle = async () => {
      const t = tables[table];
      if (t instanceof Error) throw t;
      return { data: t ?? null, error: null };
    };
    return b;
  };
  return { from: (table: string) => builder(table) };
}

const NOW = new Date('2026-10-26T23:59:00Z');

describe('the Opening of the day on OtakuQuiz', () => {
  it('opens the openings quiz of the series of today\'s opening, never /blindtest', async () => {
    const log: string[] = [];
    const path = await openingOfTheDayPath(fake({
      daily_openings: { theme_id: 7 }, series_themes: { group_id: 3 }, groups: { slug: 'death-note' },
    }, log), NOW);
    expect(path).toBe('/death-note-openings-quiz');
    expect(log).toContain('daily_openings.site_id=anime');
    expect(log).toContain('daily_openings.date=2026-10-26');
    expect(log).toContain('series_themes.id=7');
  });

  it('falls back to the series index with no row for today, no published theme, no group, or any error', async () => {
    expect(SERIES_DIRECTORY_PATH).toBe('/series');
    expect(await openingOfTheDayPath(fake({}), NOW)).toBe('/series');
    expect(await openingOfTheDayPath(fake({ daily_openings: { theme_id: 7 } }), NOW)).toBe('/series');
    expect(await openingOfTheDayPath(fake({ daily_openings: { theme_id: 7 }, series_themes: { group_id: 3 } }), NOW)).toBe('/series');
    expect(await openingOfTheDayPath(fake({ daily_openings: new Error('db down') }), NOW)).toBe('/series');
  });

  it('reads the UTC date', () => {
    expect(utcDay(new Date('2026-10-26T23:59:59Z'))).toBe('2026-10-26');
    expect(utcDay(new Date('2026-10-27T00:00:00Z'))).toBe('2026-10-27');
  });
});
