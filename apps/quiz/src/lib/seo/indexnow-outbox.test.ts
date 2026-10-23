import { afterEach, describe, expect, it, vi } from 'vitest';

import { pingIndexNow, postIndexNowBatch } from '@/lib/indexnow';

import { flushOutbox, getIndexNowStore, submitFastPath } from './indexnow-outbox';
import { memoryStore } from './indexnow-test-fixtures';

import type { PingResult } from '@/lib/indexnow';

// SEO Mission 3 (CONTROLES): the hourly flush (dedupe, the 5-minute rule, batches of 10,000,
// the 429 back-off, alerts, dry run), the publish fast path, and the dry-run switch. No test
// reaches api.indexnow.org: every send goes through an injected fake.

afterEach(() => { vi.unstubAllEnvs(); });

const okPost = (): { post: (urls: string[]) => Promise<{ status: number; retryAfter: string | null }>; sent: string[][] } => {
  const sent: string[][] = [];
  return { sent, post: async (urls) => { sent.push(urls); return { status: 200, retryAfter: null }; } };
};

describe('flush', () => {
  it('sends the pending URLs once, marks them submitted and records the run', async () => {
    const store = memoryStore();
    await store.enqueue(['/q/a', '/bts-quiz', '/new'], 'quiz:published');
    await store.enqueue(['/new'], 'quiz:published'); // same pending row
    const { post, sent } = okPost();
    const r = await flushOutbox(store, { post, dryRun: false, now: store.clock.now });
    expect(sent).toEqual([['https://kpopquiz.org/q/a', 'https://kpopquiz.org/bts-quiz', 'https://kpopquiz.org/new']]);
    expect(r).toMatchObject({ ok: true, sent: 3, batches: 1, statuses: [200] });
    expect(store.rows.every((x) => x.outcome === 'submitted' && x.attempts === 1)).toBe(true);
    expect(store.stateRows.get('https://kpopquiz.org/new')?.last_submitted_at).toBeTruthy();
    expect(store.eventRows.at(-1)).toMatchObject({ kind: 'flush', detail: { ok: true, sent: 3 } });
    // nothing left: the next run sends nothing
    const again = await flushOutbox(store, { post, dryRun: false, now: store.clock.now });
    expect(again.sent).toBe(0);
    expect(sent).toHaveLength(1);
  });

  it('batches of at most 10,000 URLs', async () => {
    const store = memoryStore();
    await store.enqueue(Array.from({ length: 25000 }, (_, i) => `/q/quiz-${i}`), 'bulk');
    const { post, sent } = okPost();
    const r = await flushOutbox(store, { post, dryRun: false, maxUrls: 30000, now: store.clock.now });
    expect(sent.map((b) => b.length)).toEqual([10000, 10000, 5000]);
    expect(r.sent).toBe(25000);
    // the default cap is two batches a run; the rest waits for the next hour
    const store2 = memoryStore();
    await store2.enqueue(Array.from({ length: 25000 }, (_, i) => `/q/quiz-${i}`), 'bulk');
    const two = okPost();
    await flushOutbox(store2, { post: two.post, dryRun: false, now: store2.clock.now });
    expect(two.sent.map((b) => b.length)).toEqual([10000, 10000]);
    expect(store2.rows.filter((x) => x.outcome === null)).toHaveLength(5000);
  });

  it('a URL IndexNow accepted less than 5 minutes ago and changed since waits for the next run', async () => {
    const store = memoryStore();
    store.stateRows.set('https://kpopquiz.org/q/a', { url: 'https://kpopquiz.org/q/a', hash: null, indexable: null, in_sitemap: true, last_submitted_at: new Date(store.clock.now.getTime() - 2 * 60000).toISOString(), last_checked_at: null, last_changed_at: null, http_status: null, scope: 'data' });
    await store.enqueue(['/q/a', '/q/b'], 'quiz:edited');
    const { post, sent } = okPost();
    const r = await flushOutbox(store, { post, dryRun: false, now: store.clock.now });
    expect(sent).toEqual([['https://kpopquiz.org/q/b']]);
    expect(r.deferred).toBe(1);
    expect(store.rows.find((x) => x.url.endsWith('/q/a'))?.outcome).toBeNull();
  });

  it('429: stops, records the back-off, sends nothing until it ends, then doubles on the next 429', async () => {
    const store = memoryStore();
    await store.enqueue(['/q/a'], 'quiz:published');
    const calls: string[][] = [];
    const busy = async (urls: string[]): Promise<{ status: number; retryAfter: string | null }> => { calls.push(urls); return { status: 429, retryAfter: null }; };
    const first = await flushOutbox(store, { post: busy, dryRun: false, now: store.clock.now });
    expect(first).toMatchObject({ ok: false, stoppedOn: 429, sent: 0 });
    expect(first.backoffUntil).toBe(new Date(store.clock.now.getTime() + 3600000).toISOString());
    expect(store.rows[0]).toMatchObject({ outcome: null, attempts: 1, status_code: 429 });

    // 30 minutes later: still waiting, nothing is posted
    store.clock.now = new Date(store.clock.now.getTime() + 30 * 60000);
    const waiting = await flushOutbox(store, { post: busy, dryRun: false, now: store.clock.now });
    expect(waiting).toMatchObject({ skipped: 'backoff', sent: 0 });
    expect(calls).toHaveLength(1);

    // after the wait, another 429: two hours this time
    store.clock.now = new Date(store.clock.now.getTime() + 31 * 60000);
    const second = await flushOutbox(store, { post: busy, dryRun: false, now: store.clock.now });
    expect(second.backoffUntil).toBe(new Date(store.clock.now.getTime() + 2 * 3600000).toISOString());
    expect(calls).toHaveLength(2);

    // after that wait, IndexNow accepts: the row is submitted and the count resets
    store.clock.now = new Date(store.clock.now.getTime() + 2 * 3600000 + 1000);
    const { post } = okPost();
    const third = await flushOutbox(store, { post, dryRun: false, now: store.clock.now });
    expect(third).toMatchObject({ ok: true, sent: 1 });
    expect(store.rows[0]).toMatchObject({ outcome: 'submitted', attempts: 3 });
  });

  it('403 or 422: an alert row, the run stops, the rows stay pending', async () => {
    for (const status of [403, 422]) {
      const store = memoryStore();
      await store.enqueue(['/q/a'], 'quiz:published');
      const r = await flushOutbox(store, { post: async () => ({ status, retryAfter: null }), dryRun: false, now: store.clock.now });
      expect(r).toMatchObject({ ok: false, stoppedOn: status });
      expect(store.eventRows.find((e) => e.kind === 'alert')).toMatchObject({ status_code: status, detail: { reason: `indexnow_${status}` } });
      expect(store.rows[0]!.outcome).toBeNull();
    }
  });

  it('dry run: plans and records, posts nothing, changes no row', async () => {
    const store = memoryStore();
    await store.enqueue(['/q/a', '/new'], 'quiz:published');
    const post = vi.fn();
    const r = await flushOutbox(store, { post, dryRun: true, now: store.clock.now });
    expect(post).not.toHaveBeenCalled();
    expect(r).toMatchObject({ dryRun: true, sent: 0, batches: 1 });
    expect(store.rows.every((x) => x.outcome === null && x.attempts === 0)).toBe(true);
    expect(store.eventRows.at(-1)).toMatchObject({ kind: 'flush', detail: { dryRun: true, wouldSend: 2 } });
  });

  it('the dry run switch is the environment variable INDEXNOW_DRY_RUN', async () => {
    vi.stubEnv('INDEXNOW_DRY_RUN', '1');
    const store = memoryStore();
    await store.enqueue(['/q/a'], 'manual');
    const post = vi.fn();
    expect((await flushOutbox(store, { post, now: store.clock.now })).dryRun).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it('one URL only: enqueued as manual and sent alone', async () => {
    const store = memoryStore();
    await store.enqueue(['/q/a', '/q/b'], 'quiz:published');
    const { post, sent } = okPost();
    await flushOutbox(store, { post, dryRun: false, onlyUrl: 'https://kpopquiz.org/about', now: store.clock.now });
    expect(sent).toEqual([['https://kpopquiz.org/about']]);
    expect(store.rows.filter((x) => x.outcome === null).map((x) => x.url)).toEqual(['https://kpopquiz.org/q/a', 'https://kpopquiz.org/q/b']);
    await expect(flushOutbox(store, { post, dryRun: false, onlyUrl: 'https://example.com/x' })).rejects.toThrow();
  });
});

describe('publish fast path', () => {
  const okPing = (calls: string[][]): typeof pingIndexNow => async (urls) => { calls.push(urls); return { submitted: urls.length, batches: 1, ok: true, statuses: [200], dryRun: false } satisfies PingResult; };

  it('without the tables it pings exactly the paths, as before', async () => {
    const calls: string[][] = [];
    await submitFastPath(['/q/a', '/bts-quiz', '/new'], 'quiz:published', { store: null, ping: okPing(calls) });
    expect(calls).toEqual([['/q/a', '/bts-quiz', '/new']]);
    const notLive = memoryStore();
    notLive.enqueue = async () => { throw new Error('relation "public.seo_indexnow_outbox" does not exist'); };
    await submitFastPath(['/q/a'], 'quiz:published', { store: notLive, ping: okPing(calls) });
    expect(calls.at(-1)).toEqual(['/q/a']);
  });

  it('writes the outbox, pings, and marks the URLs submitted so the flush does not send them again', async () => {
    const store = memoryStore();
    const calls: string[][] = [];
    await submitFastPath(['/q/a', '/bts-quiz', '/new'], 'quiz:published', { store, ping: okPing(calls), now: () => store.clock.now });
    expect(calls).toEqual([['/q/a', '/bts-quiz', '/new']]);
    expect(store.rows.map((x) => [x.url, x.reason, x.outcome])).toEqual([
      ['https://kpopquiz.org/q/a', 'quiz:published', 'submitted'],
      ['https://kpopquiz.org/bts-quiz', 'quiz:published', 'submitted'],
      ['https://kpopquiz.org/new', 'quiz:published', 'submitted'],
    ]);
    const { post, sent } = okPost();
    await flushOutbox(store, { post, dryRun: false, now: store.clock.now });
    expect(sent).toEqual([]);
  });

  it('skips the URLs accepted under 5 minutes ago (they wait for the flush) and marks nothing in dry run', async () => {
    const store = memoryStore();
    const calls: string[][] = [];
    await submitFastPath(['/q/a', '/new'], 'quiz:published', { store, ping: okPing(calls), now: () => store.clock.now });
    store.clock.now = new Date(store.clock.now.getTime() + 60000);
    await submitFastPath(['/q/a', '/bts-quiz'], 'quiz:edited', { store, ping: okPing(calls), now: () => store.clock.now });
    expect(calls.at(-1)).toEqual(['/bts-quiz']);
    expect(store.rows.find((x) => x.url.endsWith('/q/a') && x.outcome === null)?.reason).toBe('quiz:edited');

    const dry = memoryStore();
    const dryPing: typeof pingIndexNow = async (urls) => ({ submitted: urls.length, batches: 1, ok: false, statuses: [], dryRun: true });
    await submitFastPath(['/q/a'], 'quiz:published', { store: dry, ping: dryPing, now: () => dry.clock.now });
    expect(dry.rows[0]!.outcome).toBeNull();
  });

  it('never throws', async () => {
    const boom: typeof pingIndexNow = async () => { throw new Error('network'); };
    await expect(submitFastPath(['/q/a'], 'quiz:published', { store: null, ping: boom })).resolves.toBeUndefined();
  });

  it('unit tests never get a real store', () => {
    expect(getIndexNowStore()).toBeNull();
  });
});

describe('sending', () => {
  it('dry run: pingIndexNow logs and never calls fetch', async () => {
    vi.stubEnv('INDEXNOW_DRY_RUN', 'true');
    const fetchImpl = vi.fn();
    const r = await pingIndexNow(['/q/a', '/q/a', '/new'], fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(r).toEqual({ submitted: 2, batches: 1, ok: false, statuses: [], dryRun: true });
  });

  it('posts host, key and keyLocation; reports the statuses; a network error is status 0', async () => {
    vi.stubEnv('INDEXNOW_DRY_RUN', '');
    const bodies: unknown[] = [];
    const fetchImpl = vi.fn(async (_url: string, init: { body: string }) => { bodies.push(JSON.parse(init.body)); return { status: 202, headers: { get: () => null } }; });
    const r = await pingIndexNow(['/q/a'], fetchImpl);
    expect(r).toMatchObject({ ok: true, statuses: [202], dryRun: false });
    expect(bodies[0]).toEqual({ host: 'kpopquiz.org', key: '4b2f9a7ce8d1465fb0a3e6c95d47128a', keyLocation: 'https://kpopquiz.org/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt', urlList: ['https://kpopquiz.org/q/a'] });
    const down = await postIndexNowBatch(['https://kpopquiz.org/q/a'], async () => { throw new Error('offline'); });
    expect(down).toEqual({ status: 0, retryAfter: null });
    const busy = await postIndexNowBatch(['https://kpopquiz.org/q/a'], async () => ({ status: 429, headers: { get: (h: string) => (h === 'retry-after' ? '120' : null) } }));
    expect(busy).toEqual({ status: 429, retryAfter: '120' });
  });
});
