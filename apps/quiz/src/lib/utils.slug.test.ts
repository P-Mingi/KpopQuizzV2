import { describe, expect, it } from 'vitest';

import { generateSlug, SLUG_MAX } from './utils';

// The slug of every new quiz (owner, 2026-10-13: SEO). Real titles from the catalogue,
// including the ones that gave the live slugs "can-you-guess-the-ive-song-from-3-clues-"
// and "-nct-find-the-intruder".

describe('generateSlug', () => {
  it('no hyphen at either end', () => {
    expect(generateSlug('Can you guess the IVE song from 3 clues?')).toBe('can-you-guess-the-ive-song-from-3-clues');
    expect(generateSlug('#NCT find the intruder')).toBe('nct-find-the-intruder');
    expect(generateSlug('Only a real TUNES can pass this !')).toBe('only-a-real-tunes-can-pass-this');
  });
  it('accents are folded, not dropped', () => {
    expect(generateSlug('Você conhece o BTS?')).toBe('voce-conhece-o-bts');
    expect(generateSlug('Quiz Beyoncé et Rosé')).toBe('quiz-beyonce-et-rose');
  });
  it('a separator between two words keeps them apart', () => {
    expect(generateSlug('BTS/BLACKPINK songs')).toBe('bts-blackpink-songs');
    expect(generateSlug('Jennie & Lisa')).toBe('jennie-lisa');
  });
  it('a long title is cut on a word boundary', () => {
    const s = generateSlug('Guess the common song of these legendary K-pop girl group artists from the second generation');
    expect(s.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(s).toBe('guess-the-common-song-of-these-legendary-k-pop-girl-group');
  });
  it('the slugs it made before are unchanged for plain titles', () => {
    expect(generateSlug('Ultimate BTS era quiz: only real ARMYs survive')).toBe('ultimate-bts-era-quiz-only-real-armys-survive');
    expect(generateSlug("Stray Kids' members")).toBe('stray-kids-members');
  });
  it('a title with no Latin letter gives an empty slug (the caller has a fallback)', () => {
    expect(generateSlug('방탄소년단 퀴즈')).toBe('');
  });
});
