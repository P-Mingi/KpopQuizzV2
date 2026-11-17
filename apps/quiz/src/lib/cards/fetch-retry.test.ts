// fetchRetry of scripts/cards/card-files.mjs (lot CPUB-RETRY, integrator 2026-11-17): the first run of cards-publish stopped on one
// passing 520 of Cloudflare in front of Supabase. Pure: a simulated fetch, a recorded sleep, no network, no key.
import { describe, expect, it } from 'vitest';

import { RETRY_STATUS, fetchRetry, retryWait } from '../../../scripts/cards/card-files.mjs';

const answer = (status: number, headers: Record<string, string> = {}): Response => new Response(status === 204 ? null : `status ${status}`, { status, headers });

/** A fetch that gives these answers in turn (an Error is thrown, as fetch does when the network fails). */
function scripted(seq: (number | Error | Response)[]): { doFetch: (n: number) => Promise<Response>; tries: number[] } {
  const tries: number[] = [];
  const doFetch = async (n: number): Promise<Response> => {
    tries.push(n);
    const next = seq[Math.min(n - 1, seq.length - 1)]!;
    if (next instanceof Error) throw next;
    return typeof next === 'number' ? answer(next) : next;
  };
  return { doFetch, tries };
}
function recorder(): { sleep: (ms: number) => Promise<void>; waits: number[] } {
  const waits: number[] = [];
  return { sleep: async (ms: number) => { waits.push(ms); }, waits };
}

describe('fetchRetry', () => {
  it('a 520 then a 200: ok in 2 tries, one wait of 5 s', async () => {
    const f = scripted([520, 200]);
    const s = recorder();
    const r = await fetchRetry(f.doFetch, { sleep: s.sleep });
    expect(r.status).toBe(200);
    expect(f.tries).toEqual([1, 2]);
    expect(s.waits).toEqual([5000]);
  });

  it('every passing status of Cloudflare and of a busy server is tried again', async () => {
    for (const st of [408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]) {
      expect(RETRY_STATUS.has(st), String(st)).toBe(true);
      const f = scripted([st, 204]);
      const r = await fetchRetry(f.doFetch, { sleep: recorder().sleep });
      expect(r.status, String(st)).toBe(204);
      expect(f.tries, String(st)).toEqual([1, 2]);
    }
  });

  it('a 400, 401, 403, 404, 409 or 413 is never tried again', async () => {
    for (const st of [400, 401, 403, 404, 409, 413]) {
      expect(RETRY_STATUS.has(st), String(st)).toBe(false);
      const f = scripted([st, 200]);
      const s = recorder();
      const r = await fetchRetry(f.doFetch, { sleep: s.sleep });
      expect(r.status, String(st)).toBe(st);
      expect(f.tries, String(st)).toEqual([1]);
      expect(s.waits, String(st)).toEqual([]);
    }
  });

  it('a network error (fetch throws) is tried again', async () => {
    const f = scripted([new TypeError('fetch failed'), 200]);
    const s = recorder();
    expect((await fetchRetry(f.doFetch, { sleep: s.sleep })).status).toBe(200);
    expect(f.tries).toEqual([1, 2]);
    expect(s.waits).toEqual([5000]);
  });

  it('4 times 503: the last answer comes back with its status, after 4 tries and 3 waits', async () => {
    const f = scripted([503, 503, 503, 503, 200]);
    const s = recorder();
    const r = await fetchRetry(f.doFetch, { sleep: s.sleep });
    expect(r.status).toBe(503);
    expect(await r.text()).toBe('status 503');
    expect(f.tries).toEqual([1, 2, 3, 4]);
    expect(s.waits).toEqual([5000, 20_000, 20_000]);
  });

  it('4 network errors: the last one is thrown', async () => {
    const f = scripted([new TypeError('fetch failed')]);
    await expect(fetchRetry(f.doFetch, { sleep: recorder().sleep })).rejects.toThrow('fetch failed');
    expect(f.tries).toEqual([1, 2, 3, 4]);
  });

  it('waits the server\'s Retry-After: 7 gives 7000 ms, at most 60 s', async () => {
    const f = scripted([answer(503, { 'Retry-After': '7' }), answer(429, { 'Retry-After': '600' }), 200]);
    const s = recorder();
    expect((await fetchRetry(f.doFetch, { sleep: s.sleep })).status).toBe(200);
    expect(s.waits).toEqual([7000, 60_000]);
    expect(retryWait(1, '7')).toBe(7000);
  });

  it('tries can be set; one try is no retry', async () => {
    const f = scripted([520, 200]);
    expect((await fetchRetry(f.doFetch, { tries: 1, sleep: recorder().sleep })).status).toBe(520);
    expect(f.tries).toEqual([1]);
  });
});
