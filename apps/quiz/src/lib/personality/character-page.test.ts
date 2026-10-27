// Run O1, lane PERS: the view of Which character are you (anime build) and the dispatch of getWmaPage: the anime build gets the
// series' quiz, the kpop build keeps its Which member are you view exactly.
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SeriesWmaData } from './data';
import type { Axes } from './engine';

const data = vi.hoisted(() => ({
  series: null as unknown,
  wma: null as unknown,
  counts: null as Record<string, number> | null,
}));
vi.mock('./data', () => ({
  getSeriesWmaData: async () => data.series,
  getWmaData: async () => data.wma,
  getMemberCounts: async () => data.counts,
  // Fusion A5: main's kpop page reads the counts with their date.
  getDatedMemberCounts: async () => (data.counts ? { counts: data.counts, asOf: '2026-10-27T00:00:00.000Z' } : null),
  getBridgeCounts: async () => null,
  getBridgeGroups: async () => [],
}));
vi.mock('@/lib/ux-v1/p6/hub-data', () => ({ getPlayableGroups: async () => [{ slug: 'stray-kids', songs: 32 }] }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); data.series = null; data.wma = null; data.counts = null; });

const Q = (text: string): { text: string; options: Array<{ text: string; weights: Record<string, number> }> } => ({
  text,
  options: [
    { text: 'Quiet', weights: { energy: 0 } }, { text: 'Loud', weights: { energy: 5 } },
    { text: 'Calm', weights: { chaos: 0 } }, { text: 'Wild', weights: { chaos: 5 } },
  ],
});
const AX = (energy: number): Axes => ({ energy, chaos: 50, care: 50, craft: 50, heart: 50, spotlight: 50 });
const questions = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => Q(`Question ${n}?`));

const SERIES: SeriesWmaData = {
  group: { id: 7, slug: 'death-note', name: 'Death Note', fandom: null },
  questions,
  profiles: [
    { id: 'light-yagami', name: 'Light Yagami', axes: AX(60), lines: ['You plan.', 'You win.'], role: 'main', affiliation: 'Yagami family' },
    { id: 'l', name: 'L', axes: AX(10), lines: ['You crouch.'], role: 'main', affiliation: 'Kira investigation team' },
    { id: 'ryuk', name: 'Ryuk', axes: AX(30), lines: ['You watch.'], role: 'supporting', affiliation: 'Shinigami' },
    { id: 'soichiro-yagami', name: 'Soichiro Yagami', axes: AX(55), lines: ['You carry it.'], role: 'supporting', affiliation: null },
    { id: 'touta-matsuda', name: 'Touta Matsuda', axes: AX(90), lines: ['You smile.'], role: 'supporting', affiliation: 'National Police Agency' },
    { id: 'kanzo-mogi', name: 'Kanzo Mogi', axes: AX(5), lines: ['You notice.'], role: 'supporting', affiliation: 'National Police Agency' },
  ],
};

