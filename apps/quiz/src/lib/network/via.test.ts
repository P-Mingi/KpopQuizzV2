// Run O1, lot (c), lane B6: VIA_RE, the via parser, the address cleaner of the Web Analytics filter and the via-catcher.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VIA_RE } from './types';

const sent: unknown[] = [];
vi.mock('./beacon-client', () => ({ sendNetBeacon: (b: unknown) => { sent.push(b); } }));

async function via(site: 'kpop' | 'anime'): Promise<typeof import('./via')> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return import('./via');
}

class Store {
  private m = new Map<string, string>();
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
}

function fakeWindow(href: string): { win: Window; replaced: string[]; session: Store } {
  const replaced: string[] = [];
  const session = new Store();
  const u = new URL(href);
  const win = {
    location: { href },
    history: { state: null, replaceState: (_s: unknown, _t: string, url: string) => { replaced.push(url); } },
    sessionStorage: session,
  } as unknown as Window;
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true });
  void u;
  return { win, replaced, session };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  sent.length = 0;
  Reflect.deleteProperty(globalThis, 'window');
});

describe('VIA_RE', () => {
  it('takes a site letter, a dot and 2 to 8 lowercase letters', () => {
    for (const ok of ['k.menu', 'a.ch', 'f.xfact', 'k.ab', 'a.abcdefgh']) expect(ok).toMatch(VIA_RE);
    for (const bad of ['x.menu', 'k.m', 'k.abcdefghi', 'k.Menu', 'k.me1', 'k.menu ', ' k.menu', 'kmenu', 'k.', '']) expect(bad).not.toMatch(VIA_RE);
  });
});

describe('parseVia', () => {
  it('maps the letter to a site and the second part to a NetBridgeId', async () => {
    const { parseVia } = await via('kpop');
    expect(parseVia('a.menu')).toEqual({ source: 'anime', bridge: 'menu' });
    expect(parseVia('f.foot')).toEqual({ source: 'hub', bridge: 'foot' });
    expect(parseVia('k.zzzz')).toEqual({ source: 'kpop', bridge: null });
    expect(parseVia('nope')).toBeNull();
  });
});

describe('cleanUrl', () => {
  it('drops via and the identifiers of the jump, keeps the rest', async () => {
    const { cleanUrl } = await via('kpop');
    expect(cleanUrl('https://kpopquiz.org/quizzes?page=2&via=a.menu&t=abc&code=x&state=y')).toBe('https://kpopquiz.org/quizzes?page=2');
    expect(cleanUrl('/series/naruto?via=k.menu')).toBe('/series/naruto');
    expect(cleanUrl('https://fandomverse.org/anime/auth/land#code=abc&state=def')).toBe('https://fandomverse.org/anime/auth/land');
    expect(cleanUrl('https://fandomverse.org/anime/a#section')).toBe('https://fandomverse.org/anime/a#section');
  });
});

describe('installAnalyticsFilter', () => {
  it('queues a beforeSend that cleans the address of an event', async () => {
    const { installAnalyticsFilter } = await via('kpop');
    const w = {} as unknown as Window & { va?: (...a: unknown[]) => void; vaq?: unknown[][] };
    installAnalyticsFilter(w);
    expect(w.vaq).toHaveLength(1);
    const [name, fn] = w.vaq![0]! as ['beforeSend', (e: { type: 'pageview'; url: string }) => { url: string }];
    expect(name).toBe('beforeSend');
    expect(fn({ type: 'pageview', url: 'https://kpopquiz.org/?via=a.menu&utm=1' }).url).toBe('https://kpopquiz.org/?utm=1');
  });
  it('registers on an Analytics that is already mounted', async () => {
    const { installAnalyticsFilter } = await via('kpop');
    const calls: unknown[][] = [];
    const w = { va: (...a: unknown[]) => { calls.push(a); } } as unknown as Window;
    installAnalyticsFilter(w);
    expect(calls[0]![0]).toBe('beforeSend');
  });
});

describe('catchVia', () => {
  it('keeps a valid via in sessionStorage, strips it from the address and counts one land', async () => {
    const { catchVia } = await via('kpop');
    const { win, replaced, session } = fakeWindow('https://kpopquiz.org/quizzes?page=2&via=a.menu#top');
    catchVia(win);
    expect(session.getItem('fq.net.via')).toBe('a.menu');
    expect(replaced).toEqual(['/quizzes?page=2#top']);
    expect(sent).toEqual([{ dst: 'anime', bridge: 'menu', step: 'land' }]);
  });
  it('strips and ignores a malformed via', async () => {
    const { catchVia } = await via('kpop');
    const { win, replaced, session } = fakeWindow('https://kpopquiz.org/?via=EVIL%3Cscript');
    catchVia(win);
    expect(session.getItem('fq.net.via')).toBeNull();
    expect(replaced).toEqual(['/']);
    expect(sent).toEqual([]);
  });
  it('ignores a via that names the site itself', async () => {
    const { catchVia } = await via('kpop');
    const { win, session } = fakeWindow('https://kpopquiz.org/?via=k.menu');
    catchVia(win);
    expect(session.getItem('fq.net.via')).toBeNull();
    expect(sent).toEqual([]);
  });
  it('does nothing without a via', async () => {
    const { catchVia } = await via('kpop');
    const { win, replaced } = fakeWindow('https://kpopquiz.org/quizzes');
    catchVia(win);
    expect(replaced).toEqual([]);
    expect(sent).toEqual([]);
  });
  it('a via without a known link id is kept but counts no land', async () => {
    const { catchVia } = await via('anime');
    const { win, session } = fakeWindow('https://fandomverse.org/anime/?via=k.zzzz');
    catchVia(win);
    expect(session.getItem('fq.net.via')).toBe('k.zzzz');
    expect(sent).toEqual([]);
  });
});
