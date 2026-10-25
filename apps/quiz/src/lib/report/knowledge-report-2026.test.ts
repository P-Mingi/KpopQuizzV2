import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { EASIEST, HARDEST, REPORT_CREDIT, REPORT_SCORES } from './knowledge-report-2026';

// SEO Mission 3, part F.3: the report's figures (and the charts drawn from them) are the
// published dataset's, never retyped from memory. This re-reads docs/data/w5-dataset.md.

const DATASET = readFileSync(fileURLToPath(new URL('../../../../../docs/data/w5-dataset.md', import.meta.url)), 'utf8');

/** The rows of the first markdown table after `heading`: [#, score, plays, difficulty, title]. */
function tableAfter(heading: string): string[][] {
  const from = DATASET.indexOf(heading);
  expect(from, heading).toBeGreaterThanOrEqual(0);
  const lines = DATASET.slice(from).split('\n');
  const rows: string[][] = [];
  let started = false;
  for (const line of lines.slice(1)) {
    if (line.startsWith('|')) {
      started = true;
      rows.push(line.split('|').slice(1, -1).map((c) => c.trim()));
    } else if (started) {
      break;
    }
  }
  return rows.filter((r) => /^\d+$/.test(r[0] ?? ''));
}

const num = (s: string): number => Number(s.replace(/[*,]/g, ''));

describe('Knowledge Report figures match the dataset', () => {
  it('the hardest table is section L1, rows 1 to 5, in order', () => {
    const l1 = tableAfter('### L1.');
    HARDEST.forEach(([score, attempts, title], i) => {
      const row = l1[i]!;
      expect(row[1]).toBe(score);
      expect(row[2]).toBe(attempts);
      expect(row[4]!.startsWith(title), `${row[4]} / ${title}`).toBe(true);
    });
  });

  it('every row of the easiest table is a row of section L2', () => {
    const l2 = tableAfter('### L2.');
    for (const [score, attempts, title] of EASIEST) {
      const row = l2.find((r) => r[1] === score && r[2] === attempts);
      expect(row, title).toBeDefined();
      expect(row![4]!.startsWith(title), `${row![4]} / ${title}`).toBe(true);
    }
  });

  it('attempts, perfect and zero scores are section R2', () => {
    const r2 = DATASET.slice(DATASET.indexOf('## R2.'), DATASET.indexOf('## R3.'));
    expect(num(/Denominator: \*\*([\d,]+)\*\*/.exec(r2)![1]!)).toBe(REPORT_SCORES.attempts);
    expect(num(/\| perfect [^|]*\| \*\*([\d,]+)\*\*/.exec(r2)![1]!)).toBe(REPORT_SCORES.perfect);
    expect(num(/\| zero [^|]*\| \*\*([\d,]+)\*\*/.exec(r2)![1]!)).toBe(REPORT_SCORES.zero);
  });

  it('the credit line is the one the mission fixed', () => {
    expect(REPORT_CREDIT).toBe('Source: kpopquiz.org K-pop Knowledge Report 2026');
  });
});
