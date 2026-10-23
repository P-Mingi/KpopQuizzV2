import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { isKnownRoute } from '@/lib/route-allowlist';

import { AI_REFERER_MATCHER, AI_UTM_MATCHER, aiVisitFromRequest, sourceFromReferer, sourceFromUtm, storablePath } from './ai-referrer';
import { recordAiVisit } from './ai-visit-record';
import { summarizeAiVisits } from './ai-visits';

function req(opts: { method?: string; headers?: Record<string, string>; path?: string; query?: Record<string, string> } = {}) {
  const h = new Map(Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  const q = new Map(Object.entries(opts.query ?? {}));
  return {
    method: opts.method ?? 'GET',
    headers: { get: (n: string) => h.get(n.toLowerCase()) ?? null },
    nextUrl: { pathname: opts.path ?? '/bts-quiz', searchParams: { get: (n: string) => q.get(n) ?? null } },
  };
}

describe('referrer classification', () => {
  it('the four assistants, their subdomains, with or without a path', () => {
    expect(sourceFromReferer('https://chatgpt.com/')).toBe('chatgpt');
    expect(sourceFromReferer('https://chatgpt.com')).toBe('chatgpt');
    expect(sourceFromReferer('https://www.perplexity.ai/search?q=x')).toBe('perplexity');
    expect(sourceFromReferer('https://perplexity.ai/')).toBe('perplexity');
    expect(sourceFromReferer('https://copilot.microsoft.com/chats/abc')).toBe('copilot');
    expect(sourceFromReferer('https://gemini.google.com/app')).toBe('gemini');
  });

  it('look-alike hosts and other sites are not assistants', () => {
    for (const r of [
      'https://chatgpt.com.example.net/', 'https://notchatgpt.com/', 'https://www.google.com/', 'https://bing.com/',
      'https://microsoft.com/', 'https://google.com/', 'https://kpopquiz.org/bts-quiz', 'android-app://com.openai.chatgpt/',
      'not a url', '',
    ]) expect(sourceFromReferer(r), r).toBeNull();
    expect(sourceFromReferer(null)).toBeNull();
  });

  it('utm_source when there is no assistant referrer', () => {
    expect(sourceFromUtm('chatgpt.com')).toBe('chatgpt');
    expect(sourceFromUtm('perplexity')).toBe('perplexity');
    expect(sourceFromUtm('copilot.microsoft.com')).toBe('copilot');
    expect(sourceFromUtm('gemini')).toBe('gemini');
    expect(sourceFromUtm('newsletter')).toBeNull();
    expect(sourceFromUtm('chatgpt.com.evil')).toBeNull();
  });
});

describe('aiVisitFromRequest', () => {
  it('a page load from ChatGPT is a ChatGPT visit to that path, and nothing else is kept', () => {
    const v = aiVisitFromRequest(req({ headers: { referer: 'https://chatgpt.com/', cookie: 'sb=1', 'user-agent': 'X', 'x-forwarded-for': '1.2.3.4' }, path: '/bts-quiz' }));
    expect(v).toEqual({ source: 'chatgpt', path: '/bts-quiz' });
    expect(Object.keys(v!)).toEqual(['source', 'path']);
  });

  it('the referrer wins over utm_source; utm_source alone counts', () => {
    expect(aiVisitFromRequest(req({ headers: { referer: 'https://www.perplexity.ai/' }, query: { utm_source: 'chatgpt.com' } }))?.source).toBe('perplexity');
    expect(aiVisitFromRequest(req({ query: { utm_source: 'chatgpt.com' } }))?.source).toBe('chatgpt');
  });

  it('prefetches, RSC requests and non-GET requests are not visits', () => {
    const ref = { referer: 'https://chatgpt.com/' };
    expect(aiVisitFromRequest(req({ headers: { ...ref, rsc: '1' } }))).toBeNull();
    expect(aiVisitFromRequest(req({ headers: { ...ref, 'next-router-prefetch': '1' } }))).toBeNull();
    expect(aiVisitFromRequest(req({ headers: { ...ref, 'sec-purpose': 'prefetch;prerender' } }))).toBeNull();
    expect(aiVisitFromRequest(req({ headers: { ...ref, purpose: 'prefetch' } }))).toBeNull();
    expect(aiVisitFromRequest(req({ headers: ref, method: 'HEAD' }))).toBeNull();
    expect(aiVisitFromRequest(req({ headers: ref, method: 'POST' }))).toBeNull();
  });

  it('a visit from anywhere else is not counted', () => {
    expect(aiVisitFromRequest(req({ headers: { referer: 'https://www.bing.com/' } }))).toBeNull();
    expect(aiVisitFromRequest(req())).toBeNull();
  });

  it('only plain, short paths are stored', () => {
    expect(storablePath('/q/bts-army-level-test')).toBe('/q/bts-army-level-test');
    expect(storablePath('/a b')).toBeNull();
    expect(storablePath(`/${'x'.repeat(250)}`)).toBeNull();
    expect(storablePath('/<script>')).toBeNull();
  });
});

describe('the middleware matcher copies (Next anchors has-values as ^value$)', () => {
  const src = readFileSync(fileURLToPath(new URL('../../../middleware.ts', import.meta.url)), 'utf8');
  // The literal as it reads in middleware.ts: every backslash doubled inside a single-quoted string.
  const asLiteral = (re: string): string => `'${re.replace(/\\/g, '\\\\')}'`;

  it('middleware.ts carries exactly the two patterns of ai-referrer.ts', () => {
    expect(src).toContain(`key: 'referer', value: ${asLiteral(AI_REFERER_MATCHER)}`);
    expect(src).toContain(`key: 'utm_source', value: ${asLiteral(AI_UTM_MATCHER)}`);
  });

  it('the Referer pattern accepts what the classifier counts and refuses look-alikes', () => {
    const re = new RegExp(`^${AI_REFERER_MATCHER}$`);
    for (const r of ['https://chatgpt.com/', 'https://chatgpt.com', 'https://www.perplexity.ai/search', 'https://copilot.microsoft.com/', 'https://gemini.google.com/app']) {
      expect(re.test(r), r).toBe(true);
      expect(sourceFromReferer(r), r).not.toBeNull();
    }
    for (const r of ['https://chatgpt.com.example.net/', 'https://notchatgpt.com/', 'https://www.google.com/', 'https://kpopquiz.org/']) {
      expect(re.test(r), r).toBe(false);
    }
  });

  it('the utm pattern agrees with the classifier', () => {
    const re = new RegExp(`^${AI_UTM_MATCHER}$`);
    for (const u of ['chatgpt.com', 'perplexity', 'perplexity.ai', 'copilot', 'copilot.microsoft.com', 'gemini', 'gemini.google.com']) {
      expect(re.test(u), u).toBe(true);
      expect(sourceFromUtm(u), u).not.toBeNull();
    }
    expect(re.test('newsletter')).toBe(false);
  });

  it('the AI-only entries skip api, Next internals and files', () => {
    const source = '/((?!api/|_next/|[^?]*\\.[a-z0-9]+$).*)';
    expect(src).toContain(`source: '${source.replace(/\\/g, '\\\\')}'`);
    const re = new RegExp(`^${source}$`);
    for (const p of ['/', '/bts-quiz', '/q/illit-quiz', '/blindtest/group-bts', '/articles/kpop-generations-explained']) expect(re.test(p), p).toBe(true);
    for (const p of ['/api/cron/seo-spikes', '/_next/static/a.js', '/favicon.ico', '/sitemap.xml', '/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt']) expect(re.test(p), p).toBe(false);
  });

  it('a page the main matcher skips is a known route, so running the middleware for an AI visit never redirects it', () => {
    for (const p of ['/', '/q/x', '/quizzes', '/blindtest', '/blindtest/group-bts', '/bts-quiz', '/twice-trivia', '/articles/x', '/data/pulse', '/groups', '/new', '/trivia', '/about']) {
      expect(isKnownRoute(p), p).toBe(true);
    }
  });
});

describe('recordAiVisit (no network in tests)', () => {
  const env = { VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'k' };

  it('production: one RPC carrying only the assistant and the path', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const out = await recordAiVisit('gemini', '/bts-quiz', { env, post: async (url, init) => { calls.push({ url, body: init.body }); return { ok: true, status: 204 }; } });
    expect(out).toBe('recorded');
    expect(calls).toEqual([{ url: 'https://db.example/rest/v1/rpc/seo_ai_visit_hit', body: JSON.stringify({ p_source: 'gemini', p_path: '/bts-quiz' }) }]);
  });

  it('previews, local dev and dry runs record nothing', async () => {
    const post = async (): Promise<{ ok: boolean; status: number }> => { throw new Error('must not be called'); };
    expect(await recordAiVisit('chatgpt', '/', { env: { ...env, VERCEL_ENV: 'preview' }, post })).toBe('skipped');
    expect(await recordAiVisit('chatgpt', '/', { env: { ...env, VERCEL_ENV: undefined }, post })).toBe('skipped');
    expect(await recordAiVisit('chatgpt', '/', { env: { ...env, SEO_WATCH_DRY_RUN: '1' }, post })).toBe('dry_run');
  });

  it('before the migration (404) or on a network error it fails soft', async () => {
    expect(await recordAiVisit('chatgpt', '/', { env, post: async () => ({ ok: false, status: 404 }) })).toBe('failed');
    expect(await recordAiVisit('chatgpt', '/', { env, post: async () => { throw new Error('down'); } })).toBe('failed');
  });
});

describe('summarizeAiVisits', () => {
  it('totals per day, per assistant and per landing page', () => {
    const s = summarizeAiVisits([
      { day: '2026-10-14', source: 'chatgpt', path: '/bts-quiz', visits: 3 },
      { day: '2026-10-15', source: 'chatgpt', path: '/bts-quiz', visits: 2 },
      { day: '2026-10-15', source: 'perplexity', path: '/', visits: 1 },
      { day: '2026-10-15', source: 'gemini', path: '/blindtest', visits: 0 },
    ], 30);
    expect(s.total).toBe(6);
    expect(s.bySource).toEqual({ chatgpt: 5, perplexity: 1, copilot: 0, gemini: 0 });
    expect(s.byDay.map((d) => [d.day, d.total])).toEqual([['2026-10-15', 3], ['2026-10-14', 3]]);
    expect(s.topPaths).toEqual([{ path: '/bts-quiz', visits: 5 }, { path: '/', visits: 1 }]);
  });
});
