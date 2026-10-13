import { describe, expect, it } from 'vitest';

import { topResults } from './about';

// The most common results printed below a Which member are you quiz (owner, 2026-10-13:
// SEO): the top three only, never the member fans get least (SYSTEM.md 5.1).

describe('topResults', () => {
  const d = { total: 140, rows: [
    { id: 'rm', label: 'RM', pct: 6.43 }, { id: 'jin', label: 'Jin', pct: 11.43 }, { id: 'suga', label: 'Suga', pct: 5 },
    { id: 'j-hope', label: 'J-Hope', pct: 0.4 }, { id: 'jimin', label: 'Jimin', pct: 54.29 }, { id: 'v', label: 'V', pct: 22.45 },
  ] };
  it('the three biggest, rounded, biggest first', () => {
    expect(topResults(d)).toEqual([{ label: 'Jimin', pct: 54 }, { label: 'V', pct: 22 }, { label: 'Jin', pct: 11 }]);
  });
  it('nothing under the floor, and never a 0%', () => {
    expect(topResults(null)).toEqual([]);
    expect(topResults({ total: 30, rows: [{ id: 'a', label: 'A', pct: 99.8 }, { id: 'b', label: 'B', pct: 0.2 }] }, 3)).toEqual([{ label: 'A', pct: 100 }]);
  });
});
