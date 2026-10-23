import { describe, expect, it } from 'vitest';

import { runKeyCheck, runReconcile } from './indexnow-reconcile';
import { memoryStore } from './indexnow-test-fixtures';

import type { PageFetch } from './indexnow-reconcile';

// SEO Mission 3 (part A, points 6 to 8): the nightly reconciliation, the post-deploy diff and
// the key file check, on a fake site. No network.

const O = 'https://kpopquiz.org';

function html(title: string, body: string, opts: { robots?: string; canonical?: string; plays?: number } = {}): string {
  return `<html><head><title>${title}</title><meta name="description" content="${title} description"/>${opts.robots ? `<meta name="robots" content="${opts.robots}"/>` : ''}${opts.canonical ? `<link rel="canonical" href="${opts.canonical}"/>` : ''}</head><body><main><h1>${title}</h1><p>${body}</p><p>${opts.plays ?? 10} plays</p></main></body></html>`;
}

function site(pages: Record<string, PageFetch | (() => PageFetch)>): (url: string) => Promise<PageFetch> {
  return async (url) => {
    const p = pages[url];
    if (!p) return { status: 404, html: '', xRobots: '' };
    return typeof p === 'function' ? p() : p;
  };
}

const ok = (title: string, body: string, opts?: Parameters<typeof html>[2]): PageFetch => ({ status: 200, html: html(title, body, opts), xRobots: '' });

describe('nightly reconciliation', () => {
  it('first run: every indexable sitemap URL is new; a noindex one is recorded, not sent', async () => {
    const store = memoryStore();
    const r = await runReconcile(store, {
      scope: 'all', kind: 'reconcile', now: store.clock.now,
      fetchSitemap: async () => [`${O}/`, `${O}/about`, `${O}/q/a`, `${O}/search`],
      fetchPage: site({ [`${O}/`]: ok('Home', 'hello'), [`${O}/about`]: ok('About', 'who'), [`${O}/q/a`]: ok('Quiz A', 'questions'), [`${O}/search`]: ok('Search', 'x', { robots: 'noindex' }) }),
    });
    expect(r).toMatchObject({ ok: true, sitemapUrls: 4, checked: 4, notIndexable: 1, enqueued: { new: 3, changed: 0, removed: 0 } });
    expect(store.rows.map((x) => [x.url, x.reason]).sort()).toEqual([[`${O}/`, 'reconcile:new'], [`${O}/about`, 'reconcile:new'], [`${O}/q/a`, 'reconcile:new']]);
    expect(store.stateRows.get(`${O}/q/a`)).toMatchObject({ indexable: true, in_sitemap: true, scope: 'data', http_status: 200 });
    expect(store.stateRows.get(`${O}/about`)?.scope).toBe('code');
    expect(store.eventRows.at(-1)?.kind).toBe('reconcile');
  });

  it('next night: a counter that moved sends nothing, a real edit sends the page', async () => {
    const store = memoryStore();
    const sitemap = async (): Promise<string[]> => [`${O}/q/a`, `${O}/q/b`];
    await runReconcile(store, { scope: 'all', kind: 'reconcile', fetchSitemap: sitemap, fetchPage: site({ [`${O}/q/a`]: ok('Quiz A', 'q1', { plays: 10 }), [`${O}/q/b`]: ok('Quiz B', 'q1') }) });
    store.clearOutbox();
    const r = await runReconcile(store, { scope: 'all', kind: 'reconcile', fetchSitemap: sitemap, fetchPage: site({ [`${O}/q/a`]: ok('Quiz A', 'q1', { plays: 999 }), [`${O}/q/b`]: ok('Quiz B', 'q1 edited') }) });
    expect(r.enqueued).toEqual({ new: 0, changed: 1, removed: 0 });
    expect(store.rows.map((x) => [x.url, x.reason])).toEqual([[`${O}/q/b`, 'reconcile:changed']]);
  });

  it('a URL that left the sitemap is sent as removed only when the page confirms it (404, noindex, canonical elsewhere)', async () => {
    const store = memoryStore();
    const all = [`${O}/q/gone`, `${O}/q/kept`, `${O}/q/moved`, `${O}/q/x`];
    await runReconcile(store, { scope: 'all', kind: 'reconcile', fetchSitemap: async () => all, fetchPage: site(Object.fromEntries(all.map((u) => [u, ok(u, 'body', { canonical: u })]))) });
    store.clearOutbox();
    const r = await runReconcile(store, {
      scope: 'all', kind: 'reconcile', fetchSitemap: async () => [`${O}/q/x`],
      fetchPage: site({ [`${O}/q/x`]: ok(`${O}/q/x`, 'body', { canonical: `${O}/q/x` }), [`${O}/q/kept`]: ok(`${O}/q/kept`, 'body', { canonical: `${O}/q/kept` }), [`${O}/q/moved`]: ok('moved', 'body', { canonical: `${O}/q/x` }) }),
    });
    expect(r.removalsSkipped).toBe(false);
    expect(store.rows.map((x) => x.url).sort()).toEqual([`${O}/q/gone`, `${O}/q/moved`]);
    expect(store.rows.every((x) => x.reason === 'reconcile:removed')).toBe(true);
    expect(store.stateRows.get(`${O}/q/kept`)).toMatchObject({ in_sitemap: false, indexable: true });
    expect(store.stateRows.get(`${O}/q/gone`)).toMatchObject({ in_sitemap: false, indexable: false, http_status: 404 });
  });

  it('a sitemap that comes back short (database blip) never turns into mass removals', async () => {
    const store = memoryStore();
    const many = Array.from({ length: 100 }, (_, i) => `${O}/q/quiz-${i}`);
    await runReconcile(store, { scope: 'all', kind: 'reconcile', fetchSitemap: async () => many, fetchPage: site(Object.fromEntries(many.map((u) => [u, ok(u, 'b')]))) });
    store.clearOutbox();
    const r = await runReconcile(store, { scope: 'all', kind: 'reconcile', fetchSitemap: async () => many.slice(0, 10), fetchPage: site({}) });
    expect(r.removalsSkipped).toBe(true);
    expect(r.enqueued.removed).toBe(0);
    expect(store.eventRows.some((e) => e.kind === 'alert' && e.detail?.reason === 'sitemap_shrank')).toBe(true);
  });

  it('a failed fetch changes nothing and sends nothing; an unreadable sitemap is an alert', async () => {
    const store = memoryStore();
    await runReconcile(store, { scope: 'all', kind: 'reconcile', fetchSitemap: async () => [`${O}/about`], fetchPage: site({ [`${O}/about`]: ok('About', 'v1') }) });
    const before = store.stateRows.get(`${O}/about`)!.hash;
    store.clearOutbox();
    const r = await runReconcile(store, { scope: 'all', kind: 'reconcile', fetchSitemap: async () => [`${O}/about`], fetchPage: async () => ({ status: 0, html: '', xRobots: '' }) });
    expect(r).toMatchObject({ fetchErrors: 1, enqueued: { new: 0, changed: 0, removed: 0 } });
    expect(store.stateRows.get(`${O}/about`)!.hash).toBe(before);
    const bad = await runReconcile(store, { scope: 'all', kind: 'reconcile', fetchSitemap: async () => null });
    expect(bad).toMatchObject({ ok: false, error: 'sitemap_unreadable' });
  });

  it('a run over its time budget carries the rest to the next run, oldest checks first', async () => {
    const store = memoryStore();
    const urls = [`${O}/a`, `${O}/b`];
    const r = await runReconcile(store, { scope: 'all', kind: 'reconcile', budgetMs: 0, fetchSitemap: async () => urls, fetchPage: site({}) });
    expect(r).toMatchObject({ checked: 0, carriedOver: 2 });
  });
});

