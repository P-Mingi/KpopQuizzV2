import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  quizCard, sampleBlindtest, sampleCrossover, sampleDaily, sampleDoors, sampleDyk, sampleHot, sampleRotation, sampleSixty,
  sampleStartEasy, sampleSurprise, sampleTopFans,
} from './home-samples.test-support';

// Lot H2c: each loader of the home maps its module of lib/site/hub/data/ (lot H2b) to the shape of the page: the normal path, the missing
// block (null), the error (a loader never throws), and the links (a path; the page adds the origin of the site from the registry).

const mod = vi.hoisted(() => ({ values: {} as Record<string, unknown>, calls: [] as Array<[string, unknown]> }));
vi.mock('./data', async () => {
  const s = await import('./home-samples.test-support');
  const samples: Record<string, () => unknown> = {
    getDoors: s.sampleDoors, getDailyQuizzes: s.sampleDaily, getBlindtest: s.sampleBlindtest, getDebate: s.sampleDebate, getRotation: s.sampleRotation,
    getSixtySeconds: s.sampleSixty, getDidYouKnow: s.sampleDyk, getHot: s.sampleHot, getStartEasy: s.sampleStartEasy, getForYou: s.sampleForYou,
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
import { loadHomeForYou } from './home-foryou';
import { loadHomeHot } from './home-hot';
import { loadHomeQuick } from './home-quick';
import { loadHomeSurprise } from './home-surprise';
import { loadHomeToday } from './home-today';
import { loadHomeTopFans } from './home-topfans';
import { firstSentence, pathOf, plainTime, splitMeta } from './home-map';

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
  it('takes the folder of the site off (OtakuQuiz at fandomverse.org/anime), so homeUrl never doubles it', () => {
    expect(pathOf('https://fandomverse.org/anime/q/a-quiz?daily=quiz', 'anime')).toBe('/q/a-quiz?daily=quiz');
    expect(pathOf('https://fandomverse.org/anime', 'anime')).toBe('/');
    expect(pathOf('https://fandomverse.org/animex/q/a', 'anime')).toBe('/animex/q/a');
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

describe('the doors', () => {
  it('maps the real counts, the registry names and the featured quiz', async () => {
    const doors = await loadHomeDoors();
    expect(doors.map((d) => d.site)).toEqual(['kpop', 'anime']);
    expect(doors.map((d) => d.name)).toEqual(['KpopQuiz', 'OtakuQuiz']);
    expect(doors[0]).toMatchObject({
      chips: ['482 quizzes', 'Daily blindtest', 'Which member are you'], phoneLine: '482 quizzes',
      spotlight: { label: 'Top now', title: 'Ultimate BTS era quiz - only real ARMYs survive', path: '/q/ultimate-bts-era-quiz' },
    });
    expect(doors[1]).toMatchObject({ chips: ['138 quizzes', '31 series', 'New site'], phoneLine: '138 quizzes · 31 series', spotlight: { label: 'Just added' } });
  });
  it('drops the New site pill once OtakuQuiz has its week of data, and writes thousands with a comma', async () => {
    const d = sampleDoors();
    mod.values.getDoors = { kpop: { ...d.kpop, quizCount: 1204 }, anime: { ...d.anime, featuredLabel: 'Top now' } };
    const doors = await loadHomeDoors();
    expect(doors[0]!.chips[0]).toBe('1,204 quizzes');
    expect(doors[1]!.chips).toEqual(['138 quizzes', '31 series']);
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
      { site: 'kpop', title: 'ZEROBASEONE: From Boys Planet to In Bloom', meta: '10 questions · Easy', path: '/q/zerobaseone-from-boys-planet-to-in-bloom?daily=quiz' },
      { site: 'anime', title: "Journey's Beginning: Frieren Basics", meta: '10 questions · Easy', path: '/q/journeys-beginning-frieren-basics?daily=quiz' },
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

describe('For you and Start easy', () => {
  it('signed in: the cards of the module, the bridge flagged, no Continue; and Start easy for everyone', async () => {
    const out = await loadHomeForYou('user-1');
    expect(mod.calls).toContainEqual(['getForYou', { userId: 'user-1' }]);
    expect(out.signedIn).toEqual([
      { site: 'kpop', label: 'Next for a Stray Kids fan', title: 'Stray Kids albums and B-sides deep dive', meta: 'Medium · you scored 9/10 on the basics', path: '/q/stray-kids-albums-and-b-sides-deep-dive' },
      { site: 'anime', label: 'Stray Kids fans also play', title: 'First Steps into Jujutsu Kaisen', meta: 'Easy · same account, nothing to sign up for', path: '/q/first-steps-into-jujutsu-kaisen', bridge: true },
    ]);
    expect(out.signedOut.map((c) => [c.site, c.label, c.meta])).toEqual([['kpop', 'First K-pop quiz', 'Easy · 1.7k plays'], ['anime', 'First anime quiz', 'Easy · New']]);
  });
  it('signed out: the module For you is never asked for', async () => {
    const out = await loadHomeForYou(null);
    expect(mod.calls.map((c) => c[0])).not.toContain('getForYou');
    expect(out.signedIn).toEqual([]);
    expect(out.signedOut).toHaveLength(2);
  });
  it('has no card for a site with no easy quiz, and nothing at all when the modules are null or fail', async () => {
    mod.values.getStartEasy = { kpop: sampleStartEasy().kpop, anime: null };
    expect((await loadHomeForYou(null)).signedOut.map((c) => c.site)).toEqual(['kpop']);
    nul('getForYou', 'getStartEasy');
    expect(await loadHomeForYou('user-1')).toEqual({ signedIn: [], signedOut: [] });
    boom('getForYou');
    expect(await loadHomeForYou('user-1')).toEqual({ signedIn: [], signedOut: [] });
  });
  it('writes "Easy" alone for a quiz that is neither played enough nor new', async () => {
    const old = { ...quizCard('kpop', 'K', 'K-pop', 'An old one', 'Easy', '', 'an-old-one'), isNew: false };
    mod.values.getStartEasy = { kpop: old, anime: null };
    expect((await loadHomeForYou(null)).signedOut[0]!.meta).toBe('Easy');
  });
});

describe('Crossover', () => {
  it('maps the cards (title, meta and line, path on its own site) and the sourced fact', async () => {
    const c = await loadHomeCrossover();
    expect(c!.fact).toBe('IVE sang Will, the opening theme of Pokémon Horizons, released on April 12, 2024.');
    expect(c!.cards).toEqual([
      { site: 'kpop', title: 'KPop Demon Hunters Quiz', sub: 'Six questions · The animated film and its songs', path: '/kpop-demon-hunters-quiz' },
      { site: 'anime', title: 'One Opening, Many Endings: Chainsaw Man Theme Songs', sub: 'Medium · for music fans', path: '/q/one-opening-many-endings-chainsaw-man-theme-songs' },
      { site: 'kpop', title: 'K-pop Songs About Magic', sub: 'Easy · spells, wishes and fairy tales', path: '/q/kpop-songs-about-magic' },
    ]);
  });
  it('has no fact line without a sourced fact, and is null with no pick or on an error', async () => {
    mod.values.getCrossover = { ...sampleCrossover(), fact: null };
    expect((await loadHomeCrossover())!.fact).toBeNull();
    mod.values.getCrossover = { ...sampleCrossover(), quizzes: [] };
    expect(await loadHomeCrossover()).toBeNull();
    nul('getCrossover');
    expect(await loadHomeCrossover()).toBeNull();
    boom('getCrossover');
    expect(await loadHomeCrossover()).toBeNull();
  });
});

describe('Top fans', () => {
  it('maps the five fans with their sites, and the private level as null', async () => {
    mod.values.getTopFans = { ...sampleTopFans(), fans: sampleTopFans().fans.map((f, i) => (i === 3 ? { ...f, level: null } : f)) };
    const fans = await loadHomeTopFans();
    expect(fans).toHaveLength(5);
    expect(fans[0]).toEqual({ handle: 'sunbae_mira', level: 42, onKpop: true, onAnime: true });
    expect(fans[3]).toEqual({ handle: 'kenjiro_k', level: null, onKpop: false, onAnime: true });
  });
  it('is empty when nobody is public, and on an error', async () => {
    nul('getTopFans');
    expect(await loadHomeTopFans()).toEqual([]);
    boom('getTopFans');
    expect(await loadHomeTopFans()).toEqual([]);
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
