// Run PWA (docs/o1/PWA-PLAN.md, sections 3 and 5): the tests evaluate the very text /sw.js serves, in a vm with a fake worker scope, a
// fake Cache Storage and a scripted network, and prove what the plan demands: the worker never puts a page (HTML) or an API answer
// in a cache, caches only versioned static files and the icons, answers the offline page only when the network does not answer,
// and the kill worker deletes its caches and unregisters.
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

import { PWA_COPY } from './copy';
import {
  SW_CACHE, SW_CACHE_PREFIX, SW_ICON_FILES, SW_KILLED_MESSAGE, SW_MAX_ENTRIES, killSwitchSource, offlineHtml, serviceWorkerSource, swBases,
} from './sw-source';
import { swThemeOf } from './sw-route';

// The two dash characters, built from their code points so this file holds neither (CLAUDE.md).
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

const ORIGIN = 'https://kpopquiz.org';
const HUB = 'https://bunnyverse.org';

type Handler = (event: FakeEvent) => void;
interface FakeEvent {
  request?: Request;
  preloadResponse?: Promise<Response | undefined>;
  respondWith?: (p: Promise<Response> | Response) => void;
  waitUntil: (p: Promise<unknown>) => void;
}

/** An in-memory Cache with the methods the worker uses; every write is counted per URL. */
class FakeCache {
  readonly map = new Map<string, Response>();
  readonly puts: string[] = [];
  async match(req: Request | string): Promise<Response | undefined> {
    const hit = this.map.get(typeof req === 'string' ? req : req.url);
    return hit ? hit.clone() : undefined;
  }
  async put(req: Request | string, res: Response): Promise<void> {
    const url = typeof req === 'string' ? req : req.url;
    this.puts.push(url);
    this.map.delete(url);
    this.map.set(url, res);
  }
  async keys(): Promise<Request[]> { return [...this.map.keys()].map((u) => new Request(u)); }
  async delete(req: Request | string): Promise<boolean> { return this.map.delete(typeof req === 'string' ? req : req.url); }
}

class FakeCaches {
  readonly stores = new Map<string, FakeCache>();
  async open(name: string): Promise<FakeCache> {
    let c = this.stores.get(name);
    if (!c) { c = new FakeCache(); this.stores.set(name, c); }
    return c;
  }
  async keys(): Promise<string[]> { return [...this.stores.keys()]; }
  async delete(name: string): Promise<boolean> { return this.stores.delete(name); }
  /** Every URL ever written to any cache. */
  get allPuts(): string[] { return [...this.stores.values()].flatMap((c) => c.puts); }
}

interface Harness {
  readonly caches: FakeCaches;
  readonly fetched: string[];
  readonly posted: unknown[];
  readonly state: { unregistered: boolean; skipWaiting: number; claimed: number; preloadEnabled: number };
  /** Dispatches a fetch; `handled` is whether the worker called respondWith (false: the browser's default, the network, applies). */
  fetch(input: { url: string; method?: string; mode?: string; headers?: Record<string, string>; cache?: string; preload?: Response }): Promise<{ handled: boolean; response: Response | null }>;
  fire(type: 'install' | 'activate'): Promise<void>;
  listeners: Record<string, Handler[]>;
}

/**
 * Runs `source` as a worker. `network(url)` is the scripted network: it returns a Response or throws (the network does not answer).
 * Request, Response, Headers and URL are Node's own, which follow the same specification as the worker scope's.
 */
