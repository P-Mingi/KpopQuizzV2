// Run PWA (docs/o1/PWA-PLAN.md, section 3): the text of the two service workers, built as strings so /sw.js can serve them and the tests
// can run them (lib/pwa/sw.test.ts evaluates the very text this module returns).
//
// What the real worker does, and nothing else:
//   - it caches only files whose address changes with their content: /_next/static/** (hashed by Next) and the icons of the app (kept
//     fresh by stale-while-revalidate). A response is stored only if it is a plain 200 of this origin that is not HTML and not no-store.
//   - it never stores a page: a navigation always goes to the network, and only when the network does not answer (a rejected fetch) it
//     returns the small offline page, which is built into the worker's own text and read from no cache and no network. No HTML response
//     ever enters Cache Storage, so a player always sees the page of the day.
//   - it does not touch anything else: other methods, other origins (Supabase, the image hosts, analytics), /api and /auth, ranges.
// The kill worker has no fetch handler: it deletes this worker's caches and unregisters itself.
//
// Free of next/*, Node built-ins and browser globals (it runs in a route handler and in tests).

import { PWA_KILLED_MESSAGE } from './config';
import { pwaCopy } from './copy';

import type { PwaApp } from './config';
import type { PwaLocale } from './copy';

/** The cache of the worker. Bump it only when what is stored changes in kind; the files in it never change under their address. */
export const SW_CACHE = 'kpq-static-v1';
/** Every cache this worker family owns starts with this, so the kill worker deletes those and no other. */
export const SW_CACHE_PREFIX = 'kpq-';
/** The most files kept; the oldest go first. */
export const SW_MAX_ENTRIES = 150;
/** What the kill worker tells the pages it controlled (lib/pwa/boot.ts listens). */
export const SW_KILLED_MESSAGE = PWA_KILLED_MESSAGE;

/** The root icons of the three builds (lib/site/routing.ts KPOP_ICON_FILES): the worker keeps them fresh, it does not precache them. */
export const SW_ICON_FILES: readonly string[] = [
  '/favicon.ico', '/favicon.svg', '/favicon-16x16.png', '/favicon-32x32.png', '/apple-touch-icon.png',
  '/android-chrome-192x192.png', '/android-chrome-512x512.png',
];

/** The colours of the offline page, light and dark, from the site's theme tokens. */
export interface SwTheme {
  readonly page: string;
  readonly ink: string;
  readonly muted: string;
  readonly accent: string;
  readonly onAccent: string;
  readonly pageDark: string;
  readonly inkDark: string;
  readonly mutedDark: string;
  readonly accentDark: string;
  readonly onAccentDark: string;
}

export interface SwOptions {
  readonly app: PwaApp;
  /** The name shown on the offline page: KpopQuiz or Bunnyverse. */
  readonly brand: string;
  readonly theme: SwTheme;
}

