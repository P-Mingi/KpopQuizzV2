import { describe, expect, it } from 'vitest';

import {
  backoffState, checkKeyFile, chunk, classifyStatus, coverage, diffObservation, MAX_ATTEMPTS, nextBackoff, normalizeUrl,
  parseRetryAfter, planFlush, sitemapLooksTruncated, urlScope,
} from './indexnow-plan';

import type { OutboxRow, StateRow } from './indexnow-plan';

// SEO Mission 3 (CONTROLES): dedupe, batches, the 429 back-off, and the reconciliation rules.

const NOW = new Date('2026-10-15T10:00:00Z');
const at = (minutesAgo: number): string => new Date(NOW.getTime() - minutesAgo * 60000).toISOString();
const row = (id: number, url: string, enqMinAgo: number, extra: Partial<OutboxRow> = {}): OutboxRow => ({
  id, url, reason: 'test', enqueued_at: at(enqMinAgo), last_enqueued_at: at(enqMinAgo), attempts: 0, ...extra,
});

describe('URLs', () => {
  it('one spelling per URL: origin + path, no trailing slash, no query, www folded; other hosts refused', () => {
    expect(normalizeUrl('/q/bts-era-quiz')).toBe('https://kpopquiz.org/q/bts-era-quiz');
    expect(normalizeUrl('https://www.kpopquiz.org/bts-quiz/?x=1#top')).toBe('https://kpopquiz.org/bts-quiz');
    expect(normalizeUrl('https://kpopquiz.org')).toBe('https://kpopquiz.org/');
    expect(normalizeUrl('https://example.com/q/x')).toBeNull();
    expect(normalizeUrl('')).toBeNull();
  });

  it('code pages versus data pages', () => {
    for (const p of ['/q/x', '/bts-quiz', '/bts-trivia', '/blindtest/group-bts', '/data/pulse/2026-09', '/which-bts-member-are-you', '/bts-name-all-members', '/verse', '/u/mina']) {
      expect(urlScope(p), p).toBe('data');
    }
    for (const p of ['/', '/articles/kpop-generations-explained', '/about', '/blindtest/classic', '/fr/blind-test-kpop', '/pt/quizzes', '/data/pulse', '/kpop-demon-hunters-quiz', '/new']) {
      expect(urlScope(p), p).toBe('code');
    }
  });
});

describe('batches', () => {
  it('slices of at most 10,000 URLs, the IndexNow limit', () => {
    const urls = Array.from({ length: 25001 }, (_, i) => `u${i}`);
    expect(chunk(urls).map((c) => c.length)).toEqual([10000, 10000, 5001]);
    expect(chunk([], 3)).toEqual([]);
    expect(() => chunk([1], 0)).toThrow();
  });
});

describe('flush plan', () => {
  it('dedupes by URL: two pending rows of one URL send it once and settle both', () => {
    const plan = planFlush([row(1, 'https://kpopquiz.org/new', 30), row(2, 'https://kpopquiz.org/new/', 10), row(3, 'https://kpopquiz.org/q/a', 20)], new Map(), NOW);
    expect(plan.send).toEqual([{ url: 'https://kpopquiz.org/new', ids: [1, 2] }, { url: 'https://kpopquiz.org/q/a', ids: [3] }]);
  });

  it('a URL submitted after its last enqueue is covered; one submitted under 5 minutes ago and changed since waits', () => {
    const last = new Map<string, string | null>([
      ['https://kpopquiz.org/q/covered', at(1)],
      ['https://kpopquiz.org/q/recent', at(3)],
      ['https://kpopquiz.org/q/old', at(60)],
    ]);
    const plan = planFlush([
      row(1, 'https://kpopquiz.org/q/covered', 10),
      row(2, 'https://kpopquiz.org/q/recent', 2),
      row(3, 'https://kpopquiz.org/q/old', 30),
    ], last, NOW);
    expect(plan.covered).toEqual([1]);
    expect(plan.deferred).toEqual([2]);
    expect(plan.send.map((s) => s.url)).toEqual(['https://kpopquiz.org/q/old']);
    // five minutes later the deferred one goes
    const later = planFlush([row(2, 'https://kpopquiz.org/q/recent', 2)], last, new Date(NOW.getTime() + 3 * 60000));
    expect(later.send.map((s) => s.ids)).toEqual([[2]]);
  });

  it('a row that failed 24 times is given up', () => {
    const plan = planFlush([row(1, 'https://kpopquiz.org/q/x', 600, { attempts: MAX_ATTEMPTS })], new Map(), NOW);
    expect(plan.gaveUp).toEqual([1]);
    expect(plan.send).toEqual([]);
  });
});