function runWorker(source: string, origin: string, network: (url: string) => Response, preexisting: Record<string, Record<string, string>> = {}): Harness {
  const caches = new FakeCaches();
  const listeners: Record<string, Handler[]> = {};
  const fetched: string[] = [];
  const posted: unknown[] = [];
  const state = { unregistered: false, skipWaiting: 0, claimed: 0, preloadEnabled: 0 };
  for (const [name, files] of Object.entries(preexisting)) {
    const c = new FakeCache();
    for (const [u, body] of Object.entries(files)) c.map.set(u, new Response(body));
    caches.stores.set(name, c);
  }
  const scope: Record<string, unknown> = {
    addEventListener: (type: string, fn: Handler) => { (listeners[type] ??= []).push(fn); },
    location: new URL(`${origin}/sw.js`),
    skipWaiting: () => { state.skipWaiting++; },
    clients: {
      claim: async () => { state.claimed++; },
      matchAll: async () => [{ postMessage: (m: unknown) => { posted.push(m); } }],
    },
    registration: {
      unregister: async () => { state.unregistered = true; return true; },
      navigationPreload: { enable: async () => { state.preloadEnabled++; } },
    },
  };
  const context = vm.createContext({
    self: scope, caches, URL, Request, Response, Headers, Promise, JSON, Object, Array, console,
    fetch: async (req: Request | string) => { const url = typeof req === 'string' ? req : req.url; fetched.push(url); return network(url); },
  });
  vm.runInContext(source, context);

  const harness: Harness = {
    caches, fetched, posted, state, listeners,
    async fire(type) {
      const waits: Promise<unknown>[] = [];
      for (const fn of listeners[type] ?? []) fn({ waitUntil: (p) => { waits.push(p); } });
      await Promise.all(waits);
    },
    async fetch(input) {
      const request = new Request(input.url, { method: input.method ?? 'GET', headers: input.headers ?? {} });
      // Node's Request is read-only for mode and cache: the worker reads them off the object, so define them on it.
      Object.defineProperty(request, 'mode', { value: input.mode ?? 'no-cors' });
      Object.defineProperty(request, 'cache', { value: input.cache ?? 'default' });
      let response: Promise<Response> | null = null;
      const waits: Promise<unknown>[] = [];
      for (const fn of listeners.fetch ?? []) {
        fn({
          request,
          preloadResponse: Promise.resolve(input.preload),
          respondWith: (p) => { response = Promise.resolve(p); },
          waitUntil: (p) => { waits.push(p); },
        });
      }
      const result = response ? await (response as Promise<Response>) : null;
      await Promise.all(waits);
      return { handled: response !== null, response: result };
    },
  };
  return harness;
}

const THEME = swThemeOf('kpop');
const kpopWorker = (): string => serviceWorkerSource({ app: 'kpop', brand: 'KpopQuiz', theme: THEME });
const hubWorker = (): string => serviceWorkerSource({ app: 'hub', brand: 'Bunnyverse', theme: swThemeOf('hub') });

const html = (body = '<html><body>page of the day</body></html>'): Response => new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
const json = (body = '{"ok":true}'): Response => new Response(body, { headers: { 'content-type': 'application/json' } });
const js = (body = 'console.log(1)'): Response => new Response(body, { headers: { 'content-type': 'application/javascript' } });
// A Response built by hand has type 'default'; the worker stores only type 'basic' (a same-origin answer), as a real fetch gives.
const basic = (res: Response): Response => { Object.defineProperty(res, 'type', { value: 'basic' }); return res; };

