import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SAMPLE_COVER, sampleBlindtest, sampleCrossover, sampleDaily, sampleDoors, sampleDyk, sampleHot, sampleRotation, sampleSixty, sampleSurprise,
  sampleTopFans,
} from './home-samples.test-support';

// Lot H2c: each loader of the home maps its module of lib/site/hub/data/ (lot H2b) to the shape of the page: the normal path, the missing
// block (null), the error (a loader never throws), and the links (a path; the page adds the origin of the site from the registry).

const mod = vi.hoisted(() => ({ values: {} as Record<string, unknown>, calls: [] as Array<[string, unknown]> }));
vi.mock('./data', async () => {
  const s = await import('./home-samples.test-support');
  const samples: Record<string, () => unknown> = {
    getDoors: s.sampleDoors, getDailyQuizzes: s.sampleDaily, getBlindtest: s.sampleBlindtest, getDebate: s.sampleDebate, getRotation: s.sampleRotation,
    getSixtySeconds: s.sampleSixty, getDidYouKnow: s.sampleDyk, getHot: s.sampleHot,
    getCrossover: s.sampleCrossover, getTopFans: s.sampleTopFans, getSurprise: s.sampleSurprise,
  };
  const out: Record<string, unknown> = {};
  for (const [name, sample] of Object.entries(samples)) {
    out[name] = async (opts: unknown) => {
      mod.calls.push([name, opts]);
      const v = mod.values[name];
      if (v instanceof Error) throw v;
      return v === undefined ? sample() : v;
    };
  }
  return out;
});

import { loadHomeCrossover } from './home-crossover';
import { loadHomeDoors } from './home-doors';
import { loadHomeHot } from './home-hot';
import { loadHomeQuick } from './home-quick';
import { loadHomeSurprise } from './home-surprise';
import { loadHomeToday } from './home-today';
import { loadHomeTopFans } from './home-topfans';
import { firstSentence, httpsUrl, pathOf, plainTime, splitMeta } from './home-map';

