// P5, CR-025: the links between the sites and the daily games (Plan.dc.html). For each link: switch off, absent and nothing read; switch on, present, the right address; closed on every failure; the link rule
// (link-allowlist.json, the judge of check-network-links) passes on its page and only there. The hub's result (link 3, EN and FR) is blindtest-link.test.ts.
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DleDay, DlePool, DlePoolEntity } from '@/lib/dle/types';

const rpc = vi.fn();
const hubOn = { dailyGuess: true };

vi.mock('next/link', () => ({ default: (p: Record<string, unknown>) => h('a', { href: p.href as string, className: p.className as string }, p.children as React.ReactNode) }));
vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({ rpc }) }));
vi.mock('@/lib/photos/public-read', () => ({ assetPosition: () => '', getLiveAssets: async () => [], getPublicPictures: async () => [], safePath: (p: unknown) => p }));
vi.mock('@/lib/entity-images/store', () => ({ publicUrl: (p: string) => `https://cdn.test/${p}` }));
vi.mock('@/lib/site/registry', async (original) => {
  const real = await original<typeof import('@/lib/site/registry')>();
  const hub = {
    ...real.REGISTRY.hub,
    get features() { return { ...real.REGISTRY.hub.features, dailyGuess: hubOn.dailyGuess }; },
    get routes() { return { allow: real.hubRouteAllow({ dailyGuess: hubOn.dailyGuess }) }; },
  };
  return { ...real, REGISTRY: { ...real.REGISTRY, hub }, get SITE_ID() { return process.env.NEXT_PUBLIC_SITE_ID || 'kpop'; } };
});

type Site = 'kpop' | 'anime' | 'hub';

function day(game: string, no: number, wins: number | null = 1206): DleDay {
  return {
    game, now: '2026-11-20T10:00:00Z', date: '2026-11-20', game_no: no, seconds_left: 50_400,
    yesterday: { date: '2026-11-19', game_no: no - 1, answer: { id: 'yesterday-id', name: 'YesterdayAnswerName', attrs: {}, thumb: 'x/yesterday.webp' } },
    stats: wins === null ? null : { plays: 1500, wins, give_ups: 20, guess_hist: [1, 2, 3] },
    play: { date: '2026-11-20', game_no: no, status: 'won', guesses: [], hints: [{ key: 'fandom', value: 'SecretHint' }], target: { id: 'today-id', name: 'TodayAnswerName', attrs: {}, thumb: null }, stats: null },
  };
}

const NUMBERS: Record<string, number> = { 'kpopdle-idol': 214, otakudle: 12, 'otakudle-one-piece': 2, 'otakudle-dragon-ball': 3 };

