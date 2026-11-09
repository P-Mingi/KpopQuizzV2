import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { blindtestMeta, quizzesIndexMeta } from './index-pages-meta';
import { freshGroupHubMeta, groupHubHead, legacyBlindtestHead, legacyQuizzesMeta, type HubHeadGroup } from './frozen-heads';
import { quizSeoTitle, quizTitle } from './quiz-meta';
import { quizPageTitle } from './quiz-title-overrides';
import { TOP_CLICKS_FROZEN, isTopClicksFrozen } from './top-clicks-freeze';

// Audit 04 section 2.4: the 20 pages with the most clicks keep main's head. The expected strings below are written out from main
// (4d865c7, group-quiz-page.tsx, quizzes/page.tsx, blindtest/page.tsx), not computed by the code under test.

const hub = (slug: string, name: string, fandom: string | null, n: number): HubHeadGroup => ({ slug, name, fandom_name: fandom, quiz_count: n });
const head = (g: HubHeadGroup, levels = 3) => groupHubHead(g, false, 'topics', freshGroupHubMeta({ name: g.name, fandomName: g.fandom_name, quizCount: g.quiz_count, levels }));

describe('the list', () => {
  it('holds 20 unique paths, no count, no dash', () => {
    expect(TOP_CLICKS_FROZEN).toHaveLength(20);
    expect(new Set(TOP_CLICKS_FROZEN).size).toBe(20);
    const src = readFileSync(fileURLToPath(new URL('./top-clicks-freeze.ts', import.meta.url)), 'utf8');
    expect(src).not.toMatch(/[–—]/);
    expect(src).toContain('Search Console export of 2026-11-09');
    expect(src).not.toMatch(/\b\d{3,}\b.*clicks|clicks.*\b\d{3,}\b/i);
  });
});

describe('group hubs: a frozen hub equals main', () => {
  const cases: Array<[HubHeadGroup, string, string]> = [
    [hub('illit', 'ILLIT', 'GLLIT', 12), 'ILLIT Quiz: Free Fan-Made Tests for GLLIT (2026)', "Play 12 free ILLIT quizzes made by fans. Test your knowledge of ILLIT's members, songs, and eras, then prove you are a real GLLIT. Start now, no sign-up."],
    [hub('cortis', 'Cortis', 'FANDOM', 9), 'Cortis Quiz: Test How Well You Know the Rookies', "Play 9 free Cortis quizzes made by fans. Test your knowledge of Cortis's members, songs, and 2025 debut. Start now, no sign-up."],
    [hub('seventeen', 'SEVENTEEN', 'CARAT', 20), 'SEVENTEEN Quiz: Can You Name All 13 Members?', 'Play 20 free SEVENTEEN quizzes made by fans. Name all 13 members, guess the era, and prove you are a real CARAT. Start now, no sign-up.'],
    [hub('stray-kids', 'Stray Kids', 'STAY', 20), 'Stray Kids Quiz: Name All 8 Members and More', 'Play 20 free Stray Kids quizzes made by fans. Name all 8 members, guess the song, and prove you are a real STAY. Start now, no sign-up.'],
    [hub('bts', 'BTS', 'ARMY', 40), 'BTS Quiz: How Well Do You Know BTS? Easy to Hard', 'Take a BTS quiz at your level, from easy member questions to hard era deep cuts, ranked by how fans really score. Free, no sign-up, with a sourced BTS profile.'],
    [hub('babymonster', 'BABYMONSTER', 'MONSTIEZ', 15), 'BABYMONSTER Quiz: Free Tests for the YG Rookies', "Play 15 free BABYMONSTER quizzes made by fans. Test your knowledge of BABYMONSTER's members, songs, and eras. Start now, no sign-up."],
    [hub('aespa', 'aespa', 'MY', 20), 'aespa Quiz: Name All 4 Members and More (2026)', 'Play 20 free aespa quizzes made by fans. Name all 4 members, guess the era, and prove you are a real MY. Start now, no sign-up.'],
    [hub('twice', 'TWICE', 'ONCE', 20), 'TWICE Quiz: Can You Name All 9 Members? (2026)', 'Play 20 free TWICE quizzes made by fans. Name all 9 members, guess the era, and prove you are a real ONCE. Start now, no sign-up.'],
    [hub('newjeans', 'NewJeans', 'Bunnies', 14), 'NewJeans Quiz: 14 Free Fan-Made Tests', "Play 14 free NewJeans quizzes made by fans. Test your knowledge of NewJeans's members, songs, eras, and history, then prove you are a real Bunnies."],
    [hub('ateez', 'ATEEZ', 'ATINY', 18), 'ATEEZ Quiz: 18 Free Fan-Made Tests', "Play 18 free ATEEZ quizzes made by fans. Test your knowledge of ATEEZ's members, songs, eras, and history, then prove you are a real ATINY."],
    [hub('ive', 'IVE', 'DIVE', 11), 'IVE Quiz: 11 Free Fan-Made Tests', "Play 11 free IVE quizzes made by fans. Test your knowledge of IVE's members, songs, eras, and history, then prove you are a real DIVE."],
    [hub('enhypen', 'ENHYPEN', 'ENGENE', 16), 'ENHYPEN Quiz: 16 Free Fan-Made Tests', "Play 16 free ENHYPEN quizzes made by fans. Test your knowledge of ENHYPEN's members, songs, eras, and history, then prove you are a real ENGENE."],
  ];
  for (const [g, title, description] of cases) {
    it(`/${g.slug}-quiz`, () => {
      expect(isTopClicksFrozen(`/${g.slug}-quiz`)).toBe(true);
      expect(head(g)).toEqual({ title, description });
      // At several level counts the frozen head does not move.
      expect(head(g, 1)).toEqual(head(g, 4));
    });
  }
  it('a hub that is not frozen keeps the audit 04 output', () => {
    const g = hub('blackpink', 'BLACKPINK', 'BLINK', 20);
    expect(isTopClicksFrozen('/blackpink-quiz')).toBe(false);
    expect(head(g)).toEqual(freshGroupHubMeta({ name: 'BLACKPINK', fandomName: 'BLINK', quizCount: 20, levels: 3 }));
    expect(head(g).title).toBe('BLACKPINK Quiz: 20 Free Tests, Easy to Hard');
  });
  it('lifting a line gives the audit 04 output for that page only', () => {
    const i = TOP_CLICKS_FROZEN.indexOf('/illit-quiz');
    const mutable = TOP_CLICKS_FROZEN as string[];
    mutable.splice(i, 1);
    try {
      const g = hub('illit', 'ILLIT', 'GLLIT', 12);
      expect(head(g)).toEqual(freshGroupHubMeta({ name: 'ILLIT', fandomName: 'GLLIT', quizCount: 12, levels: 3 }));
      expect(head(g).title).not.toContain('(2026)');
      expect(head(hub('cortis', 'Cortis', 'FANDOM', 9)).title).toBe('Cortis Quiz: Test How Well You Know the Rookies');
    } finally {
      mutable.splice(i, 0, '/illit-quiz');
    }
    expect(head(hub('illit', 'ILLIT', 'GLLIT', 12)).title).toContain('(2026)');
  });
});