describe('the real worker never stores a page or an API answer', () => {
  it('a navigation goes to the network and nothing is written to any cache, whatever the page', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => basic(html()));
    for (const path of ['/', '/bts-quiz', '/q/some-quiz', '/fr', '/daily', '/_next/static/chunks/page.html', '/site.webmanifest']) {
      const { handled, response } = await w.fetch({ url: `${ORIGIN}${path}`, mode: 'navigate' });
      expect(handled, path).toBe(true);
      expect(await response!.text(), path).toContain('page of the day');
    }
    expect(w.caches.allPuts).toEqual([]);
    expect(await w.caches.keys()).toEqual([]);
  });

  it('a navigation is also never stored when it answers with the early (preload) response', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => { throw new Error('the network is not asked when the preload answered'); });
    const { response } = await w.fetch({ url: `${ORIGIN}/`, mode: 'navigate', preload: basic(html('<p>preloaded</p>')) });
    expect(await response!.text()).toBe('<p>preloaded</p>');
    expect(w.fetched).toEqual([]);
    expect(w.caches.allPuts).toEqual([]);
  });

  it('API, auth and cron answers are not even handled by the worker: the browser asks the network itself', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => basic(json()));
    for (const path of ['/api/quiz/x', '/api/daily', '/api/n/b', '/auth/callback', '/auth/confirm', '/api', '/api/ux-v1/a0/styles']) {
      for (const mode of ['cors', 'same-origin', 'navigate']) {
        const { handled } = await w.fetch({ url: `${ORIGIN}${path}`, mode });
        expect(handled, `${mode} ${path}`).toBe(false);
      }
    }
    expect(w.fetched).toEqual([]);
    expect(w.caches.allPuts).toEqual([]);
  });

  it('on the hub, the same holds under /anime (OtakuQuiz is served on the hub domain)', async () => {
    const w = runWorker(hubWorker(), HUB, () => basic(json()));
    for (const path of ['/anime/api/quiz/x', '/anime/auth/callback', '/api/n/b']) expect((await w.fetch({ url: `${HUB}${path}`, mode: 'cors' })).handled, path).toBe(false);
    const nav = runWorker(hubWorker(), HUB, () => basic(html()));
    for (const path of ['/', '/anime', '/anime/series/naruto', '/kpopdle']) await nav.fetch({ url: `${HUB}${path}`, mode: 'navigate' });
    expect(nav.caches.allPuts).toEqual([]);
  });

  it('Supabase, analytics, image hosts and any other origin are never handled or stored', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => basic(json()));
    for (const url of [
      'https://abc.supabase.co/rest/v1/quizzes?select=*', 'https://abc.supabase.co/auth/v1/token', 'https://abc.supabase.co/storage/v1/object/public/x.png',
      'https://va.vercel-scripts.com/v1/script.js', 'https://i.ytimg.com/vi/x/hq.jpg', 'https://bunnyverse.org/_next/static/chunks/a.js',
    ]) {
      expect((await w.fetch({ url, mode: 'cors' })).handled, url).toBe(false);
    }
    expect(w.caches.allPuts).toEqual([]);
  });

  it('only GET is handled: a write is never intercepted, even on a static address', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => basic(js()));
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect((await w.fetch({ url: `${ORIGIN}/_next/static/chunks/a.js`, method, mode: 'cors' })).handled, method).toBe(false);
      expect((await w.fetch({ url: `${ORIGIN}/q/x`, method, mode: 'navigate' })).handled, method).toBe(false);
    }
    expect(w.caches.allPuts).toEqual([]);
  });

  it('other files of the site (fonts, images, the manifest, the optimizer, the unversioned public folder) are left to the network', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => basic(js()));
    for (const path of ['/fonts/Inter-latin.woff2', '/_next/image?url=%2Fx.png&w=640&q=75', '/avatar/a.png', '/site.webmanifest', '/og-default.png', '/sw.js', '/robots.txt']) {
      expect((await w.fetch({ url: `${ORIGIN}${path}`, mode: 'no-cors' })).handled, path).toBe(false);
    }
    expect(w.caches.allPuts).toEqual([]);
  });

  it('a range request and only-if-cached are left alone', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => basic(js()));
    expect((await w.fetch({ url: `${ORIGIN}/_next/static/media/a.mp3`, mode: 'no-cors', headers: { range: 'bytes=0-10' } })).handled).toBe(false);
    expect((await w.fetch({ url: `${ORIGIN}/_next/static/a.js`, mode: 'cors', cache: 'only-if-cached' })).handled).toBe(false);
  });

  it('exhaustive: over every kind of address and answer, the only things ever written are a static file or an icon that is not HTML', async () => {
    const answers: Record<string, () => Response> = { html: () => basic(html()), json: () => basic(json()), js: () => basic(js()) };
    const paths = [
      '/', '/q/x', '/bts-quiz', '/fr/faq', '/api/a', '/auth/b', '/_next/static/chunks/a.js', '/_next/static/css/b.css', '/_next/static/media/c.woff2',
      '/_next/data/x/y.json', '/_next/image?url=a', '/android-chrome-192x192.png', '/favicon.ico', '/fonts/a.woff2', '/x.html', '/sitemap.xml',
    ];
    for (const [kind, make] of Object.entries(answers)) {
      for (const mode of ['navigate', 'cors', 'no-cors', 'same-origin']) {
        const w = runWorker(kpopWorker(), ORIGIN, make);
        for (const path of paths) await w.fetch({ url: `${ORIGIN}${path}`, mode });
        for (const url of w.caches.allPuts) {
          const path = url.slice(ORIGIN.length);
          const allowed = path.startsWith('/_next/static/') || SW_ICON_FILES.includes(path);
          expect(allowed, `${kind} ${mode} stored ${path}`).toBe(true);
          expect(kind, `${mode} stored ${path}`).not.toBe('html');
        }
      }
    }
  });
});

