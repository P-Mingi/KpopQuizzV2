import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ARTICLES } from '@/lib/articles/registry';
import { TITLE_MAX } from './quiz-meta';
import { fitTitle } from './title-fit';

// SEO (owner, 2026-10-14): rulebook 2.2. Bing reported titles over 60 characters with the
// " | KpopQuiz" suffix the root layout adds; the page's own part stays within TITLE_MAX (49).

const SUFFIX = ' | KpopQuiz';

describe('fitTitle', () => {
  it('keeps the richest wording that fits', () => {
    expect(fitTitle('BTS Trivia: 120 Facts Only Real Fans Know', 'BTS Trivia: 120 Facts')).toBe('BTS Trivia: 120 Facts Only Real Fans Know');
  });
  it('falls back to a shorter wording, never a cut word', () => {
    expect(fitTitle(
      'General K-pop Trivia: 622 Facts Only Real Fans Know',
      'General K-pop Trivia: 622 Facts for Real Fans',
      'General K-pop Trivia: 622 Facts',
    )).toBe('General K-pop Trivia: 622 Facts for Real Fans');
    expect(fitTitle(
      'Which LE SSERAFIM member are you? Personality quiz',
      'Which LE SSERAFIM member are you? Take the quiz',
      'Which LE SSERAFIM member are you?',
    )).toBe('Which LE SSERAFIM member are you? Take the quiz');
  });
  it('returns the plainest wording when none fits', () => {
    const long = 'x'.repeat(TITLE_MAX + 5);
    expect(fitTitle(`${long} a`, long)).toBe(long);
  });
  it('the limit is 60 with the suffix', () => {
    expect(TITLE_MAX + SUFFIX.length).toBe(60);
  });
});

describe('typed titles fit', () => {
  it('every indexable article title', () => {
    for (const a of ARTICLES.filter((x) => !x.noindex)) {
      expect(a.title.length, `${a.slug}: ${a.title}`).toBeLessThanOrEqual(TITLE_MAX);
    }
  });

  it('every group hub override title', () => {
    const src = readFileSync(fileURLToPath(new URL('../../app/(site)/[slug]/group-quiz-page.tsx', import.meta.url)), 'utf8');
    const block = src.slice(src.indexOf('const GROUP_SEO_OVERRIDES'), src.indexOf('export function generateGroupQuizMetadata'));
    const titles = [...block.matchAll(/title: '([^']+)'/g)].map((m) => m[1]!);
    expect(titles.length).toBeGreaterThanOrEqual(9);
    for (const t of titles) expect(t.length, t).toBeLessThanOrEqual(TITLE_MAX);
  });
});