describe('IndexNow answers and the 429 back-off', () => {
  it('classifies the answers', () => {
    expect([200, 202, 429, 400, 403, 422, 500, 0].map(classifyStatus)).toEqual(['ok', 'ok', 'backoff', 'alert', 'alert', 'alert', 'retry', 'retry']);
  });

  it('waits 1 h, then doubles on each 429 in a row, capped at 24 h, never shorter than Retry-After', () => {
    const h = (n: number): number => NOW.getTime() + n * 3600000;
    expect(nextBackoff(1, null, NOW).until.getTime()).toBe(h(1));
    expect(nextBackoff(2, null, NOW).until.getTime()).toBe(h(2));
    expect(nextBackoff(4, null, NOW).until.getTime()).toBe(h(8));
    expect(nextBackoff(10, null, NOW).until.getTime()).toBe(h(24));
    expect(nextBackoff(1, '7200', NOW).until.getTime()).toBe(h(2));
    expect(nextBackoff(1, new Date(h(3)).toUTCString(), NOW).until.getTime()).toBe(h(3));
    expect(nextBackoff(1, '999999', NOW).until.getTime()).toBe(h(24));
    expect(parseRetryAfter('soon', NOW)).toBeNull();
  });

  it('the back-off holds until its time, and a flush IndexNow accepted resets the count', () => {
    const backoff = { kind: 'backoff', created_at: at(30), detail: { until: new Date(NOW.getTime() + 30 * 60000).toISOString(), consecutive: 2 } };
    expect(backoffState([backoff], NOW)).toMatchObject({ active: true, consecutive: 2 });
    expect(backoffState([backoff], new Date(NOW.getTime() + 31 * 60000))).toMatchObject({ active: false, consecutive: 2 });
    const okFlush = { kind: 'flush', created_at: at(10), detail: { ok: true, sent: 3 } };
    expect(backoffState([backoff, okFlush], NOW)).toEqual({ active: false, until: null, consecutive: 0 });
    const dryFlush = { kind: 'flush', created_at: at(10), detail: { dryRun: true, wouldSend: 3 } };
    expect(backoffState([backoff, dryFlush], NOW).active).toBe(true);
    expect(backoffState([], NOW)).toEqual({ active: false, until: null, consecutive: 0 });
  });
});

describe('reconciliation rules', () => {
  const state = (over: Partial<StateRow>): StateRow => ({
    url: 'https://kpopquiz.org/x', hash: 'h1', indexable: true, in_sitemap: true, last_submitted_at: null, last_checked_at: at(1440), last_changed_at: null, http_status: 200, scope: 'code', ...over,
  });
  const obs = (status: number, hash: string | null, indexable: boolean) => ({ url: 'https://kpopquiz.org/x', status, hash, indexable });

  it('new, changed, unchanged, removed by indexability, and a failed fetch that changes nothing', () => {
    expect(diffObservation(undefined, obs(200, 'h1', true))).toBe('new');
    expect(diffObservation(undefined, obs(200, 'h1', false))).toBeNull(); // a noindex page in the sitemap is not sent
    expect(diffObservation(state({ hash: null, indexable: null, last_submitted_at: at(5) }), obs(200, 'h1', true))).toBeNull(); // the fast path already sent it
    expect(diffObservation(state({}), obs(200, 'h1', true))).toBeNull();
    expect(diffObservation(state({}), obs(200, 'h2', true))).toBe('changed');
    expect(diffObservation(state({}), obs(404, null, false))).toBe('changed');
    expect(diffObservation(state({ hash: null, indexable: false, http_status: 404 }), obs(404, null, false))).toBeNull();
    expect(diffObservation(state({}), obs(0, null, false))).toBeNull();
    expect(diffObservation(state({}), obs(503, null, false))).toBeNull();
  });

  it('a sitemap that loses many URLs at once is treated as truncated', () => {
    expect(sitemapLooksTruncated(736, 600)).toBe(true);
    expect(sitemapLooksTruncated(736, 3)).toBe(false);
    expect(sitemapLooksTruncated(100, 15)).toBe(false);
  });

  it('coverage is the share of sitemap URLs IndexNow accepted at least once', () => {
    expect(coverage([
      { in_sitemap: true, last_submitted_at: at(1) }, { in_sitemap: true, last_submitted_at: null },
      { in_sitemap: true, last_submitted_at: at(2) }, { in_sitemap: false, last_submitted_at: at(3) },
    ])).toEqual({ inSitemap: 3, submitted: 2, pct: 66.6 });
    expect(coverage([]).pct).toBe(0);
  });
});

describe('key file check', () => {
  const KEY = '4b2f9a7ce8d1465fb0a3e6c95d47128a';
  it('200, text/plain, body equal to the key', () => {
    expect(checkKeyFile(200, 'text/plain; charset=utf-8', `${KEY}\n`, KEY)).toEqual({ ok: true, problems: [] });
    expect(checkKeyFile(404, 'text/html', '<html>', KEY).problems).toHaveLength(3);
    expect(checkKeyFile(200, 'text/html', KEY, KEY).ok).toBe(false);
    expect(checkKeyFile(200, 'text/plain', 'other', KEY).ok).toBe(false);
  });
});