describe('the real worker caches versioned static files and the icons', () => {
  it('a /_next/static file is stored on the first answer and then served from the cache without the network', async () => {
    let calls = 0;
    const w = runWorker(kpopWorker(), ORIGIN, () => { calls++; return basic(js('chunk')); });
    const url = `${ORIGIN}/_next/static/chunks/main-abc123.js`;
    const first = await w.fetch({ url, mode: 'no-cors' });
    expect(first.handled).toBe(true);
    expect(await first.response!.text()).toBe('chunk');
    expect(w.caches.allPuts).toEqual([url]);
    expect([...w.caches.stores.keys()]).toEqual([SW_CACHE]);
    const second = await w.fetch({ url, mode: 'no-cors' });
    expect(await second.response!.text()).toBe('chunk');
    expect(calls).toBe(1);
  });

  it('on the hub it also keeps the static files of OtakuQuiz under /anime, and only the hub does', async () => {
    const hub = runWorker(hubWorker(), HUB, () => basic(js()));
    await hub.fetch({ url: `${HUB}/anime/_next/static/chunks/a.js`, mode: 'no-cors' });
    await hub.fetch({ url: `${HUB}/_next/static/chunks/b.js`, mode: 'no-cors' });
    expect(hub.caches.allPuts).toEqual([`${HUB}/anime/_next/static/chunks/a.js`, `${HUB}/_next/static/chunks/b.js`]);
    const kpop = runWorker(kpopWorker(), ORIGIN, () => basic(js()));
    expect((await kpop.fetch({ url: `${ORIGIN}/anime/_next/static/chunks/a.js`, mode: 'no-cors' })).handled).toBe(false);
    expect(swBases('kpop')).toEqual(['']);
    expect(swBases('hub')).toEqual(['', '/anime']);
  });

  it('a static address is not stored when the answer is not a plain 200, is not same-origin typed, is HTML, or says no-store', async () => {
    const cases: [string, () => Response][] = [
      ['a 404', () => basic(new Response('missing', { status: 404, headers: { 'content-type': 'text/html' } }))],
      ['a 500', () => basic(new Response('x', { status: 500 }))],
      ['a partial 206', () => basic(new Response('x', { status: 206 }))],
      ['an opaque answer', () => js()],
      ['HTML under a static address', () => basic(html())],
      ['no-store', () => basic(new Response('x', { headers: { 'content-type': 'application/javascript', 'cache-control': 'no-store' } }))],
    ];
    for (const [label, make] of cases) {
      const w = runWorker(kpopWorker(), ORIGIN, make);
      const { response } = await w.fetch({ url: `${ORIGIN}/_next/static/chunks/a.js`, mode: 'no-cors' });
      expect(response, label).not.toBeNull();
      expect(w.caches.allPuts, label).toEqual([]);
    }
  });

  it('an icon is served from the cache at once and refreshed in the background (stale while revalidate)', async () => {
    let version = 'v1';
    const w = runWorker(kpopWorker(), ORIGIN, () => basic(new Response(`icon-${version}`, { headers: { 'content-type': 'image/png' } })));
    const url = `${ORIGIN}/android-chrome-192x192.png`;
    expect(await (await w.fetch({ url, mode: 'no-cors' })).response!.text()).toBe('icon-v1');
    version = 'v2';
    expect(await (await w.fetch({ url, mode: 'no-cors' })).response!.text()).toBe('icon-v1');
    expect(w.caches.allPuts).toEqual([url, url]);
    expect(await (await w.fetch({ url, mode: 'no-cors' })).response!.text()).toBe('icon-v2');
  });

  it('an icon still answers from the cache when the network is down', async () => {
    let up = true;
    const w = runWorker(kpopWorker(), ORIGIN, () => { if (!up) throw new TypeError('network'); return basic(new Response('icon', { headers: { 'content-type': 'image/png' } })); });
    const url = `${ORIGIN}/favicon-32x32.png`;
    await w.fetch({ url, mode: 'no-cors' });
    up = false;
    expect(await (await w.fetch({ url, mode: 'no-cors' })).response!.text()).toBe('icon');
  });

  it('the cache holds at most SW_MAX_ENTRIES files, the oldest leave first', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => basic(js()));
    for (let i = 0; i < SW_MAX_ENTRIES + 5; i++) await w.fetch({ url: `${ORIGIN}/_next/static/chunks/f${i}.js`, mode: 'no-cors' });
    const store = w.caches.stores.get(SW_CACHE)!;
    expect(store.map.size).toBe(SW_MAX_ENTRIES);
    expect(store.map.has(`${ORIGIN}/_next/static/chunks/f0.js`)).toBe(false);
    expect(store.map.has(`${ORIGIN}/_next/static/chunks/f${SW_MAX_ENTRIES + 4}.js`)).toBe(true);
  });
});

