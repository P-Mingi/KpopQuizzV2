import { describe, expect, it } from 'vitest';

import { GENERAL_THEMES, HELD_FROM_THEMES, THEME_SLUGS } from './general-themes';

// The plan's rules for the 10 theme pages (THEMES-PLAN-2026-10-27.md, rulebook 2 and 3).
const SUFFIX = ' | KpopQuiz';
const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

describe('the 10 General K-pop themes', () => {
  it('are 10, each a -quiz slug, all distinct', () => {
    expect(GENERAL_THEMES).toHaveLength(10);
    expect(new Set(THEME_SLUGS).size).toBe(10);
    for (const s of THEME_SLUGS) expect(s).toMatch(/^kpop-[a-z-]+-quiz$/);
  });

  it('title 60 or fewer with the suffix, description 120 to 160, intro 40 to 60 words', () => {
    for (const t of GENERAL_THEMES) {
      expect((t.title + SUFFIX).length, t.slug).toBeLessThanOrEqual(60);
      expect(t.description.length, t.slug).toBeGreaterThanOrEqual(120);
      expect(t.description.length, t.slug).toBeLessThanOrEqual(160);
      const n = words(t.intro.replace('{count}', '19'));
      expect(n, t.slug).toBeGreaterThanOrEqual(40);
      expect(n, t.slug).toBeLessThanOrEqual(60);
      expect(t.intro, t.slug).toContain('{count}');
    }
  });

  it('one primary phrase shared by the title, the H1, the description and the intro', () => {
    for (const t of GENERAL_THEMES) {
      const p = t.primaryPhrase.toLowerCase();
      expect(t.h1.toLowerCase(), t.slug).toBe(p);
      for (const field of [t.title, t.description, t.intro]) expect(field.toLowerCase(), t.slug).toContain(p);
    }
  });

  it('every quiz has one primary theme; held quizzes are listed nowhere', () => {
    const primary = GENERAL_THEMES.flatMap((t) => t.sections.flatMap((s) => s.slugs));
    expect(new Set(primary).size).toBe(primary.length);
    expect(primary).toHaveLength(163);
    const listed = new Set([...primary, ...GENERAL_THEMES.flatMap((t) => t.alsoFits)]);
    for (const h of HELD_FROM_THEMES) expect(listed.has(h), h).toBe(false);
    for (const t of GENERAL_THEMES) for (const a of t.alsoFits) expect(t.sections.some((s) => s.slugs.includes(a)), `${t.slug} ${a}`).toBe(false);
  });

  it('owner links use their own anchors, and no copy has an em or en dash', () => {
    for (const t of GENERAL_THEMES) {
      expect(t.ownerLinks.length, t.slug).toBeGreaterThan(0);
      expect(JSON.stringify(t), t.slug).not.toMatch(/[–—]/);
    }
  });
});
