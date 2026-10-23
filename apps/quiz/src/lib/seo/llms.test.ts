import { describe, expect, it, vi } from 'vitest';

// lib/seo/llms.ts imports the stats module for its formatters; the cached reader it also
// exports is never called here.
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => { throw new Error('no db in unit tests'); } }));

import { buildLlmsTxt } from './llms';
import { TARGET_CLUSTERS } from './targets';
import { atLeast } from '@/lib/stats/site-stats';

import type { PublicStats } from '@/lib/stats/site-stats';

// SEO Mission 3, part F.4: llms.txt is generated from the site stats function and the
// cluster owners. Counts come from the stats (rounded by atLeast), never typed; with no
// stats it says "hundreds of", never a number; planned pages are never listed.

const STATS: PublicStats = { quizzes: 457, groupsWithQuizzes: 41, groupsListed: 63, songs: 2311, songGroups: 40, plays: 73425, asOf: '2026-10-15T08:00:00.000Z' };

describe('buildLlmsTxt', () => {
  it('prints the live counts through atLeast, with their date', () => {
    const txt = buildLlmsTxt(STATS, TARGET_CLUSTERS);
    expect(txt).toContain(`${atLeast(457)} published quizzes about ${atLeast(41)} K-pop groups, ${atLeast(2311)} songs in the blind test, and ${atLeast(73425)} finished quiz plays (counts as of October 15, 2026, rounded down)`);
    expect(txt).not.toContain('457');
    expect(txt).not.toContain('73425');
  });

  it('writes words, not numbers, when the counts cannot be read', () => {
    const txt = buildLlmsTxt(null, TARGET_CLUSTERS);
    expect(txt).toContain('hundreds of published quizzes about dozens of K-pop groups');
    expect(txt).not.toContain('counts as of');
  });

  it('lists every live cluster owner and no planned page', () => {
    const txt = buildLlmsTxt(STATS, TARGET_CLUSTERS);
    for (const t of TARGET_CLUSTERS) {
      const shown = txt.includes(`https://kpopquiz.org${t.url === '/' ? '/' : t.url}`);
      expect(shown, `${t.status} ${t.url}`).toBe(t.status === 'live');
    }
  });

  it('has the llmstxt.org shape and the citing and press lines', () => {
    const txt = buildLlmsTxt(STATS, TARGET_CLUSTERS);
    expect(txt.startsWith('# kpopquiz.org\n\n> ')).toBe(true);
    expect(txt).toContain('## Main pages');
    expect(txt).toContain('CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)');
    expect(txt).toContain('A link is appreciated; nofollow is fine.');
    expect(txt).toContain('"Source: kpopquiz.org K-pop Knowledge Report 2026"');
    expect(txt).toContain('[Press kit](https://kpopquiz.org/press)');
    expect(txt).not.toContain('llms-full');
  });

  it('contains no em or en dash', () => {
    expect(buildLlmsTxt(STATS, TARGET_CLUSTERS)).not.toMatch(/[\u2013\u2014]/);
    expect(buildLlmsTxt(null, TARGET_CLUSTERS)).not.toMatch(/[\u2013\u2014]/);
  });
});
