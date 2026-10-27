import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GONE_HTML, LEGACY_PATH_HEADER, LEGACY_SEARCH_HEADER } from '@/lib/seo/legacy-urls';

// SEO (owner, 2026-10-27): the /blind-test handler sends a 301 (query kept) only to a
// /blindtest page the page check says renders, else 410, and 503 when the check cannot
// tell. The page check is a fake here (lib/blind-test/mode-page.test.ts tests the real one).

const state = vi.hoisted(() => ({
  live: new Set<string>(),
  unknown: new Set<string>(),
  throws: false,
}));

vi.mock('@/lib/blind-test/mode-page', () => ({
  blindtestPageRenders: async (segment: string) => {
    if (state.throws) throw new Error('boom');
    if (state.unknown.has(segment)) return null;
    return state.live.has(segment);
  },
}));

import { GET } from './route';

/** The request as the middleware rewrite delivers it: the URL's own query is the original one. */
async function hit(path: string, search = ''): Promise<Response> {
  const headers = { [LEGACY_PATH_HEADER]: path, [LEGACY_SEARCH_HEADER]: search };
  return GET(new NextRequest(`https://kpopquiz.org/api/legacy/blind-test${search.startsWith('?') ? search : ''}`, { headers }));
}

describe('GET /api/legacy/blind-test', () => {
  beforeEach(() => {
    state.live = new Set(['2nd-gen', 'group-bts', 'group-rose']);
    state.unknown = new Set();
    state.throws = false;
  });

  it('301 to the page that renders, with the query string kept', async () => {
    const cases: Array<[string, string, string]> = [
      ['/blind-test', '', 'https://kpopquiz.org/blindtest'],
      ['/blind-test/bts', '?utm_source=x&a=1', 'https://kpopquiz.org/blindtest/group-bts?utm_source=x&a=1'],
      ['/blind-test/group-rose', '', 'https://kpopquiz.org/blindtest/group-rose'],
      ['/blind-test/2nd-gen', '?ref=old', 'https://kpopquiz.org/blindtest/2nd-gen?ref=old'],
    ];
    for (const [path, search, to] of cases) {
      const res = await hit(path, search);
      expect(res.status, path).toBe(301);
      expect(res.headers.get('location'), path).toBe(to);
    }
  });

  it('410 Gone, noindex, when no page renders', async () => {
    for (const path of ['/blind-test/group-the-boyz', '/blind-test/nonexistent', '/blind-test/bts/x']) {
      const res = await hit(path, '?a=1');
      expect(res.status, path).toBe(410);
      expect(res.headers.get('x-robots-tag'), path).toBe('noindex');
      expect(await res.text(), path).toBe(GONE_HTML);
    }
  });

  it('503 when the page check cannot tell or fails', async () => {
    state.unknown.add('group-bts');
    expect((await hit('/blind-test/bts')).status).toBe(503);
    state.throws = true;
    expect((await hit('/blind-test/2nd-gen')).status).toBe(503);
  });

  it('only a real query string is kept, and a path that is not /blind-test is a 404', async () => {
    const res = await hit('/blind-test/2nd-gen', '//evil.example/x');
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/blindtest/2nd-gen');
    expect((await hit('/blindtest/group-bts')).status).toBe(404);
    expect((await hit('')).status).toBe(404);
  });

  it('a direct hit without the headers is a 404, whatever its query says', async () => {
    const res = await GET(new NextRequest('https://kpopquiz.org/api/legacy/blind-test?path=/blind-test/bts'));
    expect(res.status).toBe(404);
  });
});