describe('getCharacterPage', () => {
  it('builds the quiz view of the series: its words, its URL, its characters', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    data.series = SERIES;
    const { getCharacterPage } = await import('./character-page');
    const page = await getCharacterPage('death-note');
    expect(page?.group.slug).toBe('death-note');
    expect(page?.blindtestSongs).toBeNull();
    const v = page!.view;
    expect(v.quiz).toBe('wma');
    expect(v.groupSlug).toBe('death-note');
    expect(v.title).toEqual({ before: 'Which ', em: 'Death Note', after: ' character are you?' });
    expect(v.kicker).toBe('Which character are you');
    expect(v.shareUrl).toBe('https://otakuquiz.org/which-death-note-character-are-you');
    expect(v.shareKicker).toBe('Which Death Note character are you');
    expect(v.meta).toEqual(['8 questions', 'About 2 minutes', 'No pictures needed']);
    expect(v.questions).toHaveLength(8);
    expect(v.biasOffer).toBe(true);
    expect(v.who).toBe('fans');
    expect(v.results).toHaveLength(6);
    expect(v.results[0]).toEqual({
      id: 'light-yagami', name: 'Light Yagami', role: 'Main character, Yagami family', description: 'You plan. You win.',
      traits: expect.any(Array), photo: null,
    });
    expect(v.results[3]?.role).toBe('Supporting character of Death Note');
    // never a picture, never a kpop word
    expect(v.results.every((r) => r.photo === null && r.songs === undefined && r.groupHref === undefined)).toBe(true);
    const text = JSON.stringify(v);
    expect(text).not.toMatch(/kpop|k-pop|\bmember\b|\bbias\b|blind ?test|\.png|\.jpe?g|\.webp/i);
  });

  it('the engine of the view finds a result among the characters, from the answer sheet', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    data.series = SERIES;
    const { getCharacterPage } = await import('./character-page');
    const { resolveResult } = await import('./engine');
    const v = (await getCharacterPage('death-note'))!.view;
    const loud = resolveResult(v.engine, new Array(8).fill(1));
    const quiet = resolveResult(v.engine, new Array(8).fill(0));
    expect(loud).toBe('touta-matsuda');
    expect(quiet).toBe('kanzo-mogi');
    expect(v.results.map((r) => r.id)).toContain(loud);
  });

  it('shows the shares of real results only above the floor, with the characters as outcomes', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    data.series = SERIES;
    data.counts = { 'Light Yagami': 6, L: 4, Ryuk: 2, 'Kanzo Mogi': 1 };
    const { getCharacterPage } = await import('./character-page');
    expect((await getCharacterPage('death-note'))!.view.distribution).toBeNull();
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    data.counts = { 'Light Yagami': 12, L: 8, Ryuk: 4, 'Kanzo Mogi': 1, 'Someone removed': 50 };
    const again = await import('./character-page');
    const dist = (await again.getCharacterPage('death-note'))!.view.distribution;
    expect(dist?.total).toBe(25);
    expect(dist?.rows.map((r) => r.label)).toEqual(['Light Yagami', 'L', 'Ryuk', 'Soichiro Yagami', 'Touta Matsuda', 'Kanzo Mogi']);
  });

  it('a series without a quiz is null', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    data.series = null;
    const { getCharacterPage } = await import('./character-page');
    expect(await getCharacterPage('naruto')).toBeNull();
  });
});

describe('getWmaPage', () => {
  it('on the anime build answers with the series quiz', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    data.series = SERIES;
    const { getWmaPage } = await import('./server');
    const page = await getWmaPage('death-note');
    expect(page?.view.title.after).toBe(' character are you?');
    expect(await getWmaPage('naruto').then(() => 'ok')).toBe('ok');
  });

  it('on the kpop build is today\'s Which member are you: the same view, no profile text, the bias offer, the real blind test', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'kpop');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:9');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'o1-test-anon');
    data.series = SERIES; // must never be read on kpop
    data.wma = {
      group: { id: 3, slug: 'stray-kids', name: 'Stray Kids', fandom: 'STAY' },
      questions,
      profiles: [
        { id: 'bang-chan', name: 'Bang Chan', axes: { energy: 55, chaos: 30, care: 5, craft: 80, heart: 25, spotlight: 55 } },
        { id: 'lee-know', name: 'Lee Know', axes: { energy: 30, chaos: 55, care: 40, craft: 20, heart: 75, spotlight: 60 } },
      ],
    };
    const { getWmaPage } = await import('./server');
    const page = await getWmaPage('stray-kids');
    expect(page?.blindtestSongs).toBe(32);
    const v = page!.view;
    expect(v.title).toEqual({ before: 'Which ', em: 'Stray Kids', after: ' member are you?' });
    expect(v.kicker).toBe('Which member are you');
    expect(v.who).toBe('STAY');
    expect(v.biasOffer).toBe(true);
    expect(v.shareUrl).toBe('https://kpopquiz.org/which-stray-kids-member-are-you');
    expect(v.results[0]).toEqual({
      // Fusion A5: main prints the sourced role (rosters.ts, Wikipedia line), no longer the old written one.
      id: 'bang-chan', name: 'Bang Chan', role: 'Leader, vocalist, rapper, dancer', description: expect.stringMatching(/^You /), traits: expect.any(Array), photo: null,
    });
    expect(Object.keys(v.results[0]!).sort()).toEqual(['description', 'id', 'name', 'photo', 'role', 'traits']);
    expect(Object.keys(v).sort()).toEqual([
      'biasOffer', 'cta', 'distribution', 'engine', 'eyebrow', 'groupSlug', 'kicker', 'kickerIcon', 'lead', 'meta', 'questions', 'quiz', 'results', 'shareKicker', 'shareUrl', 'title', 'who',
    ]);
  });
});