describe('/quizzes and /blindtest', () => {
  it('/quizzes frozen head equals main, with and without stats', () => {
    expect(isTopClicksFrozen('/quizzes')).toBe(true);
    expect(legacyQuizzesMeta('450+ ')).toEqual({
      title: 'K-pop Quizzes: 450+ Free Fan-Made Tests',
      description: 'Browse 450+ free K-pop quizzes made by fans. Filter by group or type, sort by trending, newest, or most played, and test your bias knowledge now.',
    });
    expect(legacyQuizzesMeta('').title).toBe('K-pop Quizzes: Free Fan-Made Tests');
    expect(quizzesIndexMeta('450+').title).toBe('Browse 450+ K-pop Quizzes by Group and Level');
  });
  it('/blindtest frozen head equals main: title, description, Open Graph', () => {
    expect(isTopClicksFrozen('/blindtest')).toBe(true);
    const h = legacyBlindtestHead('300+ songs across 40+ groups');
    expect(h.title).toBe('K-pop Blind Test - Guess the Song from a Clip');
    expect(h.description).toBe('Play the free K-pop blind test: hear a 10-second clip and guess the song. 300+ songs across 40+ groups, from every generation. No sign-up.');
    expect(h.ogTitle).toBe('K-pop Blind Test - Guess the Song from a Clip');
    expect(h.ogDescription).toBe('Listen to a 10-second clip and guess the K-pop song. 300+ songs across 40+ groups, every generation.');
    expect(blindtestMeta({ songs: '300+', groups: '40+' }).title).toBe('K-pop Blind Test: 300+ Songs from 40+ Groups');
  });
});

describe('/q/ pages', () => {
  const group = { name: 'ILLIT', slug: 'illit' };
  it('a frozen /q/ page keeps main\'s title wording (quizTitle)', () => {
    for (const slug of ['babymonster-quiz', 'illit-quiz', 'cortis-quiz']) {
      expect(isTopClicksFrozen(`/q/${slug}`)).toBe(true);
      expect(quizPageTitle(slug, 'are u a real GLLIT?!!', 3, group)).toBe(quizTitle('are u a real GLLIT?!!', 3));
    }
  });
  it('another /q/ page and a lifted one get the audit 04 title', () => {
    expect(quizPageTitle('other', 'are u a real GLLIT?!!', 3, group)).toBe(quizSeoTitle('are u a real GLLIT?!!', 3, group));
    const mutable = TOP_CLICKS_FROZEN as string[];
    const i = mutable.indexOf('/q/illit-quiz');
    mutable.splice(i, 1);
    try {
      expect(quizPageTitle('illit-quiz', 'are u a real GLLIT?!!', 3, group)).toBe(quizSeoTitle('are u a real GLLIT?!!', 3, group));
    } finally {
      mutable.splice(i, 0, '/q/illit-quiz');
    }
  });
  it('the corrections go through on a frozen page: the description and the author do not read the list', () => {
    const src = readFileSync(fileURLToPath(new URL('../../app/(site)/q/[slug]/page.tsx', import.meta.url)), 'utf8');
    expect(src).not.toMatch(/isTopClicksFrozen|TOP_CLICKS_FROZEN/);
    expect(src).toContain('quizAuthorJsonLd(');
    expect(src).toContain('quizPageTitle(');
  });
});

describe('the templates are wired to the list', () => {
  const read = (p: string): string => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
  it('group hub, /quizzes and /blindtest ask the list', () => {
    expect(read('../../app/(site)/[slug]/group-quiz-page.tsx')).toContain('groupHubHead(');
    expect(read('../../app/(site)/quizzes/page.tsx')).toContain("isTopClicksFrozen('/quizzes')");
    expect(read('../../app/(site)/blindtest/page.tsx')).toContain("isTopClicksFrozen('/blindtest')");
  });
  it('every frozen path is either served by a wired template or by a page audit 04 does not change', () => {
    const wired = (p: string): boolean => /-quiz$/.test(p) || p.startsWith('/q/') || p === '/quizzes' || p === '/blindtest';
    const untouched = TOP_CLICKS_FROZEN.filter((p) => !wired(p));
    expect(untouched).toEqual(['/', '/articles/guess-the-kpop-idol-guide', '/cortis-trivia']);
  });
});