describe('post-deploy diff', () => {
  it('checks the pages defined in the code only, and enqueues them as deploy changes', async () => {
    const store = memoryStore();
    const sitemap = async (): Promise<string[]> => [`${O}/articles/gen`, `${O}/q/a`, `${O}/bts-quiz`];
    const seen: string[] = [];
    const fetchPage = async (url: string): Promise<PageFetch> => { seen.push(url); return ok(url, 'v1'); };
    await runReconcile(store, { scope: 'code', kind: 'deploy_diff', fetchSitemap: sitemap, fetchPage });
    expect(seen).toEqual([`${O}/articles/gen`]);
    store.clearOutbox();
    const r = await runReconcile(store, { scope: 'code', kind: 'deploy_diff', fetchSitemap: sitemap, fetchPage: async (u) => ok(u, 'v2 new paragraph') });
    expect(r.enqueued.changed).toBe(1);
    expect(store.rows.map((x) => [x.url, x.reason])).toEqual([[`${O}/articles/gen`, 'deploy:changed']]);
    expect(store.eventRows.at(-1)?.kind).toBe('deploy_diff');
  });
});

describe('key file check', () => {
  const KEY_URL = `${O}/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt`;
  it('records a keycheck row when the file is right, an alert when it is not', async () => {
    const store = memoryStore();
    const good = await runKeyCheck(store, async (url) => ({ status: url === KEY_URL ? 200 : 404, html: '4b2f9a7ce8d1465fb0a3e6c95d47128a\n', xRobots: '', contentType: 'text/plain; charset=utf-8' }));
    expect(good.ok).toBe(true);
    expect(store.eventRows.at(-1)).toMatchObject({ kind: 'keycheck', status_code: 200 });
    const bad = await runKeyCheck(store, async () => ({ status: 200, html: '<html>soft 404</html>', xRobots: '', contentType: 'text/html' }));
    expect(bad.ok).toBe(false);
    expect(store.eventRows.at(-1)).toMatchObject({ kind: 'alert', detail: { reason: 'key_file' } });
  });
});
