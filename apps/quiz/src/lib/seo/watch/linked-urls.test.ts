import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { mergeLists, runLinkedGuard } from './linked-guard';
import { LINKED_URLS } from './linked-urls';
import { assessOk, assessRedirect, sitePath } from './page-check';

import type { GuardDeps } from './linked-guard';
import type { LinkedUrl } from './linked-urls';
import type { FetchedPage } from './page-check';

const page = (over: Partial<FetchedPage> = {}, path = '/bts-quiz'): FetchedPage => ({
  status: 200,
  location: null,
  xRobots: '',
  html: `<html><head><meta name="robots" content="index, follow"><link rel="canonical" href="https://kpopquiz.org${path}"></head></html>`,
  ...over,
});

describe('assessOk: 200, indexable, canonical to itself', () => {
  it('passes a healthy page, including the home page', () => {
    expect(assessOk('/bts-quiz', page())).toBeNull();
    expect(assessOk('/', page({ html: '<link rel="canonical" href="https://kpopquiz.org">' }))).toBeNull();
  });

  it('names each failure', () => {
    expect(assessOk('/bts-quiz', null)).toMatch(/no response/);
    expect(assessOk('/bts-quiz', page({ status: 404 }))).toBe('HTTP 404 (expected 200)');
    expect(assessOk('/bts-quiz', page({ status: 301, location: '/' }))).toBe('HTTP 301 to / (expected 200)');
    expect(assessOk('/bts-quiz', page({ xRobots: 'noindex' }))).toBe('noindex in X-Robots-Tag');
    expect(assessOk('/bts-quiz', page({ html: '<meta name="robots" content="noindex, follow"><link rel="canonical" href="/bts-quiz">' }))).toBe('noindex in meta robots');
    expect(assessOk('/bts-quiz', page({ html: '<title>x</title>' }))).toBe('no canonical');
    expect(assessOk('/bts-quiz', page({}, '/quizzes'))).toBe('canonical points to /quizzes (not itself)');
  });
});

describe('assessRedirect: one permanent hop to the exact successor', () => {
  it('accepts 301 and 308 to the exact target, absolute or relative', () => {
    expect(assessRedirect('/cortis-quiz', page({ status: 308, location: 'https://kpopquiz.org/cortis-quiz' }))).toBeNull();
    expect(assessRedirect('/q/illit-quiz', page({ status: 301, location: '/q/illit-quiz' }))).toBeNull();
  });

  it('refuses a temporary redirect, a generic target, a 200 and a 404', () => {
    expect(assessRedirect('/cortis-quiz', page({ status: 302, location: '/cortis-quiz' }))).toMatch(/HTTP 302/);
    expect(assessRedirect('/aespa-name-all-members', page({ status: 301, location: '/quizzes' }))).toMatch(/redirects to \/quizzes/);
    expect(assessRedirect('/cortis-quiz', page())).toMatch(/HTTP 200/);
    expect(assessRedirect('/cortis-quiz', page({ status: 404 }))).toMatch(/HTTP 404/);
  });

  it('sitePath keeps the query and drops other hosts', () => {
    expect(sitePath('https://kpopquiz.org/battle?quiz=illit-quiz')).toBe('/battle?quiz=illit-quiz');
    expect(sitePath('https://kpopquiz.org/bts-quiz/')).toBe('/bts-quiz');
    expect(sitePath('https://example.com/bts-quiz')).toBeNull();
  });
});

describe('the versioned list', () => {
  it('every path is unique, root-relative, with its evidence', () => {
    const paths = LINKED_URLS.map((u) => u.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const u of LINKED_URLS) {
      expect(u.path.startsWith('/'), u.path).toBe(true);
      expect(u.note.length, u.path).toBeGreaterThan(10);
      if (u.expect.kind === 'redirect') expect(u.expect.to.startsWith('/'), u.path).toBe(true);
    }
  });

  it('the gsc entries are exactly the pages with 20+ clicks in the committed Search Console export', () => {
    const csv = readFileSync(fileURLToPath(new URL('../../../../../../docs/refonte/gsc/Pages.csv', import.meta.url)), 'utf8');
    const fromExport = csv.split('\n').slice(1).filter(Boolean)
      .map((line) => line.split(','))
      .filter((cols) => Number(cols[1]) >= 20)
      .map((cols) => sitePath(cols[0]!)!)
      .sort();
    const listed = LINKED_URLS.filter((u) => u.evidence === 'gsc').map((u) => u.path).sort();
    expect(listed).toEqual(fromExport);
    expect(listed.length).toBeGreaterThan(0);
  });

  it('a redirect entry never points at the home page or a generic list (rulebook 9.4)', () => {
    for (const u of LINKED_URLS) if (u.expect.kind === 'redirect') expect(['/', '/quizzes', '/groups']).not.toContain(u.expect.to);
  });
});

