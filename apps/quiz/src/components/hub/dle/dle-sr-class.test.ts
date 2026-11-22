// Owner, 2026-11-22 (seen at 375 px): the dle pages scrolled sideways on a phone. The series review section was named hub-dle-sr, the class of
// the screen-reader-only text, and its rule widened every hidden label to the page width. The class has one rule, the clipped 1 px box.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../../styles/sites/hub/dle.css', import.meta.url), 'utf8');

describe('the screen-reader-only class of the dle pages', () => {
  it('has exactly one rule, the clipped 1 px box, and no other rule styles it or its children', () => {
    const rules = css.split('\n').filter((l) => /\.hub-dle-sr(?![a-z-])/.test(l));
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatch(/\.hub-dle-sr \{ position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect\(0 0 0 0\); white-space: nowrap; \}/);
  });

  it('the owner\'s series review has its own class', () => {
    const src = readFileSync(new URL('./dle-series-review.tsx', import.meta.url), 'utf8');
    expect(src).toContain('className="hub-dle-review"');
    expect(src).not.toContain('className="hub-dle-sr"');
    expect(css).toMatch(/\.hub-dle-review \{ width: 100%;/);
  });
});