describe('the offline page', () => {
  it('is the answer only when the network does not answer a page, in the language of the path', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => { throw new TypeError('Failed to fetch'); });
    const en = (await w.fetch({ url: `${ORIGIN}/`, mode: 'navigate' })).response!;
    expect(en.status).toBe(200);
    expect(en.headers.get('content-type')).toContain('text/html');
    expect(en.headers.get('cache-control')).toBe('no-store');
    const enText = await en.text();
    expect(enText).toContain(PWA_COPY.en.offlineTitle);
    expect(enText).toContain('KpopQuiz');
    expect(enText).toContain('lang="en"');
    const fr = await (await w.fetch({ url: `${ORIGIN}/fr/faq`, mode: 'navigate' })).response!.text();
    expect(fr).toContain(PWA_COPY.fr.offlineTitle);
    expect(fr).toContain('lang="fr"');
    expect(w.caches.allPuts).toEqual([]);
  });

  it('is never the answer to an HTTP error: a 404 or a 500 of the site is the site\'s own page', async () => {
    for (const status of [404, 410, 500, 503]) {
      const w = runWorker(kpopWorker(), ORIGIN, () => basic(new Response('site error page', { status })));
      const { response } = await w.fetch({ url: `${ORIGIN}/nope`, mode: 'navigate' });
      expect(response!.status).toBe(status);
      expect(await response!.text()).toBe('site error page');
    }
  });

  it('is not an answer to anything but a page: a failing static file or icon stays a network failure', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => { throw new TypeError('Failed to fetch'); });
    await expect(w.fetch({ url: `${ORIGIN}/_next/static/chunks/uncached.js`, mode: 'no-cors' })).rejects.toThrow('Failed to fetch');
    await expect(w.fetch({ url: `${ORIGIN}/favicon.ico`, mode: 'no-cors' })).rejects.toThrow('Failed to fetch');
  });

  it('the page is a whole HTML document built into the worker: no script but the retry button, no request, brand and colours of the site', () => {
    for (const locale of ['en', 'fr'] as const) {
      const text = offlineHtml(locale, 'Bunnyverse', swThemeOf('hub'));
      expect(text.startsWith('<!doctype html>')).toBe(true);
      expect(text).toContain('Bunnyverse');
      expect(text).toContain('onclick="location.reload()"');
      expect(text).not.toMatch(/<script|<link|<img|src=|href=|url\(|@import/i);
      expect(text).toContain(swThemeOf('hub').page);
    }
  });
});

describe('the worker lifecycle', () => {
  it('install takes over at once, and activate removes older caches of the family only, enables the preload and claims the pages', async () => {
    const w = runWorker(kpopWorker(), ORIGIN, () => basic(js()), {
      [`${SW_CACHE_PREFIX}static-v0`]: { 'https://kpopquiz.org/_next/static/old.js': 'old' },
      [SW_CACHE]: { 'https://kpopquiz.org/_next/static/keep.js': 'keep' },
      'someone-elses-cache': { 'https://kpopquiz.org/x': 'x' },
    });
    await w.fire('install');
    await w.fire('activate');
    expect(w.state.skipWaiting).toBe(1);
    expect(w.state.claimed).toBe(1);
    expect(w.state.preloadEnabled).toBe(1);
    expect((await w.caches.keys()).sort()).toEqual([SW_CACHE, 'someone-elses-cache'].sort());
  });

  it('the same options give the same bytes, and the two apps differ in name and bases', () => {
    expect(kpopWorker()).toBe(kpopWorker());
    expect(hubWorker()).toBe(hubWorker());
    expect(kpopWorker()).not.toBe(hubWorker());
    expect(kpopWorker()).toContain('KpopQuiz');
    expect(hubWorker()).toContain('Bunnyverse');
    expect(hubWorker()).toContain('/anime');
  });

  it('contains no dash character and no cache call that could store a page by design (no addAll, no precache)', () => {
    for (const text of [kpopWorker(), hubWorker(), killSwitchSource()]) {
      expect(text).not.toMatch(DASHES);
      expect(text).not.toMatch(/addAll|precache/i);
    }
  });
});

describe('the kill worker', () => {
  it('has no fetch handler, deletes the caches of the family only, tells the open pages and unregisters', async () => {
    const w = runWorker(killSwitchSource(), ORIGIN, () => { throw new Error('the kill worker never fetches'); }, {
      [SW_CACHE]: { 'https://kpopquiz.org/_next/static/a.js': 'a' },
      [`${SW_CACHE_PREFIX}other`]: { 'https://kpopquiz.org/_next/static/b.js': 'b' },
      'someone-elses-cache': { 'https://kpopquiz.org/x': 'x' },
    });
    expect(w.listeners.fetch).toBeUndefined();
    await w.fire('install');
    await w.fire('activate');
    expect(w.state.skipWaiting).toBe(1);
    expect(w.state.unregistered).toBe(true);
    expect(await w.caches.keys()).toEqual(['someone-elses-cache']);
    expect(w.posted).toEqual([{ kq: SW_KILLED_MESSAGE }]);
    // A fetch after it is not handled: there is no listener, so every request is the browser's own.
    expect((await w.fetch({ url: `${ORIGIN}/`, mode: 'navigate' })).handled).toBe(false);
  });
});
