import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
  addCodeSources, ARTICLE_SOURCE_URLS, makeWikiLookup, normalizeSourceUrl, probeSource, readWikiAnswer, runPolitely, runSourceCheck,
  SourceSet, verdictOf, wikiTitle,
} from './sources';

import type { Probe, SourceDeps, SourceEntry } from './sources';

describe('collecting source URLs', () => {
  it('keeps absolute http(s) URLs, drops fragments, ignores the rest', () => {
    expect(normalizeSourceUrl('https://en.wikipedia.org/wiki/BTS#History')).toBe('https://en.wikipedia.org/wiki/BTS');
    expect(normalizeSourceUrl('  https://www.billboard.com/  ')).toBe('https://www.billboard.com/');
    for (const v of ['Wikipedia', 'KpopVerse DB', '/relative', 'javascript:alert(1)', null, 42, '']) expect(normalizeSourceUrl(v)).toBeNull();
  });

  it('one entry per URL, with where it is used and a few labels', () => {
    const s = new SourceSet();
    s.add('https://en.wikipedia.org/wiki/BTS', 'quiz_bank', 'BTS basics');
    s.add('https://en.wikipedia.org/wiki/BTS#Members', 'quiz_bank', 'BTS basics');
    s.add('https://en.wikipedia.org/wiki/BTS', 'trivia');
    s.add('not a url', 'trivia');
    expect(s.list()).toEqual([{ url: 'https://en.wikipedia.org/wiki/BTS', uses: { quiz_bank: 2, trivia: 1 }, labels: ['BTS basics'] }]);
  });

  it('the code sources hold the blind test playlist sources and every article citation, none from a fan database', () => {
    const s = new SourceSet();
    addCodeSources(s);
    const urls = s.list().map((e) => e.url);
    expect(urls.length).toBeGreaterThan(ARTICLE_SOURCE_URLS.length);
    for (const a of ARTICLE_SOURCE_URLS) expect(urls).toContain(a.url);
    for (const u of urls) expect(u, u).not.toMatch(/kprofiles\.com|fandom\.com/);
  });

  it('every external link cited in an article is in ARTICLE_SOURCE_URLS (the list cannot drift)', () => {
    const dir = fileURLToPath(new URL('../../articles/content/', import.meta.url));
    const cited = new Set<string>();
    for (const f of readdirSync(dir).filter((n) => /\.tsx?$/.test(n))) {
      for (const m of readFileSync(`${dir}${f}`, 'utf8').matchAll(/https?:\/\/[^\s"'`)<>{}]+/g)) {
        const url = normalizeSourceUrl(m[0]);
        if (url && !/^https?:\/\/(www\.)?kpopquiz\.org/.test(url)) cited.add(url);
      }
    }
    const listed = new Set(ARTICLE_SOURCE_URLS.map((a) => normalizeSourceUrl(a.url)));
    expect([...cited].filter((u) => !listed.has(u))).toEqual([]);
  });
});

describe('Wikipedia through the MediaWiki API', () => {
  it('reads an article URL as host and title', () => {
    expect(wikiTitle('https://en.wikipedia.org/wiki/Cheer_Up_(Twice_song)')).toEqual({ host: 'en.wikipedia.org', title: 'Cheer Up (Twice song)' });
    expect(wikiTitle('https://en.wikipedia.org/wiki/Girls%27_Generation')).toEqual({ host: 'en.wikipedia.org', title: "Girls' Generation" });
    expect(wikiTitle('https://en.wikipedia.org/w/index.php?title=BTS&oldid=1')).toBeNull();
    expect(wikiTitle('https://www.billboard.com/wiki/x')).toBeNull();
  });

  it('follows normalization and redirects, and tells missing pages apart', () => {
    const titles = ['bTS', 'Old name', 'Cheer Up (Twice song)'];
    const answer = {
      query: {
        normalized: [{ from: 'bTS', to: 'BTS' }],
        redirects: [{ from: 'Old name', to: 'New name' }],
        pages: [
          { pageid: 1, title: 'BTS' },
          { pageid: 2, title: 'New name' },
          { title: 'Cheer Up (Twice song)', missing: true },
        ],
      },
    };
    expect([...readWikiAnswer(titles, answer)]).toEqual([['bTS', true], ['Old name', true], ['Cheer Up (Twice song)', false]]);
    expect(readWikiAnswer(titles, { error: 'ratelimited' }).size).toBe(0);
  });

  it('batches 50 titles per request, one request per second; a refused batch is retried once, then stays unknown', async () => {
    const titles = Array.from({ length: 120 }, (_, i) => `T${i}`);
    const urls: string[] = [];
    const sleep = vi.fn(async (_ms: number) => undefined);
    const refuse = new Set([2, 3]); // the second batch is refused twice (429)
    const fetchImpl = vi.fn(async (url: string) => {
      urls.push(url);
      if (refuse.has(urls.length)) return { ok: false, headers: { get: () => '7' }, json: async () => ({}) };
      const batch = decodeURIComponent(new URL(url).searchParams.get('titles')!).split('|');
      return { ok: true, headers: { get: () => null }, json: async () => ({ query: { pages: batch.map((t, i) => ({ pageid: i + 1, title: t })) } }) };
    });
    const out = await makeWikiLookup(fetchImpl as unknown as typeof fetch, sleep)('en.wikipedia.org', titles);
    expect(urls).toHaveLength(4);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 7000, 1000]);
    expect(out.size).toBe(70); // T50 to T99 unknown
    expect(out.has('T60')).toBe(false);
  });

  it('a batch refused once and answered on the retry is counted', async () => {
    let n = 0;
    const fetchImpl = vi.fn(async (url: string) => {
      n += 1;
      if (n === 1) return { ok: false, headers: { get: () => null }, json: async () => ({}) };
      const batch = decodeURIComponent(new URL(url).searchParams.get('titles')!).split('|');
      return { ok: true, headers: { get: () => null }, json: async () => ({ query: { pages: batch.map((t, i) => ({ pageid: i + 1, title: t })) } }) };
    });
    const out = await makeWikiLookup(fetchImpl as unknown as typeof fetch, async () => undefined)('en.wikipedia.org', ['BTS']);
    expect([...out]).toEqual([['BTS', true]]);
  });
});