beforeEach(() => {
  mod.values = {};
  mod.calls = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

const boom = (...names: string[]): void => { for (const n of names) mod.values[n] = new Error('db down'); };
const nul = (...names: string[]): void => { for (const n of names) mod.values[n] = null; };

describe('the small helpers', () => {
  it('takes the path and the query of a link, and leaves a path alone', () => {
    expect(pathOf('https://kpopquiz.org/q/a-quiz')).toBe('/q/a-quiz');
    expect(pathOf('https://kpopquiz.org/blindtest?daily=true')).toBe('/blindtest?daily=true');
    expect(pathOf('/trivia')).toBe('/trivia');
  });
  it('takes the folder of the site off (OtakuQuiz at bunnyverse.org/anime), so homeUrl never doubles it', () => {
    expect(pathOf('https://bunnyverse.org/anime/q/a-quiz?daily=quiz', 'anime')).toBe('/q/a-quiz?daily=quiz');
    expect(pathOf('https://bunnyverse.org/anime', 'anime')).toBe('/');
    expect(pathOf('https://bunnyverse.org/animex/q/a', 'anime')).toBe('/animex/q/a');
    expect(pathOf('http://anime.localhost:3001/trivia', 'anime')).toBe('/trivia');
    expect(pathOf('https://kpopquiz.org/q/a-quiz', 'kpop')).toBe('/q/a-quiz');
  });
  it('splits the meta line, writes the Paris time without a leading zero, cuts a story to its first sentence', () => {
    expect(splitMeta('Easy · True or false')).toEqual({ level: 'Easy', format: 'True or false' });
    expect(splitMeta('Hard')).toEqual({ level: 'Hard' });
    expect(plainTime('02:05')).toBe('2:05');
    expect(plainTime('01:05')).toBe('1:05');
    expect(firstSentence('One. Two. Three.')).toBe('One.');
    expect(firstSentence('No full stop here')).toBe('No full stop here');
    expect(firstSentence('')).toBe('');
  });
});

describe('the link of a source', () => {
  it('keeps an absolute https URL only, normalized', () => {
    expect(httpsUrl('https://en.wikipedia.org/wiki/IVE')).toBe('https://en.wikipedia.org/wiki/IVE');
    expect(httpsUrl('  HTTPS://En.Wikipedia.org/wiki/IVE ')).toBe('https://en.wikipedia.org/wiki/IVE');
    for (const bad of [null, undefined, '', 'http://en.wikipedia.org/', '//en.wikipedia.org/wiki/IVE', '/wiki/IVE', 'javascript:alert(1)', 'data:text/html,x', 'https://', 'https:///x', 'wikipedia']) {
      expect(httpsUrl(bad), String(bad)).toBeNull();
    }
  });
});

describe('the doors', () => {
  it('maps the real counts, the registry names and the featured quiz', async () => {
    const doors = await loadHomeDoors();
    expect(doors.map((d) => d.site)).toEqual(['kpop', 'anime']);
    expect(doors.map((d) => d.name)).toEqual(['KpopQuiz', 'OtakuQuiz']);
    // Home v3: the count of quizzes, rounded down by the shared helper of the public counts (atLeast), so it never says more than the site.
    expect(doors[0]).toMatchObject({
      count: '480+ quizzes', tagline: 'Groups, eras, members, songs',
      spotlight: { label: 'Top now', title: 'Ultimate BTS era quiz - only real ARMYs survive', path: '/q/ultimate-bts-era-quiz' },
    });
    expect(doors[1]).toMatchObject({ count: '130+ quizzes', tagline: 'Series, arcs, characters, openings', spotlight: { label: 'Just added' } });
  });
  it('rounds every count with atLeast: exact under 100, then to the ten, the hundred, the thousand, with a comma', async () => {
    const d = sampleDoors();
    mod.values.getDoors = { kpop: { ...d.kpop, quizCount: 1204 }, anime: { ...d.anime, quizCount: 47, featuredLabel: 'Top now' } };
    const doors = await loadHomeDoors();
    expect(doors[0]!.count).toBe('1,200+ quizzes');
    expect(doors[1]!.count).toBe('47 quizzes');
    expect(doors[1]!.spotlight).toMatchObject({ label: 'Top now' });
  });
  it('has no featured box without a quiz, and no door when the module has nothing', async () => {
    const d = sampleDoors();
    mod.values.getDoors = { ...d, kpop: { ...d.kpop, featured: null } };
    expect((await loadHomeDoors())[0]!.spotlight).toBeNull();
    nul('getDoors');
    expect(await loadHomeDoors()).toEqual([]);
    boom('getDoors');
    expect(await loadHomeDoors()).toEqual([]);
  });
});

describe('Today', () => {
  it('maps the quizzes of the day (the daily run link), the blind test with its preview, the debate and the rotation', async () => {
    const today = await loadHomeToday();
    expect(today!.quizzes).toEqual([
      {
        site: 'kpop', id: 'kpop:zerobaseone-from-boys-planet-to-in-bloom', title: 'ZEROBASEONE: From Boys Planet to In Bloom', questions: 10, meta: '10 questions · Easy',
        path: '/q/zerobaseone-from-boys-planet-to-in-bloom?daily=quiz',
      },
      {
        site: 'anime', id: 'anime:journeys-beginning-frieren-basics', title: "Journey's Beginning: Frieren Basics", questions: 10, meta: '10 questions · Easy',
        path: '/q/journeys-beginning-frieren-basics?daily=quiz',
      },
    ]);
    expect(today!.blindtest).toEqual({ site: 'kpop', path: '/blindtest?daily=true', songs: 10, seconds: 10, previewUrl: sampleBlindtest().previewUrl });
    expect(today!.debate).toEqual({ site: 'kpop', title: 'Best title track of 2025 so far?', path: '/community' });
    expect(today!.rotation).toEqual({ nextAt: '2026-10-26T00:05:00.000Z', parisTime: '1:05' });
  });
  it('writes the Paris time of the summer rotation as 2:05', async () => {
    mod.values.getRotation = { ...sampleRotation(), parisTime: '02:05', parisZone: 'CEST' };
    expect((await loadHomeToday())!.rotation.parisTime).toBe('2:05');
  });
  it('leaves out a part with no data, and is null with none', async () => {
    nul('getBlindtest', 'getDebate');
    nul('getDailyQuizzes');
    expect(await loadHomeToday()).toBeNull();
    mod.values = {};
    mod.values.getDailyQuizzes = { kpop: sampleDaily().kpop, anime: null };
    nul('getBlindtest');
    const t = await loadHomeToday();
    expect(t!.quizzes.map((q) => q.site)).toEqual(['kpop']);
    expect(t!.blindtest).toBeNull();
    expect(t!.debate).not.toBeNull();
  });
  it('is null on an error', async () => {
    boom('getDailyQuizzes');
    expect(await loadHomeToday()).toBeNull();
  });
});

describe('60 seconds', () => {
  it('maps the question (path of the quiz, short story = first sentence) and the two facts (trivia page of each site)', async () => {
    const quick = await loadHomeQuick();
    expect(quick!.question).toMatchObject({
      site: 'kpop', source: 'K-pop Songs About Magic', path: '/q/kpop-songs-about-magic', correct: 2,
      explainShort: 'ITZY said they borrowed the Cheshire Cat from Alice in Wonderland to express an ambiguous feeling.',
    });
    expect(quick!.question!.options).toHaveLength(4);
    expect(quick!.facts.map((f) => [f.site, f.source, f.path])).toEqual([['kpop', 'Wikipedia', '/trivia'], ['anime', 'Wikipedia', '/trivia']]);
  });
  it('carries the subject of each fact (its group or series) and the https link of its source (home v3 review)', async () => {
    const quick = await loadHomeQuick();
    expect(quick!.facts.map((f) => [f.subject, f.sourceUrl])).toEqual([
      ['ZEROBASEONE', 'https://en.wikipedia.org/wiki/In_Bloom'],
      ["Frieren: Beyond Journey's End", 'https://en.wikipedia.org/wiki/Frieren'],
    ]);
  });
  it('leaves out a fact with no subject, or with no https source link (SEO rule 5.5), and keeps the other one', async () => {
    const d = sampleDyk();
    for (const bad of [
      { subject: null }, { subject: '  ' }, { subject: undefined },
      { sourceUrl: null }, { sourceUrl: 'http://en.wikipedia.org/wiki/In_Bloom' }, { sourceUrl: '//en.wikipedia.org/wiki/In_Bloom' },
      { sourceUrl: '/wiki/In_Bloom' }, { sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://' }, { sourceUrl: 'not a url' },
    ]) {
      mod.values.getDidYouKnow = { ...d, kpop: { ...d.kpop!, ...bad } };
      expect((await loadHomeQuick())!.facts.map((f) => f.site), JSON.stringify(bad)).toEqual(['anime']);
    }
    // a fact cached before the subject joined the shape has none: left out for that hour
    const { subject: _s, ...old } = d.anime!;
    mod.values.getDidYouKnow = { ...d, kpop: null, anime: old };
    expect((await loadHomeQuick())!.facts).toEqual([]);
  });
  it('normalizes the source link with the URL parser, so a quote or an angle bracket never reaches the markup raw', async () => {
    const d = sampleDyk();
    mod.values.getDidYouKnow = { ...d, kpop: { ...d.kpop!, sourceUrl: ' https://en.wikipedia.org/wiki/A"b<c> ' } };
    const url = (await loadHomeQuick())!.facts[0]!.sourceUrl;
    expect(url).toBe('https://en.wikipedia.org/wiki/A%22b%3Cc%3E');
  });
  it('has an empty story for a question with no anecdote', async () => {
    mod.values.getSixtySeconds = { ...sampleSixty(), explanation: null };
    expect((await loadHomeQuick())!.question).toMatchObject({ explain: '', explainShort: '' });
  });
  it('keeps one of the two when the other is missing, null with neither or on an error', async () => {
    nul('getSixtySeconds');
    expect((await loadHomeQuick())!.question).toBeNull();
    mod.values = {};
    mod.values.getDidYouKnow = { ...sampleDyk(), kpop: null };
    expect((await loadHomeQuick())!.facts.map((f) => f.site)).toEqual(['anime']);
    nul('getSixtySeconds', 'getDidYouKnow');
    expect(await loadHomeQuick()).toBeNull();
    boom('getSixtySeconds');
    mod.values.getDidYouKnow = null;
    expect(await loadHomeQuick()).toBeNull();
  });
});

describe('Hot right now', () => {
  it('maps the three lists in rank order with the level, the format and the canonical path of each quiz', async () => {
    const hot = await loadHomeHot();
    expect(hot!.all.map((q) => q.site)).toEqual(['kpop', 'anime', 'kpop', 'anime', 'kpop', 'anime']);
    expect(hot!.kpop).toHaveLength(6);
    expect(hot!.anime).toHaveLength(6);
    expect(hot!.kpop[1]).toMatchObject({ tile: 'SK', group: 'Stray Kids', level: 'Easy', format: 'True or false', plays: '2.1k plays', isNew: false, path: '/q/skz-true-or-false' });
    expect(hot!.anime[1]).toMatchObject({ level: 'Easy', plays: '', isNew: true });
    expect(hot!.anime[1]).not.toHaveProperty('format');
    expect(hot!.allPaths).toEqual({ kpop: '/quizzes', anime: '/quizzes' });
    for (const q of hot!.all) expect(q.path).toMatch(/^\/q\/[a-z0-9-]+$/);
    // home v3: the quiz's own cover (K-pop only, from the module), else null and the row shows the initials
    expect(hot!.kpop[0]!.cover).toBe(SAMPLE_COVER);
    expect(hot!.anime.every((q) => q.cover === null)).toBe(true);
  });
  it('maps Start easy (home v3): the easy quizzes of both sites, alternating; none for a ranking cached before it existed', async () => {
    const hot = await loadHomeHot();
    expect(hot!.easy.map((q) => [q.site, q.level])).toEqual([['kpop', 'Easy'], ['anime', 'Easy'], ['kpop', 'Easy'], ['anime', 'Easy'], ['kpop', 'Easy']]);
    const { easy: _easy, ...old } = sampleHot();
    mod.values.getHot = old;
    expect((await loadHomeHot())!.easy).toEqual([]);
    // a card cached before the cover existed reads as no cover
    const noCover = sampleHot();
    mod.values.getHot = { ...noCover, kpop: noCover.kpop.map(({ cover: _c, ...c }) => c) };
    expect((await loadHomeHot())!.kpop[0]!.cover).toBeNull();
  });
  it('is null with no ranking, an empty one or an error', async () => {
    nul('getHot');
    expect(await loadHomeHot()).toBeNull();
    mod.values.getHot = { ...sampleHot(), all: [], kpop: [], anime: [] };
    expect(await loadHomeHot()).toBeNull();
    boom('getHot');
    expect(await loadHomeHot()).toBeNull();
  });
});

describe('Crossover', () => {
  it('maps the cards (title, meta and line, path on its own site) and the sourced fact', async () => {
    const c = await loadHomeCrossover();
    expect(c!.fact).toBe('IVE sang Will, the opening theme of Pokémon Horizons, released on April 12, 2024.');
    expect(c!.factSource).toBe('Wikipedia');
    expect(c!.factUrl).toBe('https://en.wikipedia.org/wiki/IVE');
    expect(c!.cards).toEqual([
      { site: 'kpop', title: 'KPop Demon Hunters Quiz', sub: 'Six questions · The animated film and its songs', path: '/kpop-demon-hunters-quiz' },
      { site: 'anime', title: 'One Opening, Many Endings: Chainsaw Man Theme Songs', sub: 'Medium · for music fans', path: '/q/one-opening-many-endings-chainsaw-man-theme-songs' },
      { site: 'kpop', title: 'K-pop Songs About Magic', sub: 'Easy · spells, wishes and fairy tales', path: '/q/kpop-songs-about-magic' },
    ]);
  });
  it('has no fact line without a sourced fact, and is null with no pick or on an error', async () => {
    mod.values.getCrossover = { ...sampleCrossover(), fact: null };
    expect((await loadHomeCrossover())!.fact).toBeNull();
    expect((await loadHomeCrossover())!.factSource).toBeNull();
    expect((await loadHomeCrossover())!.factUrl).toBeNull();
    // a fact whose source is not an https page is left out with its source (SEO rule 5.5); the tiles stay
    for (const sourceUrl of ['http://en.wikipedia.org/wiki/IVE', '//en.wikipedia.org/wiki/IVE', 'javascript:alert(1)', '']) {
      const x = sampleCrossover();
      mod.values.getCrossover = { ...x, fact: { ...x.fact!, sourceUrl } };
      const c = await loadHomeCrossover();
      expect(c, sourceUrl).toMatchObject({ fact: null, factSource: null, factUrl: null });
      expect(c!.cards).toHaveLength(3);
    }
    mod.values.getCrossover = { ...sampleCrossover(), quizzes: [] };
    expect(await loadHomeCrossover()).toBeNull();
    nul('getCrossover');
    expect(await loadHomeCrossover()).toBeNull();
    boom('getCrossover');
    expect(await loadHomeCrossover()).toBeNull();
  });
});

describe('Top fans', () => {
  it('maps one board per site (home v3), each fan with the level of that site, and the private level as null', async () => {
    const top = sampleTopFans();
    mod.values.getTopFans = { ...top, bySite: { ...top.bySite!, anime: top.bySite!.anime.map((f, i) => (i === 1 ? { ...f, level: null } : f)) } };
    const fans = await loadHomeTopFans();
    expect(fans.kpop).toHaveLength(5);
    expect(fans.anime).toHaveLength(5);
    expect(fans.kpop[0]).toEqual({ handle: 'sunbae_mira', level: 42 });
    expect(fans.anime[0]).toEqual({ handle: 'kenjiro_k', level: 33 });
    expect(fans.anime[1]).toEqual({ handle: 'shoujo_nova', level: null });
    expect(fans.anime[4]).toEqual({ handle: 'mingi', level: 12 });
  });
  it('is empty when nobody is public, on an error, and for a board cached before the boards per site existed', async () => {
    nul('getTopFans');
    expect(await loadHomeTopFans()).toEqual({ kpop: [], anime: [] });
    boom('getTopFans');
    expect(await loadHomeTopFans()).toEqual({ kpop: [], anime: [] });
    const { bySite: _b, ...old } = sampleTopFans();
    mod.values.getTopFans = old;
    expect(await loadHomeTopFans()).toEqual({ kpop: [], anime: [] });
  });
});

describe('Surprise me', () => {
  it('maps the pool to paths and keeps the played ids of the fan', async () => {
    mod.values.getSurprise = { ...sampleSurprise(), playedIds: ['kpop:kpop-company-quiz'] };
    const s = await loadHomeSurprise('user-1');
    expect(mod.calls).toContainEqual(['getSurprise', { userId: 'user-1' }]);
    expect(s.pool).toHaveLength(12);
    expect(s.pool[0]).toEqual({ id: 'kpop:ultimate-bts-era-quiz', site: 'kpop', tile: 'BTS', title: 'Ultimate BTS era quiz - only real ARMYs survive', path: '/q/ultimate-bts-era-quiz' });
    expect(s.playedIds).toEqual(['kpop:kpop-company-quiz']);
  });
  it('is an empty pool when the module has none, or fails', async () => {
    nul('getSurprise');
    expect(await loadHomeSurprise(null)).toEqual({ pool: [], playedIds: [] });
    boom('getSurprise');
    expect(await loadHomeSurprise(null)).toEqual({ pool: [], playedIds: [] });
  });
});
