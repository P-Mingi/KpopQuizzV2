// Private launch: the Coming soon page (route.ts of this folder). 200, noindex in the document and in X-Robots-Tag, the owner's copy, no
// digit in its text, every address under the build's base path, the Sign in link to the entry; a 404 with the gate off and on kpop.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ site: 'hub' as string }));
vi.mock('@/lib/site/registry', async (orig) => {
  const real = await orig<typeof import('@/lib/site/registry')>();
  return {
    ...real,
    get SITE_ID() { return state.site; },
    get SITE() { return real.REGISTRY[state.site as 'kpop' | 'anime' | 'hub']; },
  };
});

import * as route from './route';

const text = (s: string): string => s.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

beforeEach(() => {
  state.site = 'hub';
  vi.stubEnv('PRIVATE_LAUNCH', '1');
  vi.stubEnv('PRIVATE_LAUNCH_ALLOW', '00000000-0000-4000-8000-00000000000a');
  vi.stubEnv('PRIVATE_LAUNCH_KEY', 'ef'.repeat(32));
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('the Coming soon page', () => {
  it('is static, a 200 in HTML, noindex, nofollow in its header and in its document', async () => {
    expect(route.dynamic).toBe('force-static');
    const res = route.GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    const html = await res.text();
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain('<title>Coming soon | Bunnyverse</title>');
  });

  it('says the owner\'s words: the Bunnyverse logo, Coming soon, the one sentence, kpopquiz.org, a small Sign in', async () => {
    const html = await route.GET().text();
    expect(text(html)).toBe('Coming soon Kpopdle, Otakudle and OtakuQuiz open soon on Bunnyverse. Play on kpopquiz.org Sign in');
    expect(html).toContain('<img class="cs-logo" src="/brand/hub/logo-primary.svg" alt="Bunnyverse">');
    expect(html).toContain('<h1 class="cs-title">Coming soon</h1>');
    expect(html).toContain('<a class="cs-cta" href="https://kpopquiz.org">');
    expect(html).toContain('<a class="cs-signin" href="/auth/private-launch" rel="nofollow">Sign in</a>');
    expect(html).not.toContain('<script');
  });

  it('has no number and no date: not in its text, not in its title or description', async () => {
    const html = await route.GET().text();
    expect(text(html)).not.toMatch(/\d/);
    expect(/<title>([^<]*)<\/title>/.exec(html)![1]).not.toMatch(/\d/);
    expect(/name="description" content="([^"]*)"/.exec(html)![1]).not.toMatch(/\d/);
  });

  it('at /anime: every address of the page is under the base path of the build', async () => {
    state.site = 'anime';
    const html = await route.GET().text();
    expect(html).toContain('src="/anime/brand/hub/logo-primary.svg"');
    expect(html).toContain('href="/anime/auth/private-launch"');
    expect(html).toContain('href="/anime/brand/hub/favicon.svg"');
    expect(text(html)).toBe('Coming soon Kpopdle, Otakudle and OtakuQuiz open soon on Bunnyverse. Play on kpopquiz.org Sign in');
  });

  it('is served when the gate is on but fails closed (everyone sees it)', async () => {
    vi.stubEnv('PRIVATE_LAUNCH_KEY', '');
    expect(route.GET().status).toBe(200);
  });

  it('production on Vercel with PRIVATE_LAUNCH unset: served (closed for everyone); 404 only with an explicit off value', () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('PRIVATE_LAUNCH_ALLOW', '');
    vi.stubEnv('PRIVATE_LAUNCH_KEY', '');
    delete process.env.PRIVATE_LAUNCH;
    expect(route.GET().status).toBe(200);
    vi.stubEnv('PRIVATE_LAUNCH', '0');
    expect(route.GET().status).toBe(404);
  });

  it('is a 404 with the gate off and on the kpop build', () => {
    vi.stubEnv('PRIVATE_LAUNCH', '0');
    expect(route.GET().status).toBe(404);
    vi.stubEnv('PRIVATE_LAUNCH', '');
    expect(route.GET().status).toBe(404);
    vi.stubEnv('PRIVATE_LAUNCH', '1');
    state.site = 'kpop';
    expect(route.GET().status).toBe(404);
  });
});
