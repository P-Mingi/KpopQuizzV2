// Run O1, lot (b), lane P1: the browser side of signing in on a world site: the tab's via, the email link address. Nothing
// leaves the process.
// Bunnyverse (owner, 2026-10-28): the origins move from the old anime domain to bunnyverse.org/anime (the anime base: origin and
// basePath); the Google and Discord flow of the Bunnyverse sheets (signInWithProvider, /auth/start) is tested at the end. The
// tests of the removed Google ID-token flow (signInWithGoogle, afterSignin, destinationAfterSignin) went with it (review,
// 2026-10-28); the server side they called stays guarded by lib/passport/signin.test.ts.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  TAB_VIA_KEY, currentAppPath, emailRedirect, oauthCallbackUrl, oauthStartPath, readTabVia, signInWithProvider,
} from './signin-client';

import type { OAuthProvider } from './signin-client';

const storage = (v: string | null) => ({ getItem: (k: string) => (k === TAB_VIA_KEY ? v : null) });

describe('readTabVia', () => {
  it('returns a stored via that matches VIA_RE, else null', () => {
    expect(readTabVia(storage('k.menu'))).toBe('k.menu');
    expect(readTabVia(storage('x.menu'))).toBeNull();
    expect(readTabVia(storage('k.m'))).toBeNull();
    expect(readTabVia(storage('<script>'))).toBeNull();
    expect(readTabVia(storage(null))).toBeNull();
  });
  it('never throws when the storage is blocked', () => {
    expect(readTabVia({ getItem: () => { throw new Error('denied'); } })).toBeNull();
  });
});

describe('emailRedirect', () => {
  it('the email link comes back to the site landing with next as its only query', () => {
    expect(emailRedirect('https://bunnyverse.org/anime', '/auth/confirm', '/q/my quiz?a=1')).toBe('https://bunnyverse.org/anime/auth/confirm?next=%2Fq%2Fmy%20quiz%3Fa%3D1');
  });
});

// Security review (2026-10-28): the callback is registered in Supabase exactly, so it never carries a query; the return path
// and the via travel to the server of the build on /auth/start, which keeps them in an HttpOnly cookie.
describe('Bunnyverse: Google and Discord, started on the server of the build', () => {
  it('the callback is the exact base + /auth/callback: no query, no fragment, whatever the base', () => {
    expect(oauthCallbackUrl('https://bunnyverse.org/anime')).toBe('https://bunnyverse.org/anime/auth/callback');
    expect(oauthCallbackUrl('https://bunnyverse.org')).toBe('https://bunnyverse.org/auth/callback');
    for (const base of ['https://bunnyverse.org', 'https://bunnyverse.org/anime']) {
      const url = new URL(oauthCallbackUrl(base));
      expect(url.search).toBe('');
      expect(url.hash).toBe('');
      expect(oauthCallbackUrl(base)).not.toMatch(/[?*#]/);
    }
  });

  it('the start path is relative to the build (its basePath), with the provider, returnTo and a valid via', () => {
    expect(oauthStartPath('/anime', 'discord', '/q/a b?x=1', 'k.menu')).toBe('/anime/auth/start?provider=discord&returnTo=%2Fq%2Fa+b%3Fx%3D1&via=k.menu');
    expect(oauthStartPath('', 'google', '/passport', null)).toBe('/auth/start?provider=google&returnTo=%2Fpassport');
    for (const via of ['x.menu', 'k.m', '<b>', '']) {
      expect(new URL(oauthStartPath('', 'google', '/', via), 'https://bunnyverse.org').searchParams.has('via')).toBe(false);
    }
    // whatever the return path holds, it stays one encoded parameter
    const url = new URL(oauthStartPath('/anime', 'google', '/x&via=k.evil#frag', null), 'https://bunnyverse.org');
    expect(url.pathname).toBe('/anime/auth/start');
    expect(url.hash).toBe('');
    expect(url.searchParams.get('returnTo')).toBe('/x&via=k.evil#frag');
    expect(url.searchParams.has('via')).toBe(false);
  });

  it('the page the browser is on, as an app path: the basePath dropped only when the path is inside it', () => {
    expect(currentAppPath('/anime', '/anime/q/x', '?a=1')).toBe('/q/x?a=1');
    expect(currentAppPath('/anime', '/anime', '')).toBe('/');
    expect(currentAppPath('/anime', '/anime/', '')).toBe('/');
    expect(currentAppPath('/anime', '/animex', '')).toBe('/animex');
    expect(currentAppPath('', '/passport', '?b=2')).toBe('/passport?b=2');
  });

  it('anime and hub: Google and Discord each navigate once, to /auth/start of the build', () => {
    for (const [site, basePath] of [['anime', '/anime'], ['hub', '']] as const) {
      for (const provider of ['google', 'discord'] as const) {
        const went: string[] = [];
        expect(signInWithProvider(site, provider, '/daily', { basePath, via: 'k.menu' }, (u) => went.push(u))).toEqual({ kind: 'redirecting' });
        expect(went).toEqual([`${basePath}/auth/start?provider=${provider}&returnTo=%2Fdaily&via=k.menu`]);
      }
    }
  });

  it('the browser side has no Google Identity Services, no ID token and no after-signin call left (code, comments aside)', () => {
    const src = readFileSync(fileURLToPath(new URL('./signin-client.ts', import.meta.url)), 'utf8');
    const code = src.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
    expect(code).toContain('export function signInWithProvider(');
    expect(code).not.toMatch(/accounts\.google\.com|signInWithIdToken|signInWithOAuth|\/api\/passport\/after-signin/);
  });

  it('a provider the site does not offer is refused before any navigation', () => {
    const went: string[] = [];
    const out = signInWithProvider('anime', 'email' as unknown as OAuthProvider, '/', { basePath: '/anime', via: null }, (u) => went.push(u));
    expect(out.kind).toBe('error');
    expect(went).toEqual([]);
  });
});