async function setup(opts: { site?: Site; hub?: boolean; flags?: Record<string, string> } = {}): Promise<void> {
  vi.resetModules();
  vi.unstubAllEnvs();
  hubOn.dailyGuess = opts.hub ?? true;
  if (opts.site && opts.site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', opts.site);
  for (const [k, v] of Object.entries(opts.flags ?? {})) vi.stubEnv(k, v);
}

const text = (s: string): string => s.replace(/<!-- -->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const links = (s: string): string[] => [...s.matchAll(/<a\b[^>]*?\bhref="([^"]+)"[^>]*>/g)].map((m) => m[1]!);
const repo = (rel: string): string => readFileSync(new URL(`../../../../../${rel}`, import.meta.url), 'utf8');
const app = (rel: string): string => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

beforeEach(() => {
  rpc.mockReset();
  rpc.mockImplementation(async (_fn: string, args: { p_game: string }) => ({ data: day(args.p_game, NUMBERS[args.p_game] ?? 1), error: null }));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.restoreAllMocks(); });

// ---- the link rule: the judge of check-network-links, on the allowlist as committed

async function judge(site: 'kpop' | 'anime', page: string, html: string): Promise<string[]> {
  const { analyzeHtml, checkLinks } = await import('../../../scripts/o1/leak-lib.mjs');
  const allowlist = JSON.parse(repo('docs/o1/contracts/link-allowlist.json')) as object;
  const base = site === 'kpop' ? 'https://kpopquiz.org' : 'https://bunnyverse.org/anime';
  return checkLinks({ site, path: page, pageUrl: `${base}${page === '/' ? '' : page}`, an: analyzeHtml(html), allowlist }).violations.map((v: { code: string }) => v.code);
}

// ---- routing: every address the links point at is in the hub's route map, with the switch on, and in none with it off

describe('routing: the pages the links lead to (lib/passerelles/open.ts)', () => {
  const PAGES = ['/kpopdle', '/otakudle', '/otakudle/one-piece', '/otakudle/dragon-ball', '/daily'];
  it('switch on: the hub knows each page and its French twin, and each game is open', async () => {
    await setup();
    const { isKnownRouteFor } = await import('@/lib/site/routing');
    const { hubGameOpen, hubBurrowOpen } = await import('./open');
    for (const p of PAGES) {
      expect(isKnownRouteFor('hub', p, { v1: true, v12: true }), p).toBe(true);
      expect(isKnownRouteFor('hub', `/fr${p}`, { v1: true, v12: true }), `/fr${p}`).toBe(true);
    }
    for (const id of ['kpopdle-idol', 'otakudle', 'otakudle-one-piece', 'otakudle-dragon-ball'] as const) expect(hubGameOpen(id), id).toBe(true);
    expect(hubBurrowOpen()).toBe(true);
  });
  it('switch off: the hub knows none of them, no game is open, and no link is drawn', async () => {
    await setup({ hub: false });
    const { isKnownRouteFor } = await import('@/lib/site/routing');
    const { hubGameOpen, hubBurrowOpen } = await import('./open');
    for (const p of PAGES) expect(isKnownRouteFor('hub', p, { v1: true, v12: true }), p).toBe(false);
    for (const id of ['kpopdle-idol', 'otakudle', 'otakudle-one-piece', 'otakudle-dragon-ball'] as const) expect(hubGameOpen(id), id).toBe(false);
    expect(hubBurrowOpen()).toBe(false);
  });
  it('a game with no page is never linked: the group and the song of Kpopdle are not built', async () => {
    await setup();
    const { hubGameOpen } = await import('./open');
    expect(hubGameOpen('kpopdle-group')).toBe(false);
    expect(hubGameOpen('kpopdle-song')).toBe(false);
  });
});

// ---- links 2 and 13: the end of a quiz

describe('links 2 and 13: the end of a quiz (lib/passerelles/quiz-end.ts)', () => {
  const bridge = async (): Promise<unknown> => (await import('./quiz-end')).quizEndBridge();

  for (const value of [undefined, '', '0', 'false', 'yes']) {
    it(`kpopquiz.org, NET_KPOPDLE_QUIZEND=${String(value)}: no row`, async () => {
      await setup({ flags: value === undefined ? {} : { NET_KPOPDLE_QUIZEND: value } });
      expect(await bridge()).toBeNull();
    });
  }
  it('kpopquiz.org, flag on: a row to the game, an absolute address on the hub, no query', async () => {
    await setup({ flags: { NET_KPOPDLE_QUIZEND: '1' } });
    expect(await bridge()).toEqual({ kind: 'kpopdle', href: 'https://bunnyverse.org/kpopdle' });
    await setup({ flags: { NET_KPOPDLE_QUIZEND: 'true' } });
    expect(await bridge()).toEqual({ kind: 'kpopdle', href: 'https://bunnyverse.org/kpopdle' });
  });
  it('kpopquiz.org, flag on but the hub switch off: no row (no link to a page answering 404)', async () => {
    await setup({ hub: false, flags: { NET_KPOPDLE_QUIZEND: '1' } });
    expect(await bridge()).toBeNull();
  });
  it('the other flags of the kpopquiz.org links do not draw this row', async () => {
    await setup({ flags: { NET_KPOPDLE_HOME: '1', NET_KPOPDLE_GROUP: '1' } });
    expect(await bridge()).toBeNull();
  });
  it('OtakuQuiz: the daily challenge, to /otakudle, with the hub switch alone; off with it', async () => {
    await setup({ site: 'anime' });
    expect(await bridge()).toEqual({ kind: 'otakudle', href: 'https://bunnyverse.org/otakudle' });
    await setup({ site: 'anime', hub: false });
    expect(await bridge()).toBeNull();
  });
  it('OtakuQuiz never draws the K-pop row, kpopquiz.org never draws the anime one, the hub neither', async () => {
    await setup({ site: 'anime', flags: { NET_KPOPDLE_QUIZEND: '1' } });
    expect(await bridge()).toMatchObject({ kind: 'otakudle' });
    await setup({ site: 'hub', flags: { NET_KPOPDLE_QUIZEND: '1' } });
    expect(await bridge()).toBeNull();
  });

  const render = async (b: { kind: 'kpopdle' | 'otakudle'; href: string }): Promise<string> => {
    const { QuizEndBridge } = await import('@/components/quiz/ux-v1/quiz-end-bridge');
    return renderToString(h(QuizEndBridge, { bridge: b }));
  };
  it('the Kpopdle row: a real link with the bunnyverse.org pill, no dash', async () => {
    await setup({ flags: { NET_KPOPDLE_QUIZEND: '1' } });
    const out = await render({ kind: 'kpopdle', href: 'https://bunnyverse.org/kpopdle' });
    expect(links(out)).toEqual(['https://bunnyverse.org/kpopdle']);
    expect(text(out)).toContain('Kpopdle bunnyverse.org');
    expect(text(out)).toContain("Guess today's K-pop idol");
    expect(out).not.toMatch(/[\u2013\u2014]/);
    expect(out).not.toMatch(/anime|otaku/i);
    expect(await judge('kpop', '/q/some-quiz', out)).toEqual([]);
    // OtakuQuiz has no row for the Kpopdle: the same markup there is a violation.
    expect(await judge('anime', '/q/some-quiz', out)).toEqual(['link-not-allowed']);
  });
  it('the anime card: the daily challenge, to /otakudle, passes on a quiz page only', async () => {
    await setup({ site: 'anime' });
    const out = await render({ kind: 'otakudle', href: 'https://bunnyverse.org/otakudle' });
    expect(links(out)).toEqual(['https://bunnyverse.org/otakudle']);
    expect(text(out)).toContain('Daily challenge: the mystery character');
    expect(text(out)).toContain('Try');
    expect(out).not.toMatch(/[\u2013\u2014]/);
    expect(out).not.toMatch(/kpop/i);
    expect(await judge('anime', '/q/some-quiz', out)).toEqual([]);
    expect(await judge('anime', '/series', out)).toEqual(['link-not-allowed']);
  });

  const src = (f: string): string => app(f);
  it('flag off, the props of the run are today\'s: the key is left out, not set to undefined', () => {
    const page = src('app/(site)/q/[slug]/ux-page.tsx');
    expect(page).toContain('...(bridge ? { bridge } : {}),');
    expect(src('components/quiz/ux-v1/results.tsx')).toContain('{quiz.bridge ? <div className="ux-rows"><QuizEndBridge bridge={quiz.bridge} /></div> : null}');
    expect(src('components/quiz/ux-v1/run-context.tsx')).toMatch(/bridge\?: \{ kind: 'kpopdle' \| 'otakudle'; href: string \};/);
  });
  it('the row sits under Next quiz, before the other rows', () => {
    const r = src('components/quiz/ux-v1/results.tsx');
    expect(r.indexOf('Next quiz')).toBeLessThan(r.indexOf('<QuizEndBridge'));
    expect(r.indexOf('<QuizEndBridge')).toBeLessThan(r.indexOf('{rest.map('));
  });
});

// ---- link 3, kpopquiz.org side: the card of a group page

const idol = (id: string, name: string, group: string, parent?: string): DlePoolEntity => ({
  id, name, thumb: null, search: [name], attrs: { group: { v: [group], ...(parent ? { p: [parent] } : {}) } },
});
const POOL: DlePool = {
  game: 'kpopdle-idol', universe: 'kpop', attributes: [],
  entities: [
    ...['Nayeon', 'Jeongyeon', 'Momo', 'Sana', 'Jihyo', 'Mina', 'Dahyun', 'Chaeyoung', 'Tzuyu'].map((n, i) => idol(`t${i}`, n, 'TWICE')),
    idol('b1', 'Jungkook', 'BTS'), idol('b2', 'V', 'BTS'),
    idol('u1', 'Haechan', 'NCT Dream', 'NCT'),
    idol('s1', 'Solo One', 'Solo Group'),
  ],
};

describe('link 3, kpopquiz.org side: the Kpopdle card of a group page (lib/passerelles/group-line.ts)', () => {
  const pool = (data: unknown, error: unknown = null): void => {
    rpc.mockImplementation(async (fn: string) => (fn === 'dle_pool' ? { data, error } : { data: null, error: { message: 'unexpected' } }));
  };
  const load = async (name: string, roster: number | null): Promise<string | null> => {
    const el = await (await import('./group-line')).loadKpopdleGroup({ name }, roster);
    return el ? renderToString(el) : null;
  };

  for (const value of [undefined, '', '0', 'false', 'yes']) {
    it(`NET_KPOPDLE_GROUP=${String(value)}: nothing rendered, no read`, async () => {
      await setup({ flags: value === undefined ? {} : { NET_KPOPDLE_GROUP: value } });
      pool(POOL);
      expect(await load('TWICE', 9)).toBeNull();
      expect(rpc).not.toHaveBeenCalled();
    });
  }
  it('never loads the card file with the flag off: a throwing module changes nothing', async () => {
    await setup();
    const loaded = vi.fn();
    vi.doMock('@/components/group/ux-v1/kpopdle-group', () => { loaded(); throw new Error('loaded'); });
    expect(await load('TWICE', 9)).toBeNull();
    expect(loaded).not.toHaveBeenCalled();
    vi.doUnmock('@/components/group/ux-v1/kpopdle-group');
  });
  it('the anime and hub builds never draw it, flag on', async () => {
    for (const site of ['anime', 'hub'] as const) {
      await setup({ site, flags: { NET_KPOPDLE_GROUP: '1' } });
      pool(POOL);
      expect(await load('TWICE', 9)).toBeNull();
    }
    expect(rpc).not.toHaveBeenCalled();
  });
  it('flag on: "The 9 members of TWICE are in the Kpopdle", the count from the pool, one real link to the game', async () => {
    await setup({ flags: { NET_KPOPDLE_GROUP: '1' } });
    pool(POOL);
    const out = (await load('TWICE', 9))!;
    expect(out).not.toBeNull();
    expect(text(out)).toContain('The 9 members of TWICE are in the Kpopdle');
    expect(text(out)).toContain('Do you really know TWICE?');
    expect(links(out)).toEqual(['https://bunnyverse.org/kpopdle']);
    expect(out).toMatch(/<h2 id="p5-kg-h">/);
    expect(out).not.toMatch(/<h1/);
    expect(out).not.toMatch(/[\u2013\u2014]/);
    expect(out).not.toMatch(/anime|otaku/i);
    expect(rpc).toHaveBeenCalledWith('dle_pool', { p_game: 'kpopdle-idol' });
    expect(await judge('kpop', '/twice-quiz', out)).toEqual([]);
    // a group hub and nothing wider: not the groups list, a trivia page, the same markup on OtakuQuiz
    for (const page of ['/groups', '/trivia', '/twice-trivia', '/blindtest']) expect(await judge('kpop', page, out), page).toEqual(['link-not-allowed']);
    expect(await judge('anime', '/twice-quiz', out)).toEqual(['link-not-allowed']);
  });
  it('the line never claims more than the pool holds', async () => {
    const { kpopdleGroupLine, kpopdleGroupCount } = await import('@/components/group/ux-v1/kpopdle-group');
    expect(kpopdleGroupLine('TWICE', 9, 9)).toBe('The 9 members of TWICE are in the Kpopdle');
    expect(kpopdleGroupLine('TWICE', 7, 9)).toBe('7 members of TWICE are in the Kpopdle');
    expect(kpopdleGroupLine('TWICE', 9, null)).toBe('9 members of TWICE are in the Kpopdle');
    expect(kpopdleGroupLine('Solo Group', 1, 1)).toBe('1 member of Solo Group is in the Kpopdle');
    expect(kpopdleGroupCount(POOL, 'TWICE')).toBe(9);
    expect(kpopdleGroupCount(POOL, 'BTS')).toBe(2);
    // a sub-unit idol counts for the parent group, as the pool table of the game page does
    expect(kpopdleGroupCount(POOL, 'NCT')).toBe(1);
    expect(kpopdleGroupCount(POOL, 'Nobody')).toBe(0);
    expect(kpopdleGroupCount(null, 'TWICE')).toBe(0);
  });
  it('a group with no member in the pool: no card (min-gate)', async () => {
    await setup({ flags: { NET_KPOPDLE_GROUP: '1' } });
    pool(POOL);
    expect(await load('aespa', 4)).toBeNull();
  });
  it('fail closed: the hub switch off (no read), dle_unavailable, no table, the read throws, an empty pool', async () => {
    await setup({ hub: false, flags: { NET_KPOPDLE_GROUP: '1' } });
    pool(POOL);
    expect(await load('TWICE', 9)).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
    await setup({ flags: { NET_KPOPDLE_GROUP: '1' } });
    pool(null, { message: 'dle_unavailable' });
    expect(await load('TWICE', 9)).toBeNull();
    pool(null, { code: 'PGRST202', message: 'Could not find the function public.dle_pool' });
    expect(await load('TWICE', 9)).toBeNull();
    rpc.mockRejectedValue(new Error('network'));
    expect(await load('TWICE', 9)).toBeNull();
    pool({ ...POOL, entities: [] });
    expect(await load('TWICE', 9)).toBeNull();
  });
  it('no spoiler: the pool names of other groups and the answers never reach the card', async () => {
    await setup({ flags: { NET_KPOPDLE_GROUP: '1' } });
    pool(POOL);
    const out = (await load('TWICE', 9))!;
    for (const s of ['Jungkook', 'Haechan', 'Nayeon', 'Tzuyu', 'Momo']) expect(out).not.toContain(s);
  });
  it('flag off, the group page keeps its two children: the card takes a branch of its own', () => {
    const hub = app('components/group/ux-v1/hub.tsx');
    expect(hub).toContain('const kpopdleCard = slots || category ? null : await loadKpopdleGroup(g, memberCount);');
    expect(hub).toMatch(/\) : kpopdleCard \? \(\s*\/\/[^\n]*\n\s*<div className="p3-low-main">\s*\{aboutSection\}\s*\{kpopdleCard\}\s*\{faqSection\}\s*<\/div>\s*\) : \(\s*<div className="p3-low-main">\s*\{aboutSection\}\s*\{faqSection\}\s*<\/div>\s*\)\}/);
    const gate = app('lib/passerelles/group-line.ts');
    expect(gate.match(/^import .*$/gm)).toEqual(["import { flagOn, SITE_ID } from '@/lib/site/registry';"]);
    expect(gate).toMatch(/await import\('@\/components\/group\/ux-v1\/kpopdle-group'\)/);
    expect(app('components/group/ux-v1/kpopdle-group.tsx')).not.toMatch(/^['"]use client['"]/m);
  });
});

// ---- link 10: the Daily games module of the OtakuQuiz home

describe('link 10: the Daily games module of the OtakuQuiz home (lib/ux-v1/p1/anime-daily-home.ts)', () => {
  const load = async (): Promise<string | null> => {
    const el = await (await import('@/lib/ux-v1/p1/anime-daily-home')).loadAnimeDailyHome();
    return el ? renderToString(el) : null;
  };

  it('the hub switch off (the default): nothing rendered, nothing read, whatever the site', async () => {
    for (const site of ['anime', 'kpop', 'hub'] as const) {
      await setup({ site, hub: false });
      expect(await load()).toBeNull();
    }
    expect(rpc).not.toHaveBeenCalled();
  });
  it('never loads the module file with the switch off', async () => {
    await setup({ site: 'anime', hub: false });
    const loaded = vi.fn();
    vi.doMock('@/components/home/ux-v1/anime-daily-home', () => { loaded(); throw new Error('loaded'); });
    expect(await load()).toBeNull();
    expect(loaded).not.toHaveBeenCalled();
    vi.doUnmock('@/components/home/ux-v1/anime-daily-home');
  });
  it('kpopquiz.org and the hub never draw it, even with the switch on', async () => {
    for (const site of ['kpop', 'hub'] as const) {
      await setup({ site });
      expect(await load()).toBeNull();
    }
    expect(rpc).not.toHaveBeenCalled();
  });
  it('on: Otakudle, One Piece, Dragon Ball, each with Play, three real links on the hub, no K-pop game, no Burrow', async () => {
    await setup({ site: 'anime' });
    const out = (await load())!;
    expect(links(out)).toEqual(['https://bunnyverse.org/otakudle', 'https://bunnyverse.org/otakudle/one-piece', 'https://bunnyverse.org/otakudle/dragon-ball']);
    const t = text(out);
    expect(t).toContain('Daily games');
    expect(t).toContain('Play Otakudle');
    expect(t).toContain('Play One Piece');
    expect(t).toContain('Play Dragon Ball');
    expect(t).toContain('Otakudle · no. 12');
    expect(t).toContain('Otakudle One Piece · no. 2');
    expect(t).toContain('Otakudle Dragon Ball · no. 3');
    expect(t).toContain('1,206 fans found it');
    expect(t).toContain('new character at 00:00 UTC');
    expect(out).toMatch(/<h2 id="p5-ad-h">/);
    expect(out).not.toMatch(/<h1/);
    expect(out).not.toMatch(/kpopdle|k-pop|idol|\/daily|kpopquiz/i);
    expect(out).not.toMatch(/[\u2013\u2014]/);
    expect(rpc.mock.calls.map((c) => (c[1] as { p_game: string }).p_game).sort()).toEqual(['otakudle', 'otakudle-dragon-ball', 'otakudle-one-piece']);
    for (const c of rpc.mock.calls) expect(c[1]).not.toHaveProperty('p_token');
    expect(await judge('anime', '/', out)).toEqual([]);
    expect(await judge('anime', '/series', out)).toEqual(['link-not-allowed', 'link-not-allowed', 'link-not-allowed']);
  });
  it('no spoiler, and under dle_day\'s floor no count of fans', async () => {
    await setup({ site: 'anime' });
    const out = (await load())!;
    for (const s of ['YesterdayAnswerName', 'yesterday-id', 'TodayAnswerName', 'SecretHint']) expect(out).not.toContain(s);
    rpc.mockImplementation(async (_f: string, a: { p_game: string }) => ({ data: day(a.p_game, 5, null), error: null }));
    const under = (await load())!;
    expect(under).not.toMatch(/fans? found/);
  });
  it('a game that fails hides its own card; none left, no module', async () => {
    await setup({ site: 'anime' });
    rpc.mockImplementation(async (_f: string, a: { p_game: string }) => (a.p_game === 'otakudle-one-piece' ? { data: null, error: { message: 'dle_unavailable' } } : { data: day(a.p_game, 4), error: null }));
    const out = (await load())!;
    expect(links(out)).toEqual(['https://bunnyverse.org/otakudle', 'https://bunnyverse.org/otakudle/dragon-ball']);
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.dle_day' } });
    expect(await load()).toBeNull();
    rpc.mockRejectedValue(new Error('network'));
    expect(await load()).toBeNull();
    rpc.mockResolvedValue({ data: { ...day('otakudle', 4), game: 'kpopdle-idol' }, error: null });
    expect(await load()).toBeNull();
  });
  it('the module file failing to load', async () => {
    await setup({ site: 'anime' });
    vi.doMock('@/components/home/ux-v1/anime-daily-home', () => { throw new Error('chunk'); });
    expect(await load()).toBeNull();
    vi.doUnmock('@/components/home/ux-v1/anime-daily-home');
  });
  it('flag off, the home keeps its tree: one place, the gate imported, the module behind the dynamic import', () => {
    const home = app('components/home/ux-v1/ux-home.tsx');
    expect(home).toContain('const kpopdle = (await loadKpopdleHome()) ?? (await loadAnimeDailyHome());');
    expect(home).toContain('{kpopdle ? <><ContinuePlaying />{kpopdle}</> : <ContinuePlaying />}');
    expect(home).toContain("from '@/lib/ux-v1/p1/anime-daily-home'");
    expect(home).not.toMatch(/from '[^']*(lib\/dle|components\/home\/ux-v1\/anime-daily-home|passerelles)/);
    const gate = app('lib/ux-v1/p1/anime-daily-home.ts');
    expect(gate.match(/^import .*$/gm)).toEqual(["import { REGISTRY, SITE_ID } from '@/lib/site/registry';"]);
    expect(gate).toMatch(/await import\('@\/components\/home\/ux-v1\/anime-daily-home'\)/);
    for (const f of [gate, app('components/home/ux-v1/anime-daily-home.tsx')]) {
      expect(f).not.toMatch(/^import\s+['"][^'"]+\.css['"]/m);
      expect(f).not.toMatch(/^['"]use client['"]/m);
    }
  });
  it('token gate: no raw colour in the module', () => {
    const card = app('components/home/ux-v1/anime-daily-home.tsx');
    expect(card).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(card).not.toMatch(/rgba?\(/);
  });
});

// ---- links 11 and 12: the card of a series page

describe('links 11 and 12: the daily game card on the One Piece and Dragon Ball series pages (lib/passerelles/series.ts)', () => {
  const gate = async (slug: string): Promise<string | null> => (await import('./series')).seriesDailyGame(slug);
  const card = async (game: string): Promise<string | null> => {
    const el = await (await import('@/components/anime/series-daily-card')).SeriesDailyCard({ game: game as never });
    return el ? renderToString(el) : null;
  };

  it('the hub switch off: no game for any series, on any site', async () => {
    for (const site of ['anime', 'kpop', 'hub'] as const) {
      await setup({ site, hub: false });
      expect(await gate('one-piece')).toBeNull();
      expect(await gate('dragon-ball')).toBeNull();
    }
  });
  it('on: One Piece and Dragon Ball have their game; a series with no game, none; kpopquiz.org and the hub never', async () => {
    await setup({ site: 'anime' });
    expect(await gate('one-piece')).toBe('otakudle-one-piece');
    expect(await gate('dragon-ball')).toBe('otakudle-dragon-ball');
    expect(await gate('naruto')).toBeNull();
    expect(await gate('one-piece-quiz')).toBeNull();
    for (const site of ['kpop', 'hub'] as const) {
      await setup({ site });
      expect(await gate('one-piece')).toBeNull();
    }
  });
  it('the card: "The One Piece character of the day", the number of the day, Play, a real link to the game', async () => {
    await setup({ site: 'anime' });
    const out = (await card('otakudle-one-piece'))!;
    expect(links(out)).toEqual(['https://bunnyverse.org/otakudle/one-piece']);
    const t = text(out);
    expect(t).toContain('Otakudle One Piece, no. 2');
    expect(t).toContain('The One Piece character of the day');
    expect(t).toContain('Affiliation · Devil Fruit · Haki · Bounty · Sea of origin');
    expect(t).toMatch(/\bPlay\b/);
    expect(out).toMatch(/<h2 id="p5-sd-h-otakudle-one-piece">/);
    expect(out).not.toMatch(/[\u2013\u2014]/);
    expect(out).not.toMatch(/kpop/i);
    for (const s of ['YesterdayAnswerName', 'TodayAnswerName', 'SecretHint']) expect(out).not.toContain(s);
    expect(await judge('anime', '/one-piece-quiz', out)).toEqual([]);
    expect(await judge('anime', '/dragon-ball-quiz', out)).toEqual(['link-not-allowed']);
  });
  it('the same card for Dragon Ball, on its own page only', async () => {
    await setup({ site: 'anime' });
    const out = (await card('otakudle-dragon-ball'))!;
    expect(links(out)).toEqual(['https://bunnyverse.org/otakudle/dragon-ball']);
    const t = text(out);
    expect(t).toContain('Otakudle Dragon Ball, no. 3');
    expect(t).toContain('The Dragon Ball character of the day');
    expect(t).toContain('Race · Affiliation · Home planet · Universe · Debut saga');
    expect(await judge('anime', '/dragon-ball-quiz', out)).toEqual([]);
    expect(await judge('anime', '/one-piece-quiz', out)).toEqual(['link-not-allowed']);
  });
  it('fail closed: no day, an error, a day of another game', async () => {
    await setup({ site: 'anime' });
    rpc.mockResolvedValue({ data: null, error: { message: 'dle_unavailable' } });
    expect(await card('otakudle-one-piece')).toBeNull();
    rpc.mockRejectedValue(new Error('network'));
    expect(await card('otakudle-one-piece')).toBeNull();
    rpc.mockResolvedValue({ data: day('otakudle', 3), error: null });
    expect(await card('otakudle-one-piece')).toBeNull();
  });
  it('flag off, the series page keeps its two children before the quizzes', () => {
    const slots = app('components/anime/series-hub-slots.tsx');
    expect(slots).toMatch(/beforeQuizzes: dailyGame \? \(\s*<>\s*<SeriesDailyCard game=\{dailyGame\} \/>\s*\{shield\}\s*\{storyMapEl\}\s*<\/>\s*\) : \(\s*<>\s*\{shield\}\s*\{storyMapEl\}\s*<\/>\s*\),/);
    expect(slots).toContain("const shield = <SpoilerShieldIsland seriesSlug={group.slug} groupId={group.id} arcs={shieldArcs(hub.arcs)} />;");
    expect(app('components/anime/series-daily-card.tsx')).not.toMatch(/^['"]use client['"]/m);
  });
  it('the card names the columns of its game, labels from the copy of the game', async () => {
    const { SERIES_CARD_COLUMNS } = await import('@/components/anime/series-daily-card');
    const { gameCopy } = await import('@/lib/dle/copy');
    for (const [game, keys] of Object.entries(SERIES_CARD_COLUMNS)) {
      for (const k of keys!) expect(gameCopy(game as never, 'en').columns[k], `${game} ${k}`).toBeDefined();
    }
  });
  it('token gate: no raw colour in the card', () => {
    const c = app('components/anime/series-daily-card.tsx');
    expect(c).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(c).not.toMatch(/rgba?\(/);
  });
});

// ---- the contract: flags, allowlist, ledger, runbook

describe('the contract of the links (flags-env.md, link-allowlist, LEDGER, RUNBOOK)', () => {
  it('two new server flags, one per kpopquiz.org element, lane H1, none for OtakuQuiz', async () => {
    const { O1_FLAGS } = await import('@/lib/site/registry');
    for (const name of ['NET_KPOPDLE_QUIZEND', 'NET_KPOPDLE_GROUP']) expect(O1_FLAGS).toContainEqual({ name, scope: 'server', lane: 'H1', reserved: false });
    expect(O1_FLAGS.filter((f) => /ANIME|OTAKU/.test(f.name) && /DAILY|DLE|OTAKUDLE/.test(f.name))).toEqual([]);
  });
  it('each new link has its row, from the right site to the hub, followed, no query, capped at one', () => {
    const json = JSON.parse(repo('docs/o1/contracts/link-allowlist.json')) as { links: { id: string; from: string[]; to: string[]; href: string; page: string | null; rel: string; query: boolean; maxPerPage?: number }[] };
    const want: Record<string, [string, string | null, string]> = {
      'kpopdle-quiz-end': ['kpop', '/q/**', '/kpopdle'], 'kpopdle-group': ['kpop', '/*-quiz', '/kpopdle'],
      'anime-daily-home-otakudle': ['anime', '/', '/otakudle'], 'anime-daily-home-one-piece': ['anime', '/', '/otakudle/one-piece'], 'anime-daily-home-dragon-ball': ['anime', '/', '/otakudle/dragon-ball'],
      'anime-series-one-piece': ['anime', '/one-piece-quiz', '/otakudle/one-piece'], 'anime-series-dragon-ball': ['anime', '/dragon-ball-quiz', '/otakudle/dragon-ball'],
      'anime-quiz-end': ['anime', '/q/**', '/otakudle'],
    };
    for (const [id, [from, page, href]] of Object.entries(want)) {
      expect(json.links.find((l) => l.id === id), id).toEqual(expect.objectContaining({ from: [from], to: ['hub'], page, href, rel: 'followed', query: false, maxPerPage: 1 }));
    }
    // kpopquiz.org links only to the Kpopdle and the Burrow: nothing of the anime games on a kpop row
    for (const l of json.links.filter((x) => x.from.includes('kpop') && x.to.includes('hub') && /kpopdle|daily/.test(x.id))) expect(l.href).toMatch(/^\/(kpopdle|daily)$/);
    // OtakuQuiz links only to the three anime games
    for (const l of json.links.filter((x) => x.id.startsWith('anime-'))) expect(l.href).toMatch(/^\/otakudle(\/(one-piece|dragon-ball))?$/);
  });
  it('the ledger row, the runbook line and the env rows exist', () => {
    expect(repo('docs/o1/LEDGER.md')).toMatch(/^\| CR-025 \| links \(P5\) \| .* \| owner 2026-11-03 \| approved 2026-11-03 \|$/m);
    const run = repo('docs/launch/o1/RUNBOOK.md');
    expect(run).toContain('**L3d  kpopquiz:');
    const env = repo('docs/launch/o1/ENV.md');
    for (const f of ['NET_KPOPDLE_QUIZEND', 'NET_KPOPDLE_GROUP']) {
      expect(run).toContain(f);
      expect(env).toContain(`\`${f}\``);
      expect(repo('docs/o1/contracts/flags-env.md')).toContain(`\`${f}\``);
    }
  });
});
