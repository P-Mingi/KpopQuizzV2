// O1 audit 03 P0-2: the quiz-derived trivia page is noindex,follow, with its canonical kept.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({ default: () => null }));

import { generateGroupTriviaMetadata } from './group-trivia-page';

import type { Group } from '@/types/database';

describe('generateGroupTriviaMetadata', () => {
  it.each(['twice', 'general-kpop', 'seventeen'])('%s: noindex,follow and self canonical', (slug) => {
    const m = generateGroupTriviaMetadata({ id: 1, slug, name: slug } as unknown as Group, 14);
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.alternates?.canonical).toBe(`/${slug}-trivia`);
  });
});