function guardDeps(pages: Record<string, Array<FetchedPage | null>>, extra: LinkedUrl[] | 'not_applied' = []): GuardDeps & { fetched: string[] } {
  const fetched: string[] = [];
  const queues = new Map(Object.entries(pages).map(([k, v]) => [k, [...v]]));
  return {
    fetched,
    fetchPage: async (url) => {
      fetched.push(url);
      const q = queues.get(url.replace('https://kpopquiz.org', ''));
      if (!q || q.length === 0) return null;
      return q.length > 1 ? q.shift()! : q[0]!;
    },
    extraUrls: async () => extra,
    alert: vi.fn(async () => 'sent' as const),
    logRun: vi.fn(async () => undefined),
    sleep: async () => undefined,
  };
}

const BASE: LinkedUrl[] = [
  { path: '/bts-quiz', expect: { kind: 'ok' }, evidence: 'gsc', note: 'test entry, gsc' },
  { path: '/coer-quiz', expect: { kind: 'redirect', to: '/cortis-quiz' }, evidence: 'fandom', note: 'test entry, fandom' },
];

describe('runLinkedGuard', () => {
  it('all good: no alert, no log', async () => {
    const d = guardDeps({
      '/bts-quiz': [page()],
      '/coer-quiz': [page({ status: 308, location: '/cortis-quiz' })],
      '/cortis-quiz': [page({}, '/cortis-quiz')],
    });
    const r = await runLinkedGuard(d, { dryRun: false, base: BASE });
    expect(r).toMatchObject({ ok: true, checked: 2, failures: [], alert: 'none' });
    expect(d.alert).not.toHaveBeenCalled();
  });

  it('a 404 and a redirect whose target 404s: one alert naming both, one run logged', async () => {
    const d = guardDeps({
      '/bts-quiz': [page({ status: 404 })],
      '/coer-quiz': [page({ status: 301, location: '/cortis-quiz' })],
      '/cortis-quiz': [page({ status: 404 })],
    });
    const r = await runLinkedGuard(d, { dryRun: false, base: BASE });
    expect(r.failures).toEqual([
      { path: '/bts-quiz', reason: 'HTTP 404 (expected 200)' },
      { path: '/coer-quiz', reason: 'redirect target /cortis-quiz: HTTP 404 (expected 200)' },
    ]);
    expect(d.alert).toHaveBeenCalledTimes(1);
    expect((d.alert as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toContain('2 of 2 linked URLs failing');
    expect(d.logRun).toHaveBeenCalledTimes(1);
  });

  it('a transient 503 is retried once before it counts', async () => {
    const d = guardDeps({ '/bts-quiz': [page({ status: 503 }), page()] });
    const r = await runLinkedGuard(d, { dryRun: false, base: [BASE[0]!] });
    expect(r.ok).toBe(true);
    expect(d.fetched).toHaveLength(2);
  });

  it('dry run: reports the failure, alerts and logs nothing', async () => {
    const d = guardDeps({ '/bts-quiz': [page({ status: 404 })] });
    const r = await runLinkedGuard(d, { dryRun: true, base: [BASE[0]!] });
    expect(r.alert).toBe('dry_run');
    expect(d.alert).not.toHaveBeenCalled();
    expect(d.logRun).not.toHaveBeenCalled();
  });

  it('rows of seo_linked_urls are checked too, without duplicates; a missing table is reported', async () => {
    const extra: LinkedUrl[] = [
      { path: '/bts-quiz/', expect: { kind: 'ok' }, evidence: 'link-data', note: 'dup' },
      { path: '/illit-quiz', expect: { kind: 'ok' }, evidence: 'link-data', note: 'new' },
    ];
    expect(mergeLists(BASE, extra).map((u) => u.path)).toEqual(['/bts-quiz', '/coer-quiz', '/illit-quiz']);
    const d = guardDeps({ '/bts-quiz': [page()] }, 'not_applied');
    const r = await runLinkedGuard(d, { dryRun: true, base: [BASE[0]!] });
    expect(r.fromTable).toBe('not_applied');
    expect(r.checked).toBe(1);
  });
});
