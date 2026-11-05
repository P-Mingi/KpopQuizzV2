// ADMIN-2 (PLAN-ADMIN-2 section 2): the cross-site revalidation, both halves, on stand-ins: the caller (registry address, secret in a header, closed
// list, never throws) and the route every build serves (POST only, shared secret, closed list, the same plain 404 for every refusal).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const c = vi.hoisted(() => ({ tags: [] as string[], throws: false }));
vi.mock('next/cache', () => ({
  revalidateTag: (tag: string) => { if (c.throws) throw new Error('outside a request'); c.tags.push(tag); },
}));

import { ASSET_TAGS, pictureTags } from '@/lib/entity-images/cache';
import { IMAGES_LIST_TAG } from '@/lib/entity-images/constants';

import { REVALIDATE_MAX_TAGS, REVALIDATE_PATH, REVALIDATE_TAGS, isRevalidateTag, parseRevalidateBody } from './revalidate';
import { cacheOutcome, revalidateEverywhere, revalidateSecret, revalidateSite } from './revalidate-client';
import * as route from '@/app/api/site-revalidate/route';

const SECRET = 'test-shared-secret-not-a-real-one-0123456789';

beforeEach(() => { c.tags = []; c.throws = false; vi.stubEnv('ADMIN_REVALIDATE_SECRET', SECRET); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('the closed list', () => {
  it('holds eleven tags: the eight of the pages, then the three of the pictures (ADMIN-2, images and photos)', () => {
    expect([...REVALIDATE_TAGS]).toEqual([
      'quizzes', 'groups', 'creators', 'songs', 'editorial', 'personality', 'name-all', 'plays', 'entity-images:anime', 'entity-images-public', 'site-assets',
    ]);
    expect(REVALIDATE_MAX_TAGS).toBe(11);
    expect(REVALIDATE_PATH).toBe('/api/site-revalidate');
  });

  it('each tag of the pictures is a tag a public read really declares, and the tag of one image is not on the list', () => {
    const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
    const publicRead = read('../photos/public-read.ts');
    expect(publicRead).toContain("tags: ['site-assets']");
    expect(publicRead).toContain("tags: ['entity-images-public']");
    expect(IMAGES_LIST_TAG).toBe('entity-images:anime');
    expect(read('../anime/entity-images-read.ts')).toContain('tags: [ENTITY_IMAGES_TAG]');
    expect(isRevalidateTag(IMAGES_LIST_TAG)).toBe(true);
  });

  it('knows its tags exactly', () => {
    for (const t of REVALIDATE_TAGS) expect(isRevalidateTag(t)).toBe(true);
    for (const bad of ['', 'Quizzes', 'quizzes ', '*', 'all', 'entity-images', 'entity-images:kpop', 'Site-Assets', 'entity-image:anime:series:x', '/', 'quizzes,groups', null, undefined, 3, ['quizzes']]) expect(isRevalidateTag(bad), String(bad)).toBe(false);
  });

  it('a body is accepted whole or refused whole: one tag off the list refuses the call', () => {
    expect(parseRevalidateBody({ tags: ['quizzes', 'groups', 'quizzes'] })).toEqual(['quizzes', 'groups']);
    for (const bad of [null, undefined, 'quizzes', [], {}, { tags: [] }, { tags: 'quizzes' }, { tags: ['quizzes', 'nope'] }, { tags: ['quizzes', 5] }, { tags: [...REVALIDATE_TAGS, 'quizzes'] }, { tag: 'quizzes' }, { tags: { 0: 'quizzes' } }]) {
      expect(parseRevalidateBody(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('what a write of pictures expires', () => {
  it('OtakuQuiz: its list of images and the verified pictures; the others: the verified pictures; the assets: the live ones of the hub', () => {
    expect(pictureTags('anime')).toEqual(['entity-images:anime', 'entity-images-public']);
    expect(pictureTags('kpop')).toEqual(['entity-images-public']);
    expect(pictureTags('hub')).toEqual(['entity-images-public']);
    expect([...ASSET_TAGS]).toEqual(['site-assets']);
    for (const t of [...pictureTags('anime'), ...ASSET_TAGS]) expect(isRevalidateTag(t), t).toBe(true);
  });
});

describe('the caller', () => {
  const okFetch = (): { fetcher: typeof fetch; calls: Array<{ url: string; init: RequestInit }> } => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    return { calls, fetcher: (async (url: string, init: RequestInit) => { calls.push({ url: String(url), init }); return new Response('{"ok":true}', { status: 200 }); }) as typeof fetch };
  };

  it('reads the secret from the environment only when it is long enough', () => {
    expect(revalidateSecret()).toBe(SECRET);
    expect(revalidateSecret({ ADMIN_REVALIDATE_SECRET: 'short' })).toBeNull();
    expect(revalidateSecret({})).toBeNull();
    expect(revalidateSecret({ ADMIN_REVALIDATE_SECRET: `  ${SECRET}  ` })).toBe(SECRET);
  });

  it('posts to the registry address of the other site, the secret in the Authorization header, the tags in the body', async () => {
    const { fetcher, calls } = okFetch();
    // The build of this test file is kpop (no NEXT_PUBLIC_SITE_ID), so anime and hub are other sites.
    expect(await revalidateSite('anime', ['quizzes', 'groups'], fetcher)).toEqual({ site: 'anime', revalidated: true });
    expect(await revalidateSite('hub', ['creators'], fetcher)).toEqual({ site: 'hub', revalidated: true });
    expect(calls.map((x) => x.url)).toEqual(['https://bunnyverse.org/anime/api/site-revalidate', 'https://bunnyverse.org/api/site-revalidate']);
    const first = calls[0]!.init;
    expect(first.method).toBe('POST');
    expect((first.headers as Record<string, string>).authorization).toBe(`Bearer ${SECRET}`);
    expect(JSON.parse(String(first.body))).toEqual({ tags: ['quizzes', 'groups'] });
    expect(first.redirect).toBe('error');
    expect(calls.every((x) => !x.url.includes(SECRET) && !String(x.init.body).includes(SECRET))).toBe(true);
  });

  it('expires the site of its own build in place, without a call', async () => {
    const { fetcher, calls } = okFetch();
    expect(await revalidateSite('kpop', ['quizzes', 'groups'], fetcher)).toEqual({ site: 'kpop', revalidated: true });
    expect(c.tags).toEqual(['quizzes', 'groups']);
    expect(calls).toEqual([]);
  });

  it('never throws: no secret, a refusal, an unreachable site, a cache outside a request, a tag off the list', async () => {
    const { fetcher } = okFetch();
    vi.stubEnv('ADMIN_REVALIDATE_SECRET', '');
    expect(await revalidateSite('anime', ['quizzes'], fetcher)).toEqual({ site: 'anime', revalidated: false, reason: 'no_secret' });
    vi.stubEnv('ADMIN_REVALIDATE_SECRET', SECRET);
    expect(await revalidateSite('anime', ['quizzes'], (async () => new Response('', { status: 404 })) as unknown as typeof fetch)).toEqual({ site: 'anime', revalidated: false, reason: 'refused' });
    expect(await revalidateSite('anime', ['quizzes'], (async () => { throw new Error('down'); }) as unknown as typeof fetch)).toEqual({ site: 'anime', revalidated: false, reason: 'unreachable' });
    c.throws = true;
    expect(await revalidateSite('kpop', ['quizzes'], fetcher)).toEqual({ site: 'kpop', revalidated: false, reason: 'unreachable' });
    expect(await revalidateSite('anime', ['nope' as never], fetcher)).toEqual({ site: 'anime', revalidated: false, reason: 'bad_tags' });
    expect(await revalidateSite('anime', [], fetcher)).toEqual({ site: 'anime', revalidated: false, reason: 'bad_tags' });
  });

  it('names the outcome in one word for a journal line', async () => {
    expect(cacheOutcome({ site: 'kpop', revalidated: true })).toBe('ok');
    expect(cacheOutcome({ site: 'kpop', revalidated: false, reason: 'no_secret' })).toBe('no_secret');
  });

  it('revalidateEverywhere reaches the three sites, and reports the first one that failed', async () => {
    const urls: string[] = [];
    const fetcher = (async (url: string) => { urls.push(url); return new Response('', { status: url.includes('/anime/') ? 404 : 200 }); }) as unknown as typeof fetch;
    expect(await revalidateEverywhere(['creators'], fetcher)).toBe('anime:refused');
    expect(urls.sort()).toEqual(['https://bunnyverse.org/anime/api/site-revalidate', 'https://bunnyverse.org/api/site-revalidate']);
    expect(c.tags).toEqual(['creators']);
    expect(await revalidateEverywhere(['creators'], (async () => new Response('', { status: 200 })) as unknown as typeof fetch)).toBe('ok');
  });
});

describe('the route', () => {
  const post = (body: unknown, headers: Record<string, string> = {}): NextRequest =>
    new NextRequest('https://kpopquiz.org/api/site-revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}`, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  const NOT_FOUND = '{"error":"Not found.","code":"not_found"}';
  async function refused(res: Response, label: string): Promise<void> {
    expect(res.status, label).toBe(404);
    expect(await res.text(), label).toBe(NOT_FOUND);
    expect(res.headers.get('cache-control'), label).toBe('no-store');
    expect(res.headers.get('x-robots-tag'), label).toBe('noindex, nofollow');
    expect(c.tags, label).toEqual([]);
  }

  it('expires the tags of a good call and answers them back', async () => {
    const res = await route.POST(post({ tags: ['quizzes', 'groups'] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, tags: ['quizzes', 'groups'] });
    expect(c.tags).toEqual(['quizzes', 'groups']);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('refuses with the same plain 404 whatever is wrong', async () => {
    await refused(await route.POST(post({ tags: ['quizzes'] }, { authorization: 'Bearer wrong-secret-of-the-same-length-0123456789' })), 'wrong secret');
    await refused(await route.POST(post({ tags: ['quizzes'] }, { authorization: `Bearer ${SECRET}x` })), 'longer secret');
    await refused(await route.POST(post({ tags: ['quizzes'] }, { authorization: SECRET })), 'no Bearer word');
    await refused(await route.POST(post({ tags: ['quizzes'] }, { authorization: '' })), 'empty header');
    await refused(await route.POST(post({ tags: ['quizzes'] }, { 'content-type': 'text/plain' })), 'not json');
    await refused(await route.POST(post('{not json')), 'bad json');
    await refused(await route.POST(post({ tags: ['quizzes', 'nope'] })), 'a tag off the list');
    await refused(await route.POST(post({ tags: [] })), 'no tag');
    await refused(await route.POST(post({})), 'no tags key');
    await refused(await route.POST(post([])), 'an array');
    const noAuth = new NextRequest('https://kpopquiz.org/api/site-revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"tags":["quizzes"]}' });
    await refused(await route.POST(noAuth), 'no authorization header');
  });

  it('is a 404 for everyone while no secret is configured, even a request that sends an empty one', async () => {
    vi.stubEnv('ADMIN_REVALIDATE_SECRET', '');
    await refused(await route.POST(post({ tags: ['quizzes'] }, { authorization: 'Bearer ' })), 'empty secret, empty bearer');
    await refused(await route.POST(post({ tags: ['quizzes'] })), 'no secret configured');
    vi.stubEnv('ADMIN_REVALIDATE_SECRET', 'too-short');
    await refused(await route.POST(post({ tags: ['quizzes'] }, { authorization: 'Bearer too-short' })), 'a secret that is too short is no secret');
  });

  it('answers every other method with the same 404', async () => {
    for (const m of ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const) {
      const res = await route[m]();
      expect(res.status, m).toBe(404);
      expect(res.headers.get('cache-control'), m).toBe('no-store');
    }
    expect(c.tags).toEqual([]);
  });
});
