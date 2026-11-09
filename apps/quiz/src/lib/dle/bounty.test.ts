// Owner feedback 2026-11-08, item 3: the bounty of One Piece in short, the Berry symbol last after a no-break space. Every bounty of the game's data is formatted here (the rows of
// docs/pending-migrations/multisite/launch/L15-A2-series-games.sql), so a value the format cannot hold fails this file.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { valueLabel } from './copy';
import { formatBounty } from './value-i18n';

const N = ' ';
const NN = ' ';
const B = '฿';

describe('formatBounty', () => {
  it('French: milliards and millions, the unit in the singular under 2, a no-break space before the symbol', () => {
    expect(formatBounty(3_000_000_000, 'fr')).toBe(`3 milliards${N}${B}`);
    expect(formatBounty(320_000_000, 'fr')).toBe(`320 millions${N}${B}`);
    expect(formatBounty(1_000_000_000, 'fr')).toBe(`1 milliard${N}${B}`);
    expect(formatBounty(1_500_000_000, 'fr')).toBe(`1,5 milliard${N}${B}`);
    expect(formatBounty(1_000_000, 'fr')).toBe(`1 million${N}${B}`);
    expect(formatBounty(5_564_800_000, 'fr')).toBe(`5,56 milliards${N}${B}`);
  });

  it('English: billion and million, never plural', () => {
    expect(formatBounty(3_000_000_000, 'en')).toBe(`3 billion${N}${B}`);
    expect(formatBounty(320_000_000, 'en')).toBe(`320 million${N}${B}`);
    expect(formatBounty(1_500_000_000, 'en')).toBe(`1.5 billion${N}${B}`);
    expect(formatBounty(1_000_000_000, 'en')).toBe(`1 billion${N}${B}`);
    expect(formatBounty(5_564_800_000, 'en')).toBe(`5.56 billion${N}${B}`);
  });

  it('under a million: the whole number with the grouping of the language', () => {
    expect(formatBounty(50_000, 'fr')).toBe(`50${NN}000${N}${B}`);
    expect(formatBounty(50_000, 'en')).toBe(`50,000${N}${B}`);
    expect(formatBounty(1000, 'fr')).toBe(`1${NN}000${N}${B}`);
    expect(formatBounty(999, 'en')).toBe(`999${N}${B}`);
    expect(formatBounty(0, 'en')).toBe(`0${N}${B}`);
  });

  it('rounds up to the next unit instead of writing 1 000 millions', () => {
    expect(formatBounty(999_999_999, 'fr')).toBe(`1 milliard${N}${B}`);
    expect(formatBounty(999_994_999, 'en')).toBe(`999.99 million${N}${B}`);
  });

  it('the cell of the game: valueLabel gives the short form, and "No bounty" keeps its stored label', () => {
    expect(valueLabel('bounty', 3_000_000_000, 'fr', { series: true })).toBe(`3 milliards${N}${B}`);
    expect(valueLabel('bounty', 320_000_000, 'en', { series: true })).toBe(`320 million${N}${B}`);
    expect(valueLabel('bounty', 0, 'fr', { series: true, label: 'No bounty' })).toBe('Pas de prime');
    expect(valueLabel('bounty', 0, 'en', { series: true, label: 'No bounty' })).toBe('No bounty');
  });

  it('every bounty of the data (L15-A2) reads as a short number, a unit and the symbol, in both languages', () => {
    const sql = readFileSync(join(__dirname, '../../../../../docs/pending-migrations/multisite/launch/L15-A2-series-games.sql'), 'utf8');
    const values = [...new Set([...sql.matchAll(/"bounty":\{"v":(\d+)\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
    expect(values.length).toBeGreaterThan(30);
    for (const v of values) {
      const fr = formatBounty(v, 'fr');
      const en = formatBounty(v, 'en');
      if (v >= 1_000_000) {
        expect(fr, String(v)).toMatch(new RegExp(`^\\d{1,3}(,\\d{1,2})? (million|millions|milliard|milliards)${N}${B}$`));
        expect(en, String(v)).toMatch(new RegExp(`^\\d{1,3}(\\.\\d{1,2})? (million|billion)${N}${B}$`));
        expect(fr.length, String(v)).toBeLessThanOrEqual(19);
      } else {
        expect(fr, String(v)).toMatch(new RegExp(`^\\d{1,3}(${NN}\\d{3})*${N}${B}$`));
        expect(en, String(v)).toMatch(new RegExp(`^\\d{1,3}(,\\d{3})*${N}${B}$`));
      }
      expect(fr).not.toMatch(/[—–]/);
    }
    // Two different bounties never read the same, so an arrow never sits under two cells that look equal.
    expect(new Set(values.map((v) => formatBounty(v, 'en'))).size).toBe(values.length);
  });
});
