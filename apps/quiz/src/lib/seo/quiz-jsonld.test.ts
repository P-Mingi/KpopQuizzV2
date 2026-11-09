// O1 audit 03 P2-3: dateModified equals the sitemap lastmod; no MusicGroup for the General K-pop category.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => ({ from: () => { throw new Error('no DB in this test'); } }),
}));

import { quizLastModified } from '@/lib/db/queries/quiz-explanations';

import { quizAbout, quizDateModified } from './quiz-jsonld';

describe('quizDateModified', () => {
  const created = '2026-10-01T10:00:00+00:00';

  it('is the quiz creation when it has no verified explanation', () => {
    expect(quizDateModified(created, undefined)).toBe('2026-10-01T10:00:00.000Z');
  });

  it('is the newest verified explanation when later', () => {
    expect(quizDateModified(created, Date.parse('2026-11-02T08:30:00Z'))).toBe('2026-11-02T08:30:00.000Z');
  });

  it('is never earlier than the creation', () => {
    expect(quizDateModified(created, Date.parse('2026-09-01T00:00:00Z'))).toBe('2026-10-01T10:00:00.000Z');
  });

  it('is the same instant the sitemap writes as lastmod for the quiz', () => {
    for (const explained of [undefined, Date.parse('2026-11-02T08:30:00Z'), Date.parse('2026-09-01T00:00:00Z')]) {
      expect(quizDateModified(created, explained)).toBe(quizLastModified(created, explained).toISOString());
    }
  });
});

describe('quizAbout', () => {
  it('a group quiz is about the MusicGroup of its hub', () => {
    expect(quizAbout('twice', 'TWICE')).toEqual({ about: { '@type': 'MusicGroup', name: 'TWICE', url: 'https://kpopquiz.org/twice-quiz' } });
  });

  it('a General K-pop quiz has no about (the category is not a music group)', () => {
    expect(quizAbout('general-kpop', 'General K-pop')).toEqual({});
  });
});
