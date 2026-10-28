// Run O1, lot (b), lane P1: the browser side of signing in on a world site: the tab's via, the email link address, where the
// browser goes after after-signin, the Google flow with and without a token. Nothing leaves the process.
// FandomVerse (owner, 2026-10-28): the origins move from the old anime domain to fandomverse.org/anime (the anime base: origin and
// basePath); the Google and Discord flow of the FandomVerse sheets (signInWithProvider, /auth/start) is tested at the end.
import { describe, expect, it, vi } from 'vitest';

import {
  TAB_VIA_KEY, afterSignin, currentAppPath, destinationAfterSignin, emailRedirect, oauthCallbackUrl, oauthStartPath, readTabVia,
  signInWithGoogle, signInWithProvider,
} from './signin-client';

import type { GoogleAuthClient, OAuthProvider } from './signin-client';

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

describe('emailRedirect and destinationAfterSignin', () => {
  it('the email link comes back to the site landing with next as its only query', () => {
    expect(emailRedirect('https://fandomverse.org/anime', '/auth/confirm', '/q/my quiz?a=1')).toBe('https://fandomverse.org/anime/auth/confirm?next=%2Fq%2Fmy%20quiz%3Fa%3D1');
  });
  it('anime asks for a username, the hub goes home, a member goes to next', () => {
    expect(destinationAfterSignin('anime', { next: '/daily', needsUsername: true })).toBe('/onboarding?returnTo=%2Fdaily');
    expect(destinationAfterSignin('hub', { next: '/passport', needsUsername: true })).toBe('/');
    expect(destinationAfterSignin('anime', { next: '/daily', needsUsername: false })).toBe('/daily');
  });
});

describe('afterSignin', () => {
  const answer = (status: number, body: unknown): typeof fetch => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('posts JSON to the same-origin route with next and via', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ next: '/x', needsUsername: false }), { status: 200 }));
    await afterSignin('/x', 'k.menu', f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/passport/after-signin');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(init.body as string)).toEqual({ next: '/x', via: 'k.menu' });
  });
  it('maps 200, 401, 403, other statuses, a bad body and a network failure', async () => {
    expect(await afterSignin('/', null, answer(200, { next: '/a', needsUsername: true }))).toEqual({ ok: true, answer: { next: '/a', needsUsername: true } });
    expect(await afterSignin('/', null, answer(401, { error: 'unauthenticated' }))).toEqual({ ok: false, error: 'unauthenticated' });
    expect(await afterSignin('/', null, answer(403, { error: 'banned' }))).toEqual({ ok: false, error: 'banned' });
    expect(await afterSignin('/', null, answer(500, {}))).toEqual({ ok: false, error: 'failed' });
    expect(await afterSignin('/', null, answer(200, { next: 1 }))).toEqual({ ok: false, error: 'failed' });
    expect(await afterSignin('/', null, (async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toEqual({ ok: false, error: 'failed' });
  });
});

describe('signInWithGoogle', () => {
  function client(over: { idToken?: { message: string } | null; oauth?: { message: string } | null } = {}): GoogleAuthClient & { calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      auth: {
        signInWithIdToken: async (a) => { calls.push(`idtoken:${a.nonce}`); return { error: over.idToken ?? null }; },
        signInWithOAuth: async (a) => { calls.push(`oauth:${a.options.redirectTo}`); return { error: over.oauth ?? null }; },
        signOut: async () => { calls.push('signOut'); return {}; },
      },
    };
  }
  const opts = { clientId: 'cid', origin: 'https://fandomverse.org/anime', via: 'k.menu' };

  it('with a Google token: Supabase, then after-signin, then the place to go', async () => {
    const db = client();
    const out = await signInWithGoogle(db, 'anime', '/daily', opts, {
      token: async () => ({ kind: 'token', credential: 'tok', nonce: 'n1' }),
      after: async (next, via) => { db.calls.push(`after:${next}:${via}`); return { ok: true, answer: { next, needsUsername: true } }; },
    });
    expect(out).toEqual({ kind: 'go', to: '/onboarding?returnTo=%2Fdaily' });
    expect(db.calls).toEqual(['idtoken:n1', 'after:/daily:k.menu']);
  });
  it('a refused token is an error and goes no further', async () => {
    const db = client({ idToken: { message: 'bad token' } });
    const out = await signInWithGoogle(db, 'anime', '/', opts, { token: async () => ({ kind: 'token', credential: 'tok', nonce: 'n' }), after: async () => { throw new Error('never'); } });
    expect(out).toEqual({ kind: 'error', message: 'bad token' });
  });
  it('a banned account is signed out locally and told no', async () => {
    const db = client();
    const out = await signInWithGoogle(db, 'anime', '/', opts, { token: async () => ({ kind: 'token', credential: 't', nonce: 'n' }), after: async () => ({ ok: false, error: 'banned' }) });
    expect(out.kind).toBe('error');
    expect(db.calls).toContain('signOut');
  });
  it('without a token the redirect flow takes over, back to /auth/callback with returnTo', async () => {
    const db = client();
    const out = await signInWithGoogle(db, 'anime', '/q/a b', opts, { token: async () => ({ kind: 'unavailable' }) });
    expect(out).toEqual({ kind: 'redirecting' });
    expect(db.calls).toEqual(['oauth:https://fandomverse.org/anime/auth/callback?returnTo=%2Fq%2Fa%20b']);
    const failing = client({ oauth: { message: 'nope' } });
    expect(await signInWithGoogle(failing, 'anime', '/', opts, { token: async () => ({ kind: 'unavailable' }) })).toEqual({ kind: 'error', message: 'nope' });
  });
});

// Security review (2026-10-28): the callback is registered in Supabase exactly, so it never carries a query; the return path
// and the via travel to the server of the build on /auth/start, which keeps them in an HttpOnly cookie.
describe('FandomVerse: Google and Discord, started on the server of the build', () => {
  it('the callback is the exact base + /auth/callback: no query, no fragment, whatever the base', () => {
    expect(oauthCallbackUrl('https://fandomverse.org/anime')).toBe('https://fandomverse.org/anime/auth/callback');
    expect(oauthCallbackUrl('https://fandomverse.org')).toBe('https://fandomverse.org/auth/callback');
    for (const base of ['https://fandomverse.org', 'https://fandomverse.org/anime']) {
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
      expect(new URL(oauthStartPath('', 'google', '/', via), 'https://fandomverse.org').searchParams.has('via')).toBe(false);
    }
    // whatever the return path holds, it stays one encoded parameter
    const url = new URL(oauthStartPath('/anime', 'google', '/x&via=k.evil#frag', null), 'https://fandomverse.org');
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

  it('a provider the site does not offer is refused before any navigation', () => {
    const went: string[] = [];
    const out = signInWithProvider('anime', 'email' as unknown as OAuthProvider, '/', { basePath: '/anime', via: null }, (u) => went.push(u));
    expect(out.kind).toBe('error');
    expect(went).toEqual([]);
  });
});