/** The base paths whose files this worker may see: the hub's worker, scoped to the whole domain, also sees OtakuQuiz under /anime. */
export function swBases(app: PwaApp): readonly string[] {
  return app === 'hub' ? ['', '/anime'] : [''];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The offline page of one locale: a whole HTML document, no script but the retry button, no request. */
export function offlineHtml(locale: PwaLocale, brand: string, theme: SwTheme): string {
  const c = pwaCopy(locale, brand);
  return [
    '<!doctype html>',
    `<html lang="${locale}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex">',
    `<title>${esc(c.offlineTitle)} | ${esc(brand)}</title>`,
    '<style>',
    `:root{color-scheme:light dark;--page:${theme.page};--ink:${theme.ink};--muted:${theme.muted};--accent:${theme.accent};--on-accent:${theme.onAccent}}`,
    `@media (prefers-color-scheme:dark){:root{--page:${theme.pageDark};--ink:${theme.inkDark};--muted:${theme.mutedDark};--accent:${theme.accentDark};--on-accent:${theme.onAccentDark}}}`,
    'html,body{height:100%;margin:0}',
    'body{display:flex;align-items:center;justify-content:center;background:var(--page);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px;box-sizing:border-box}',
    'main{max-width:360px;text-align:center}',
    'p.brand{margin:0 0 16px;font-weight:700;letter-spacing:.02em}',
    'h1{margin:0 0 8px;font-size:24px;line-height:1.25}',
    'p.body{margin:0 0 24px;color:var(--muted)}',
    'button{font:inherit;font-weight:600;border:0;border-radius:999px;padding:12px 24px;background:var(--accent);color:var(--on-accent);cursor:pointer}',
    '</style>',
    '</head>',
    '<body>',
    '<main>',
    `<p class="brand">${esc(brand)}</p>`,
    `<h1>${esc(c.offlineTitle)}</h1>`,
    `<p class="body">${esc(c.offlineBody)}</p>`,
    `<button type="button" onclick="location.reload()">${esc(c.offlineRetry)}</button>`,
    '</main>',
    '</body>',
    '</html>',
  ].join('\n');
}

// The worker body. Plain ES2017, no template literal inside (the config is the only interpolation), so the text reads as the file it serves.
const WORKER_BODY = `
var CACHE = CFG.cache;
var PREFIX = CFG.prefix;

function stripBase(path) {
  for (var i = 0; i < CFG.bases.length; i++) {
    var b = CFG.bases[i];
    if (b && (path === b || path.indexOf(b + '/') === 0)) return path.slice(b.length) || '/';
  }
  return path;
}
function isApi(path) {
  var p = stripBase(path);
  return p === '/api' || p.indexOf('/api/') === 0 || p === '/auth' || p.indexOf('/auth/') === 0;
}
function isImmutable(path) { return stripBase(path).indexOf('/_next/static/') === 0; }
function isIcon(path) { return CFG.icons.indexOf(stripBase(path)) !== -1; }
function localeOf(path) {
  var p = stripBase(path);
  return p === '/fr' || p.indexOf('/fr/') === 0 ? 'fr' : 'en';
}

// A response goes into the cache only if it is a plain 200 of this origin that is not a page and not marked no-store.
function storable(res) {
  if (!res || res.status !== 200 || res.type !== 'basic') return false;
  var type = (res.headers.get('content-type') || '').toLowerCase();
  if (type.indexOf('text/html') !== -1) return false;
  if ((res.headers.get('cache-control') || '').toLowerCase().indexOf('no-store') !== -1) return false;
  return true;
}

async function put(cache, request, response) {
  try {
    await cache.put(request, response);
    var keys = await cache.keys();
    for (var i = 0; i < keys.length - CFG.max; i++) await cache.delete(keys[i]);
  } catch (e) { /* a full or refused cache: the file is served from the network anyway */ }
}

async function cacheFirst(event) {
  var cache = null;
  try {
    cache = await caches.open(CACHE);
    var hit = await cache.match(event.request);
    if (hit) return hit;
  } catch (e) { cache = null; }
  var res = await fetch(event.request);
  if (cache && storable(res)) event.waitUntil(put(cache, event.request, res.clone()));
  return res;
}

async function staleWhileRevalidate(event) {
  var cache = null;
  var hit = null;
  try {
    cache = await caches.open(CACHE);
    hit = await cache.match(event.request);
  } catch (e) { cache = null; }
  var fresh = fetch(event.request).then(function (res) {
    if (cache && storable(res)) return put(cache, event.request, res.clone()).then(function () { return res; });
    return res;
  });
  if (hit) {
    event.waitUntil(fresh.catch(function () { /* offline: the stored icon stays */ }));
    return hit;
  }
  return fresh;
}

function offlinePage(url) {
  var html = CFG.offline[localeOf(url.pathname)] || CFG.offline.en;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

// A page is always the network's. Only a request that gets no answer at all returns the offline page; an HTTP error is the site's own.
async function navigation(event, url) {
  try {
    var early = event.preloadResponse ? await event.preloadResponse : undefined;
    return early || await fetch(event.request);
  } catch (e) {
    return offlinePage(url);
  }
}

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      var names = await caches.keys();
      await Promise.all(names.filter(function (n) { return n.indexOf(PREFIX) === 0 && n !== CACHE; }).map(function (n) { return caches.delete(n); }));
    } catch (e) { /* nothing to clean */ }
    try {
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    } catch (e) { /* no preload: navigations go straight to fetch */ }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
  if (req.headers.has('range')) return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isApi(url.pathname)) return;
  if (req.mode === 'navigate') { event.respondWith(navigation(event, url)); return; }
  if (isImmutable(url.pathname)) { event.respondWith(cacheFirst(event)); return; }
  if (isIcon(url.pathname)) { event.respondWith(staleWhileRevalidate(event)); return; }
});
`;

const KILL_BODY = `
// The kill switch (NET_PWA_KILL): no fetch handler, so every request goes to the network; delete what the worker stored, tell the open
// pages, and unregister. Pages are left as they are: nothing here reloads a quiz in progress.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      var names = await caches.keys();
      await Promise.all(names.filter(function (n) { return n.indexOf(PREFIX) === 0; }).map(function (n) { return caches.delete(n); }));
    } catch (e) { /* nothing stored */ }
    try {
      var open = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      open.forEach(function (c) { c.postMessage({ kq: KILLED }); });
    } catch (e) { /* no page to tell */ }
    try { await self.registration.unregister(); } catch (e) { /* already gone */ }
  })());
});
`;

/** The real worker for an app. The same options give the same bytes, so a deploy that changes nothing gives browsers no new worker. */
export function serviceWorkerSource(opts: SwOptions): string {
  const cfg = {
    app: opts.app,
    cache: SW_CACHE,
    prefix: SW_CACHE_PREFIX,
    max: SW_MAX_ENTRIES,
    bases: swBases(opts.app),
    icons: SW_ICON_FILES,
    offline: { en: offlineHtml('en', opts.brand, opts.theme), fr: offlineHtml('fr', opts.brand, opts.theme) },
  };
  return `// ${opts.brand} service worker (PWA plan, section 3): static files only, never a page, never an API answer.\n'use strict';\nvar CFG = ${JSON.stringify(cfg)};\n${WORKER_BODY}`;
}

/** The worker that retires every worker of this family (NET_PWA_KILL). */
export function killSwitchSource(): string {
  return `// Service worker kill switch: deletes the caches of the PWA worker and unregisters itself.\n'use strict';\nvar PREFIX = ${JSON.stringify(SW_CACHE_PREFIX)};\nvar KILLED = ${JSON.stringify(SW_KILLED_MESSAGE)};\n${KILL_BODY}`;
}