describe('verdicts', () => {
  it('404, 410 and a vanished host are dead; 2xx is ok; walls and errors are unverified', () => {
    expect(verdictOf({ status: 404 })).toBe('dead');
    expect(verdictOf({ status: 410 })).toBe('dead');
    expect(verdictOf({ status: null, noHost: true })).toBe('dead');
    expect(verdictOf({ status: 200 })).toBe('ok');
    for (const s of [403, 429, 500, 503, null]) expect(verdictOf({ status: s })).toBe('unverified');
  });
});

describe('probeSource', () => {
  it('HEAD first; GET when HEAD is refused', async () => {
    const calls: string[] = [];
    const probe = async (_u: string, m: 'HEAD' | 'GET'): Promise<Probe> => { calls.push(m); return m === 'HEAD' ? { status: 405 } : { status: 200 }; };
    expect(await probeSource('https://x.example/', probe, async () => undefined)).toEqual({ status: 200 });
    expect(calls).toEqual(['HEAD', 'GET']);
  });

  it('a 404 to HEAD is confirmed by a GET before it counts (servers that 404 every HEAD)', async () => {
    const dead = vi.fn(async (_u: string, _m: 'HEAD' | 'GET'): Promise<Probe> => ({ status: 404 }));
    expect(await probeSource('https://x.example/', dead, async () => undefined)).toEqual({ status: 404 });
    expect(dead.mock.calls.map((c) => c[1])).toEqual(['HEAD', 'GET']);
    const headOnly404 = async (_u: string, m: 'HEAD' | 'GET'): Promise<Probe> => (m === 'HEAD' ? { status: 404 } : { status: 200 });
    expect(await probeSource('https://newsroom.example/', headOnly404, async () => undefined)).toEqual({ status: 200 });
  });

  it('a 200 to HEAD needs no second request', async () => {
    const ok = vi.fn(async (): Promise<Probe> => ({ status: 200 }));
    expect(await probeSource('https://x.example/', ok, async () => undefined)).toEqual({ status: 200 });
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('a network error is retried once after a pause; a DNS failure is not', async () => {
    const sleep = vi.fn(async () => undefined);
    const flaky = vi.fn<(u: string, m: 'HEAD' | 'GET') => Promise<Probe>>()
      .mockResolvedValueOnce({ status: null })
      .mockResolvedValueOnce({ status: null })
      .mockResolvedValueOnce({ status: 200 });
    expect(await probeSource('https://x.example/', flaky, sleep)).toEqual({ status: 200 });
    expect(sleep).toHaveBeenCalledTimes(1);
    const gone = vi.fn(async (): Promise<Probe> => ({ status: null, noHost: true }));
    expect(await probeSource('https://gone.example/', gone, sleep)).toEqual({ status: null, noHost: true });
    expect(gone).toHaveBeenCalledTimes(2); // HEAD, then GET; no retry
  });
});

describe('runPolitely', () => {
  it('never more than `limit` at once, never more than `perHost` on one host', async () => {
    let active = 0;
    let peak = 0;
    const perHost = new Map<string, number>();
    let hostPeak = 0;
    const urls = [
      ...Array.from({ length: 12 }, (_, i) => `https://en.wikipedia.org/wiki/${i}`),
      ...Array.from({ length: 6 }, (_, i) => `https://site${i}.example/`),
    ];
    const res = await runPolitely(urls, async (u) => {
      const h = new URL(u).hostname;
      active++; perHost.set(h, (perHost.get(h) ?? 0) + 1);
      peak = Math.max(peak, active); hostPeak = Math.max(hostPeak, perHost.get(h)!);
      await new Promise((r) => setTimeout(r, 2));
      active--; perHost.set(h, perHost.get(h)! - 1);
      return u.length;
    }, { limit: 6, perHost: 2, deadline: Date.now() + 10000 });
    expect(res.every((r) => typeof r === 'number')).toBe(true);
    expect(peak).toBeLessThanOrEqual(6);
    expect(hostPeak).toBeLessThanOrEqual(2);
  });

  it('starts nothing new after the deadline; unstarted results are null', async () => {
    let t = 0;
    const res = await runPolitely(['https://a.example/1', 'https://b.example/2', 'https://c.example/3'], async () => { t += 10; return true; }, {
      limit: 1, perHost: 1, deadline: 15, now: () => t,
    });
    expect(res.filter((r) => r === null).length).toBeGreaterThan(0);
  });

  it('an empty list resolves at once', async () => {
    expect(await runPolitely([], async () => 1, { limit: 2, perHost: 1, deadline: Date.now() + 1000 })).toEqual([]);
  });
});

function sourceDeps(entries: SourceEntry[], statuses: Record<string, Probe>, wiki: Record<string, boolean> = {}): SourceDeps {
  return {
    collect: async () => entries,
    probe: async (u) => {
      if (wikiTitle(u)) throw new Error(`a Wikipedia page was fetched directly: ${u}`);
      return statuses[u] ?? { status: 200 };
    },
    wiki: vi.fn(async (_host: string, titles: string[]) => new Map(titles.filter((t) => t in wiki).map((t) => [t, wiki[t]!]))),
    sleep: async () => undefined,
    now: () => Date.now(),
    alert: vi.fn(async () => 'sent' as const),
    logRun: vi.fn(async () => undefined),
  };
}

const E = (url: string, uses: SourceEntry['uses'] = { quiz_bank: 1 }, labels: string[] = []): SourceEntry => ({ url, uses, labels });

describe('runSourceCheck', () => {
  it('dead sources: one alert with where they are used; walls are listed, not alerted', async () => {
    const d = sourceDeps(
      [E('https://ok.example/'), E('https://dead.example/a', { quiz_bank: 3 }, ['BTS basics']), E('https://wall.example/')],
      { 'https://dead.example/a': { status: 404 }, 'https://wall.example/': { status: 403 } },
    );
    const r = await runSourceCheck(d, { dryRun: false, budgetMs: 60000 });
    expect(r).toMatchObject({ ok: false, total: 3, checked: 3, notChecked: 0 });
    expect(r.dead).toEqual([{ url: 'https://dead.example/a', status: 404, uses: { quiz_bank: 3 }, labels: ['BTS basics'] }]);
    expect(r.unverified).toEqual([{ url: 'https://wall.example/', status: 403 }]);
    const msg = (d.alert as ReturnType<typeof vi.fn>).mock.calls[0]![1] as string;
    expect(msg).toContain('1 dead fact sources of 3 checked');
    expect(msg).toContain('quiz_bank x3');
    expect(msg).toContain('1 more could not be verified');
    expect(d.logRun).toHaveBeenCalledTimes(1);
  });

  it('all alive: no alert, no log', async () => {
    const d = sourceDeps([E('https://ok.example/')], {});
    const r = await runSourceCheck(d, { dryRun: false, budgetMs: 60000 });
    expect(r.ok).toBe(true);
    expect(d.alert).not.toHaveBeenCalled();
    expect(d.logRun).not.toHaveBeenCalled();
  });

  it('dry run: reports dead sources, alerts and logs nothing', async () => {
    const d = sourceDeps([E('https://dead.example/')], { 'https://dead.example/': { status: 410 } });
    const r = await runSourceCheck(d, { dryRun: true, budgetMs: 60000 });
    expect(r.dead).toHaveLength(1);
    expect(r.alert).toBe('dry_run');
    expect(d.alert).not.toHaveBeenCalled();
    expect(d.logRun).not.toHaveBeenCalled();
  });

  it('Wikipedia sources are answered by the API: missing is dead, unknown is unverified', async () => {
    const d = sourceDeps(
      [E('https://en.wikipedia.org/wiki/BTS'), E('https://en.wikipedia.org/wiki/Felix_(singer)'), E('https://en.wikipedia.org/wiki/Unknown_page')],
      {},
      { BTS: true, 'Felix (singer)': false },
    );
    const r = await runSourceCheck(d, { dryRun: true, budgetMs: 60000 });
    expect(r.dead.map((x) => x.url)).toEqual(['https://en.wikipedia.org/wiki/Felix_(singer)']);
    expect(r.unverified.map((x) => x.url)).toEqual(['https://en.wikipedia.org/wiki/Unknown_page']);
    expect(d.wiki).toHaveBeenCalledTimes(1);
  });

  it('a failed collect is an error, never a false "all sources alive"', async () => {
    const d = { ...sourceDeps([], {}), collect: async () => { throw new Error('quiz_bank: timeout'); } };
    const r = await runSourceCheck(d, { dryRun: false, budgetMs: 60000 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('quiz_bank: timeout');
  });
});
