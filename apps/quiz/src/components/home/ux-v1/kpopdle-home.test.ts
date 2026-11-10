// C2, CR-018: the Kpopdle module of the kpopquiz.org home. Off, nothing is loaded and nothing is read; on, a real link in the server markup; closed on every
// failure; the answer of the day never reaches the page.
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DleDay } from '@/lib/dle/types';

const DAY: DleDay = {
  game: 'kpopdle-idol', now: '2026-11-20T10:00:00Z', date: '2026-11-20', game_no: 214, seconds_left: 50_400,
  yesterday: { date: '2026-11-19', game_no: 213, answer: { id: 'yesterday-idol', name: 'YesterdayAnswerName', attrs: {}, thumb: 'idols/yesterday.webp' } },
  stats: { plays: 1500, wins: 1206, give_ups: 20, guess_hist: [1, 2, 3] },
  play: { date: '2026-11-20', game_no: 214, status: 'won', guesses: [], hints: [{ key: 'fandom', value: 'SecretHint' }], target: { id: 'today-idol', name: 'TodayAnswerName', attrs: {}, thumb: null }, stats: null },
};

const rpc = vi.fn();
const moduleLoaded = vi.fn();
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

async function load(flag: string | null, opts: { site?: 'kpop' | 'anime' | 'hub'; hub?: boolean } = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  hubOn.dailyGuess = opts.hub ?? true;
  if (opts.site && opts.site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', opts.site);
  if (flag !== null) vi.stubEnv('NET_KPOPDLE_HOME', flag);
  return import('@/lib/ux-v1/p1/kpopdle-home');
}

async function html(flag: string | null, opts: { site?: 'kpop' | 'anime' | 'hub'; hub?: boolean } = {}): Promise<string | null> {
  const el = await (await load(flag, opts)).loadKpopdleHome();
  return el ? renderToString(el) : null;
}

const links = (s: string): string[] => [...s.matchAll(/<a\b[^>]*?\bhref="([^"]+)"[^>]*>/g)].map((m) => m[0]);

beforeEach(() => {
  rpc.mockReset();
  moduleLoaded.mockReset();
  rpc.mockResolvedValue({ data: DAY, error: null });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.restoreAllMocks(); });

describe('flag off', () => {
  for (const value of [null, '', '0', 'false', 'yes']) {
    it(`NET_KPOPDLE_HOME=${String(value)}: nothing rendered, no read`, async () => {
      expect(await html(value)).toBeNull();
      expect(rpc).not.toHaveBeenCalled();
    });
  }
  it('never loads the module file: a throwing module changes nothing', async () => {
    vi.doMock('@/components/home/ux-v1/kpopdle-home', () => { moduleLoaded(); throw new Error('loaded'); });
    expect(await html(null)).toBeNull();
    expect(moduleLoaded).not.toHaveBeenCalled();
    vi.doUnmock('@/components/home/ux-v1/kpopdle-home');
  });
  it('the anime and hub builds never draw it, flag on', async () => {
    expect(await html('1', { site: 'anime' })).toBeNull();
    expect(await html('1', { site: 'hub' })).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('flag on', () => {
  it('a real, followed link to the game, and one to the Terrier, in the server markup, no query', async () => {
    const out = await html('1');
    expect(out).not.toBeNull();
    expect(links(out!).sort()).toEqual([
      '<a href="https://bunnyverse.org/daily" class="ux-lnk">',
      '<a href="https://bunnyverse.org/kpopdle" class="ux-btn ux-btn-primary p1-kd-go">',
    ].sort());
    expect(out).toMatch(/Play Kpopdle/);
    expect(await html('true')).toBe(out);
    expect(rpc).toHaveBeenCalledWith('dle_day', { p_game: 'kpopdle-idol' });
  });
  it('h2 and h3 only, no H1; the board copy; real numbers; no dash', async () => {
    const out = (await html('1'))!;
    expect(out).not.toMatch(/<h1/);
    expect(out).toMatch(/<h2 id="p1-kd-h">/);
    const text = out.replace(/<style[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');
    expect(text).toContain('Daily game');
    expect(text).toContain('Kpopdle · Idol no. 214');
    expect(text).toContain("Guess today's K-pop idol");
    expect(text).toContain('8 clues per guess · unlimited tries · 1,206 fans found it · new idol at 00:00 UTC');
    expect(text).toContain('A free daily game on bunnyverse.org, our sister site.');
    expect(out).not.toMatch(/[\u2013\u2014]/);
  });
  it('under the floor of dle_day (stats null) or with no win yet, no count of fans', async () => {
    rpc.mockResolvedValue({ data: { ...DAY, stats: null }, error: null });
    const under = (await html('1'))!;
    expect(under).toContain('8 clues per guess · unlimited tries · new idol at 00:00 UTC');
    expect(under).not.toMatch(/fans? found/);
    rpc.mockResolvedValue({ data: { ...DAY, stats: { ...DAY.stats!, wins: 0 } }, error: null });
    expect(await html('1')).not.toMatch(/fans? found/);
    rpc.mockResolvedValue({ data: { ...DAY, stats: { ...DAY.stats!, wins: 1 } }, error: null });
    expect(await html('1')).toContain('1 fan found it');
  });
  it('no spoiler: nothing of the answers, the hints or the play reaches the page, even if dle_day sent them', async () => {
    const out = (await html('1'))!;
    for (const s of ['YesterdayAnswerName', 'yesterday-idol', 'yesterday.webp', 'TodayAnswerName', 'today-idol', 'SecretHint']) expect(out).not.toContain(s);
    const { kpopdleHomeView } = await import('./kpopdle-home');
    expect(kpopdleHomeView(DAY)).toEqual({ gameNo: 214, fansFound: 1206 });
  });
  it('asks for no token, so dle_day cannot answer with a play', async () => {
    await html('1');
    for (const call of rpc.mock.calls) expect(call[1]).not.toHaveProperty('p_token');
  });
});

describe('fail closed: the module disappears, the page is not touched', () => {
  it('dle_unavailable (the game is off)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'dle_unavailable' } });
    expect(await html('1')).toBeNull();
  });
  it('production today: no function and no table', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.dle_day' } });
    expect(await html('1')).toBeNull();
  });
  it('the read throws', async () => {
    rpc.mockRejectedValue(new Error('network'));
    expect(await html('1')).toBeNull();
  });
  it('an answer that is not a day of this game', async () => {
    for (const data of [null, {}, 'x', { ...DAY, game: 'otakudle' }, { ...DAY, game_no: 0 }, { ...DAY, game_no: 1.5 }]) {
      rpc.mockResolvedValue({ data, error: null });
      expect(await html('1'), JSON.stringify(data)).toBeNull();
    }
  });
  it('the hub flag off: no read, and no link to a page answering 404', async () => {
    expect(await html('1', { hub: false })).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('the module file failing to load', async () => {
    vi.doMock('@/components/home/ux-v1/kpopdle-home', () => { throw new Error('chunk'); });
    expect(await html('1')).toBeNull();
    vi.doUnmock('@/components/home/ux-v1/kpopdle-home');
  });
  it('the hub route map must carry both links, whatever the switch says', async () => {
    await load('1');
    const { kpopdleHomeOpen } = await import('./kpopdle-home');
    const { REGISTRY } = await import('@/lib/site/registry');
    expect(kpopdleHomeOpen()).toBe(true);
    expect(kpopdleHomeOpen({ ...REGISTRY.hub.features, dailyGuess: false })).toBe(false);
    await load('1', { hub: false });
    const closed = await import('./kpopdle-home');
    const reg = await import('@/lib/site/registry');
    expect(closed.kpopdleHomeOpen({ ...reg.REGISTRY.hub.features, dailyGuess: true })).toBe(false);
  });
});

describe('the link rule (link-allowlist.json, the judge of check-network-links)', () => {
  const judge = async (page: string, out: string): Promise<string[]> => {
    const { analyzeHtml, checkLinks } = await import('../../../../scripts/o1/leak-lib.mjs');
    const allowlist = JSON.parse(readFileSync(new URL('../../../../../../docs/o1/contracts/link-allowlist.json', import.meta.url), 'utf8')) as object;
    return checkLinks({ site: 'kpop', path: page, pageUrl: `https://kpopquiz.org${page}`, an: analyzeHtml(out), allowlist }).violations.map((v: { code: string }) => v.code);
  };
  it('both links pass on the home, and only there', async () => {
    const out = (await html('1'))!;
    expect(await judge('/', out)).toEqual([]);
    expect(await judge('/groups', out)).toEqual(['link-not-allowed', 'link-not-allowed']);
  });
  it('the row caps hold: a second Play link fails', async () => {
    expect(await judge('/', `<a href="https://bunnyverse.org/kpopdle">a</a><a href="https://bunnyverse.org/kpopdle">b</a>`)).toEqual(['link-over-cap']);
  });
});

describe('what keeps the flag-off home byte-identical (read from the sources)', () => {
  const src = (f: string): string => readFileSync(new URL(f, import.meta.url), 'utf8');
  const home = src('./ux-home.tsx');
  const gate = src('../../../lib/ux-v1/p1/kpopdle-home.ts');
  const card = src('./kpopdle-home.tsx');

  it('one slot of the tree, the same element without the module: no extra child in the page data', () => {
    expect(home).toContain('{kpopdle ? <><ContinuePlaying />{kpopdle}</> : <ContinuePlaying />}');
    expect(home.match(/<ContinuePlaying \/>/g)).toHaveLength(2);
  });
  it('the home imports the gate only; the module file, its reads and the game code load behind the flag', () => {
    expect(home).toContain("from '@/lib/ux-v1/p1/kpopdle-home'");
    expect(home).not.toMatch(/from '[^']*(lib\/dle|\.\/kpopdle-home|components\/home\/ux-v1\/kpopdle-home)/);
    expect(gate).toMatch(/await import\('@\/components\/home\/ux-v1\/kpopdle-home'\)/);
    expect(gate.match(/^import .*$/gm)).toEqual(["import { flagOn, SITE_ID } from '@/lib/site/registry';"]);
  });
  it('no stylesheet import and no client code; its rules travel with it', () => {
    for (const s of [gate, card]) {
      expect(s).not.toMatch(/^import\s+['"][^'"]+\.css['"]/m);
      expect(s).not.toMatch(/^['"]use client['"]/m);
    }
  });
  it('token gate: no raw colour', () => {
    expect(card).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(card).not.toMatch(/rgba?\(/);
  });
  it('the 8 clues of the copy are the 8 columns of the game', () => {
    const sql = readFileSync(new URL('../../../../../../docs/pending-migrations/multisite/020-dle-kpop-idol.sql', import.meta.url), 'utf8');
    const rows = sql.slice(sql.indexOf('insert into public.dle_attributes')).split(';')[0]!.match(/\('kpopdle-idol', '/g);
    expect(rows).toHaveLength(8);
    expect(card).toContain('KPOPDLE_CLUES = 8');
  });
});

describe('the same look as the Daily games module of OtakuQuiz (o1/slots, 2026-11-10)', () => {
  const src = (f: string): string => readFileSync(new URL(f, import.meta.url), 'utf8');
  const kp = src('./kpopdle-home.tsx');
  const an = src('./anime-daily-home.tsx');

  it('draws the title size and the button the same way (the near stripes stay the strong red, owner 2026-11-08: state-colours.test.ts)', () => {
    expect(kp).toContain('.p1-kd-main h3 { font-size: 20px;');
    expect(an).toContain('.p5-ad-main h3 { font-size: 20px;');
    expect(kp).toContain('justify-content: center');
  });

  it('stacks the tiles, the text and a full-width button on a phone, as the OtakuQuiz cards do', () => {
    expect(kp).toContain('.p1-kd-card { flex-direction: column; align-items: flex-start; gap: 14px; padding: 18px; }');
    expect(kp).toContain('.p1-kd-go { width: 100%; box-sizing: border-box; }');
  });
});

describe('ink floor: the tokens the module writes with, on the card, both themes', () => {
  const lum = (hex: string): number => {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
  };
  const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
  it('every text is AA (4.5:1)', async () => {
    const { REGISTRY } = await import('@/lib/site/registry');
    const { light, dark } = REGISTRY.kpop.theme;
    for (const t of [light, { ...light, ...dark }]) {
      for (const k of ['ink', 'muted', 'pink-ink'] as const) expect(ratio(t[k]!, t.raised!), k).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t['on-accent']!, t['pink-fill']!), 'button').toBeGreaterThanOrEqual(4.5);
    }
  });
});
