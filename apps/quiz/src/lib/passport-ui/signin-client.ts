// Run O1, lot (b), lane P1: the browser side of signing in on a world site (anime, hub). The email link goes through
// `signInWithOtp` with `emailRedirectTo` the site's /auth/confirm (registry auth.emailLanding); Google goes through the
// Google Identity Services button of the site's own client id, an ID token to Supabase, then POST
// /api/passport/after-signin (apis.md 3.1), which stamps the membership and says where to go. Without a client id (or when
// Google shows no prompt) Google falls back to Supabase's redirect flow. kpop never imports this module.

import { VIA_RE } from '@/lib/network/types';

import type { SiteId } from '@/lib/site/types';

/** sessionStorage key of the tab's validated `via` (types.ts AfterSigninRequest). */
export const TAB_VIA_KEY = 'fq.net.via';

/** The tab's `via` when it is stored and valid, else null. `storage` is injected by tests. */
export function readTabVia(storage?: Pick<Storage, 'getItem'> | null): string | null {
  try {
    const s = storage ?? (typeof sessionStorage === 'undefined' ? null : sessionStorage);
    const v = s?.getItem(TAB_VIA_KEY) ?? null;
    return v !== null && VIA_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** The address the email link comes back to: the site's landing, with `next` as its only query. */
export function emailRedirect(origin: string, landing: string, next: string): string {
  return `${origin}${landing}?next=${encodeURIComponent(next)}`;
}

export interface AfterSigninAnswer {
  readonly next: string;
  readonly needsUsername: boolean;
}

/** Where the browser goes after after-signin: anime asks for a username, the hub (no username screen) goes to its home. */
export function destinationAfterSignin(site: SiteId, answer: AfterSigninAnswer): string {
  if (!answer.needsUsername) return answer.next;
  if (site === 'hub') return '/';
  return `/onboarding?returnTo=${encodeURIComponent(answer.next)}`;
}

export type AfterSigninResult = { readonly ok: true; readonly answer: AfterSigninAnswer } | { readonly ok: false; readonly error: 'unauthenticated' | 'banned' | 'failed' };

/** POST /api/passport/after-signin, same origin, JSON. */
export async function afterSignin(next: string, via: string | null, fetcher: typeof fetch = fetch): Promise<AfterSigninResult> {
  try {
    const res = await fetcher('/api/passport/after-signin', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ next, via }),
    });
    if (res.status === 401) return { ok: false, error: 'unauthenticated' };
    if (res.status === 403) return { ok: false, error: 'banned' };
    if (!res.ok) return { ok: false, error: 'failed' };
    const body = (await res.json()) as Partial<AfterSigninAnswer>;
    if (typeof body.next !== 'string' || typeof body.needsUsername !== 'boolean') return { ok: false, error: 'failed' };
    return { ok: true, answer: { next: body.next, needsUsername: body.needsUsername } };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Google Identity Services
// ---------------------------------------------------------------------------------------------------------------

interface GsiMoment {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
}
interface GsiApi {
  initialize(config: { client_id: string; callback: (r: { credential?: string }) => void; nonce: string; use_fedcm_for_prompt?: boolean; cancel_on_tap_outside?: boolean }): void;
  prompt(listener?: (m: GsiMoment) => void): void;
  cancel(): void;
}
type GsiWindow = Window & { google?: { accounts?: { id?: GsiApi } } };

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadGsi(): Promise<GsiApi | null> {
  return new Promise((resolve) => {
    const w = window as GsiWindow;
    const ready = (): GsiApi | null => w.google?.accounts?.id ?? null;
    if (ready()) { resolve(ready()); return; }
    const done = (): void => resolve(ready());
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) { existing.addEventListener('load', done, { once: true }); existing.addEventListener('error', () => resolve(null), { once: true }); return; }
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.onload = done;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export type GoogleToken = { readonly kind: 'token'; readonly credential: string; readonly nonce: string } | { readonly kind: 'unavailable' };

/**
 * Asks Google for an ID token with the site's client id. `unavailable` means no client id, no script, or no prompt on
 * screen (blocked, dismissed or in cooldown): the caller falls back to Supabase's redirect flow.
 */
export async function googleIdToken(clientId: string | undefined): Promise<GoogleToken> {
  if (!clientId) return { kind: 'unavailable' };
  const gsi = await loadGsi();
  if (!gsi) return { kind: 'unavailable' };
  const nonce = randomNonce();
  const hashed = await sha256Hex(nonce);
  return new Promise<GoogleToken>((resolve) => {
    gsi.initialize({
      client_id: clientId,
      nonce: hashed,
      use_fedcm_for_prompt: true,
      cancel_on_tap_outside: false,
      callback: (r) => resolve(r.credential ? { kind: 'token', credential: r.credential, nonce } : { kind: 'unavailable' }),
    });
    gsi.prompt((m) => {
      if (m.isNotDisplayed() || m.isSkippedMoment() || m.isDismissedMoment()) resolve({ kind: 'unavailable' });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Google, whole flow
// ---------------------------------------------------------------------------------------------------------------

/** The part of the Supabase browser client the Google flow uses (tests pass a stand-in). */
export interface GoogleAuthClient {
  readonly auth: {
    signInWithIdToken(args: { provider: 'google'; token: string; nonce: string }): Promise<{ error: { message: string } | null }>;
    signInWithOAuth(args: { provider: 'google'; options: { redirectTo: string } }): Promise<{ error: { message: string } | null }>;
    signOut(args: { scope: 'local' }): Promise<unknown>;
  };
}

export type GoogleOutcome =
  | { readonly kind: 'go'; readonly to: string }
  | { readonly kind: 'redirecting' }
  | { readonly kind: 'error'; readonly message: string };

export interface GoogleFlowDeps {
  readonly token?: (clientId: string | undefined) => Promise<GoogleToken>;
  readonly after?: (next: string, via: string | null) => Promise<AfterSigninResult>;
}

/**
 * Google on a world site: an ID token from Google Identity Services into Supabase, then after-signin (the membership
 * stamp and the place to go). When Google offers no token the redirect flow of Supabase takes over, back to the shared
 * /auth/callback with the same `returnTo`.
 */
export async function signInWithGoogle(
  db: GoogleAuthClient,
  site: SiteId,
  back: string,
  opts: { readonly clientId: string | undefined; readonly origin: string; readonly via: string | null },
  deps: GoogleFlowDeps = {},
): Promise<GoogleOutcome> {
  const token = await (deps.token ?? googleIdToken)(opts.clientId);
  if (token.kind === 'token') {
    const { error } = await db.auth.signInWithIdToken({ provider: 'google', token: token.credential, nonce: token.nonce });
    if (error) return { kind: 'error', message: error.message };
    const done = await (deps.after ?? afterSignin)(back, opts.via);
    if (done.ok) return { kind: 'go', to: destinationAfterSignin(site, done.answer) };
    await db.auth.signOut({ scope: 'local' }).catch(() => undefined);
    return { kind: 'error', message: done.error === 'banned' ? 'This account cannot sign in.' : 'We could not sign you in. Try again.' };
  }
  const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${opts.origin}/auth/callback?returnTo=${encodeURIComponent(back)}` } });
  return error ? { kind: 'error', message: error.message } : { kind: 'redirecting' };
}
