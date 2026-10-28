// Run O1, lot (b), lane P1: the two handlers of signing in on a world site (docs/o1/contracts/apis.md 3.1 and 3.2). The route
// files app/api/passport/after-signin and app/(site)/auth/confirm are one-line wrappers around them (rule 18: the three
// builds share this code, never a copy). Each handler reads the build's site first (`ctx.site`, SITE.id by default) and
// answers 404 on kpop, which keeps its own /auth/callback.
//
//  - handleAfterSignin: POST /api/passport/after-signin. 401 without a session, 403 and a sign-out for a banned profile,
//    else the membership stamp (`ensure_membership(SITE.id, 'signup', via)`, a `join` counter when it was created with a
//    via) and {next, needsUsername}.
//  - handleConfirm: GET /auth/confirm?token_hash&type&next. verifyOtp, then the branches of today's /auth/callback: no
//    profile (onboarding on anime, the home on the hub), banned (sign out, /login), else the stamp and `next`. Any failure
//    goes to /login.
//
//  - handleOAuthStart (FandomVerse, owner 2026-10-28): GET /auth/start?provider&returnTo&via of anime and hub. Asks Supabase
//    (server side, PKCE verifier in the session cookies) for the Google or Discord URL with the EXACT callback of the build as
//    redirectTo, keeps returnTo, via and the provider in the HttpOnly cookie of lib/auth/oauth-return.ts, and redirects.
//  - handleWorldCallback (FandomVerse): GET /auth/callback of anime and hub, where Google and Discord come back. The code is
//    exchanged, a session that no OAuth provider opened (an email link someone requested by hand) is closed again, then the
//    branches of handleConfirm and the membership stamp with the via of the cookie. The callback reads no query but `code`:
//    Supabase's Redirect URLs list it exactly, with no wildcard (security review, 2026-10-28).
//
// FandomVerse paths: hub is https://fandomverse.org, anime https://fandomverse.org/anime (basePath '/anime', same origin).
// Every `next` here is an app path (lib/auth/site-base.ts); a Location header carries it with the basePath of the build, so
// a redirect of the anime build never lands on a page of the hub. The Origin check compares origins (the anime base has a path).
//
// Never logged or returned: a token hash, an email, a via. The log line carries the route, the outcome and the site.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { oauthCallbackUrl } from '@/lib/auth/base-path';
import {
  decodeOAuthReturn, encodeOAuthReturn, isOAuthProvider, oauthReturnAttributes, oauthReturnCookieName,
} from '@/lib/auth/oauth-return';
import { secureRequest } from '@/lib/auth/session-cookie';
import { safeAppPath, siteBase, siteOrigin, withBase } from '@/lib/auth/site-base';
import { VIA_RE } from '@/lib/network/types';
import { REGISTRY, SITE_ID, flagOn } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';
import type { NetOriginEnv } from '@/lib/site/registry';
import type { SiteId } from '@/lib/site/types';
import type { AfterSigninRequest, AfterSigninResponse, PassportApiError } from './types';

/** What the handlers read from the environment (process.env in the routes, a plain object in tests). */
export type SigninEnv = NetOriginEnv & {
  readonly NEXT_PUBLIC_SUPABASE_URL?: string | undefined;
  readonly NODE_ENV?: string | undefined;
  /** Test switch of the O1 fixture tool on a preview (docs/launch/o1/ENV.md 1.6: never in a production project). */
  readonly AUTH_FIXTURE_CONFIRM?: string | undefined;
};

/**
 * /auth/confirm of the hub and anime is live only for testing (security review, 2026-10-28: fail closed): never on a
 * production deployment; elsewhere only on a development server (NODE_ENV not production) or on a deployed preview that
 * opts in with AUTH_FIXTURE_CONFIRM (the --vercel links of scripts/o1-tools/signin-link.sh). A build that is neither, a
 * preview without the switch or a production build run outside Vercel, answers 404 like kpop.
 */
export function confirmLive(env: SigninEnv): boolean {
  if (env.VERCEL_ENV === 'production') return false;
  return env.NODE_ENV !== 'production' || flagOn(env.AUTH_FIXTURE_CONFIRM);
}

export interface SigninCtx {
  /** The build's site (SITE.id). */
  readonly site?: SiteId;
  /** process.env by default. */
  readonly env?: SigninEnv;
  /** Unix milliseconds; Date.now by default. */
  readonly now?: () => number;
}

const BODY_MAX_BYTES = 2048;

/** The OTP types of a mail link (apis.md 3.2). */
export const CONFIRM_TYPES = ['email', 'magiclink', 'signup', 'email_change'] as const;
export type ConfirmType = (typeof CONFIRM_TYPES)[number];

function harden<R extends Response>(res: R): R {
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

function notFound(): NextResponse {
  return harden(new NextResponse(null, { status: 404 }));
}

function json<T extends AfterSigninResponse | PassportApiError>(status: number, body: T): NextResponse {
  return harden(NextResponse.json(body, { status }));
}

/** 302 to a path of this very site: the Location is the path alone, so the browser resolves it against the address it asked. */
function toSelf(path: string): NextResponse {
  return harden(new NextResponse(null, { status: 302, headers: { Location: path } }));
}

function log(route: string, outcome: string, site: SiteId): void {
  console.info(`[passport] ${route} ${outcome} ${site}`);
}

function parseBody(text: string): AfterSigninRequest | null {
  if (Buffer.byteLength(text, 'utf8') > BODY_MAX_BYTES) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  return { next: typeof b.next === 'string' ? b.next : '/', via: typeof b.via === 'string' ? b.via : null };
}

type Stamp = { created?: boolean } | null | undefined;

/** The source site of a `via` code, by its letter. */
function viaSource(via: string): SiteId | null {
  return SITE_IDS.find((id) => REGISTRY[id].letter === via.charAt(0)) ?? null;
}

/**
 * ensure_membership for the signed-in user (their own client: the function runs for auth.uid()). Fail soft: a failed
 * stamp never blocks a sign-in, the next write repairs it. A `join` counter is written when the row was created with a
 * via (rpcs.md 2.4).
 */
async function stamp(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  site: SiteId,
  via: string | null,
): Promise<void> {
  try {
    const { data } = await supabase.rpc('ensure_membership', { p_site: site, p_via: 'signup', p_via_code: via });
    const made = (Array.isArray(data) ? data[0] : data) as Stamp;
    const from = via ? viaSource(via) : null;
    if (made?.created === true && via && from) {
      await createServiceRoleClient().rpc('net_bridge_bump', {
        p_src: from, p_dst: site, p_bridge: via.slice(2), p_step: 'join', p_signed_in: true, p_n: 1,
      });
    }
  } catch {
    // fail soft
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 3.1 POST /api/passport/after-signin
// ---------------------------------------------------------------------------------------------------------------

export async function handleAfterSignin(request: NextRequest, ctx: SigninCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  if (site === 'kpop') return notFound();
  const env = ctx.env ?? (process.env as NetOriginEnv);

  const origin = request.headers.get('origin');
  if (origin !== null && origin !== siteOrigin(site, env)) return json(403, { error: 'origin' });

  const contentType = request.headers.get('content-type') ?? '';
  const parsed = contentType.toLowerCase().startsWith('application/json') ? parseBody(await request.text()) : null;
  if (!parsed) return json(400, { error: 'bad_request' });

  const next = safeAppPath(parsed.next, '/', site);
  const via = parsed.via !== null && VIA_RE.test(parsed.via) ? parsed.via : null;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    log('after-signin', 'unauthenticated', site);
    return json(401, { error: 'unauthenticated' });
  }

  const { data: profile } = await supabase.from('profiles').select('id, banned_at').eq('id', user.id).maybeSingle();
  if (!profile) {
    log('after-signin', 'needs_username', site);
    return json(200, { next, needsUsername: true });
  }
  if ((profile as { banned_at?: string | null }).banned_at) {
    await supabase.auth.signOut();
    log('after-signin', 'banned', site);
    return json(403, { error: 'banned' });
  }

  await stamp(supabase, site, via);
  log('after-signin', 'ok', site);
  return json(200, { next, needsUsername: false });
}

// ---------------------------------------------------------------------------------------------------------------
// 3.2 GET /auth/confirm
// ---------------------------------------------------------------------------------------------------------------

function isConfirmType(v: string | null): v is ConfirmType {
  return v !== null && (CONFIRM_TYPES as readonly string[]).includes(v);
}

export async function handleConfirm(request: NextRequest, ctx: SigninCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  if (site === 'kpop') return notFound();
  // FandomVerse (owner, 2026-10-28): no email sign-in on the hub and anime. Off (404, like kpop, before it reads anything)
  // unless confirmLive: a development server, or a preview that opts in for the O1 fixture tool (scripts/o1-tools/
  // signin-link.sh mints its links with the admin API of o1-dev, no email is sent).
  const env = ctx.env ?? (process.env as SigninEnv);
  if (!confirmLive(env)) return notFound();

  const params = new URL(request.url).searchParams;
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const next = safeAppPath(params.get('next'), '/', site);
  const fail = (outcome: string): NextResponse => {
    log('confirm', outcome, site);
    return toSelf(withBase(site, '/login'));
  };

  if (!tokenHash || !isConfirmType(type)) return fail('bad_link');

  const supabase = await createServerClient();
  const { data: verified, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return fail('expired');
  const user = verified?.user ?? (await supabase.auth.getUser()).data.user;
  if (!user) return fail('no_user');

  const { data: profile } = await supabase.from('profiles').select('id, banned_at').eq('id', user.id).maybeSingle();
  if (!profile) {
    log('confirm', 'needs_username', site);
    return toSelf(withBase(site, noProfilePath(site, next)));
  }
  if ((profile as { banned_at?: string | null }).banned_at) {
    await supabase.auth.signOut();
    return fail('banned');
  }

  await stamp(supabase, site, null);
  log('confirm', 'ok', site);
  return toSelf(withBase(site, next));
}

/** Where an account without a profile goes (an app path): the username page on anime, the home on the hub (it has none). */
function noProfilePath(site: SiteId, next: string): string {
  return site === 'hub' ? '/' : `/onboarding?returnTo=${encodeURIComponent(next)}`;
}

// ---------------------------------------------------------------------------------------------------------------
// FandomVerse: GET /auth/callback of anime and hub (Google and Discord through Supabase's OAuth redirect)
// ---------------------------------------------------------------------------------------------------------------

/**
 * How the session of an access token was opened: the `method` of its newest `amr` entry ('oauth' for Google and Discord,
 * 'otp', 'magiclink', 'email/signup', 'password' and so on otherwise), or null when the token cannot be read. The token
 * comes straight from Supabase's token endpoint (exchangeCodeForSession), so its payload is read, not verified again here.
 */
export function sessionMethod(accessToken: string | null | undefined): string | null {
  if (typeof accessToken !== 'string') return null;
  const parts = accessToken.split('.');
  if (parts.length !== 3 || !parts[1] || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const amr = typeof payload === 'object' && payload !== null ? (payload as { amr?: unknown }).amr : undefined;
  if (!Array.isArray(amr) || amr.length === 0) return null;
  let newest: { method: string; at: number } | null = null;
  for (const entry of amr) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    if (typeof method !== 'string' || typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null;
    if (newest === null || timestamp >= newest.at) newest = { method, at: timestamp };
  }
  return newest?.method ?? null;
}

/** The providers of the identities of a user (the getUser answer), as Supabase names them. */
export function identityProviders(user: unknown): string[] {
  const ids = typeof user === 'object' && user !== null ? (user as { identities?: unknown }).identities : undefined;
  if (!Array.isArray(ids)) return [];
  return ids.flatMap((i) => (typeof i === 'object' && i !== null && typeof (i as { provider?: unknown }).provider === 'string' ? [(i as { provider: string }).provider] : []));
}

/** Identities that are not an OAuth provider: they never open an 'oauth' session. */
const NOT_OAUTH = new Set(['email', 'phone', 'anonymous']);

/**
 * True when the OAuth sign-in that opened the session was one of `allowed` (Google, Discord). The amr 'oauth' alone would
 * also accept any other OAuth provider of the shared Supabase project, so the identity is checked too:
 *  - with the cookie of /auth/start (`started`): that provider must be allowed and the account must hold an identity of it;
 *  - without it (stale after 600 s): every OAuth identity of the account must be allowed (then whichever opened the session
 *    was Google or Discord), and there must be one.
 */
export function oauthProviderAllowed(user: unknown, started: string | null, allowed: readonly string[]): boolean {
  const ids = identityProviders(user);
  if (started !== null) return allowed.includes(started) && ids.includes(started);
  const oauth = ids.filter((p) => !NOT_OAUTH.has(p));
  return oauth.length > 0 && oauth.every((p) => allowed.includes(p));
}

/** The storage key of the Supabase session cookies of a project URL: sb-<project ref>-auth-token (supabase-js default). */
export function sessionCookieKey(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    return null;
  }
}

const SESSION_COOKIE_RE = /^sb-[a-z0-9-]+-auth-token(?:\.\d{1,2}|-code-verifier)?$/;

/**
 * Deletes the Supabase session cookies of this response (security review, 2026-10-28): a refused session must not stay in
 * the browser even when Supabase's sign-out fails (5xx, 429, network) and keeps the cookies. Every name the exchange may have
 * written (the key, its chunks .0 to .9, the PKCE verifier) and every session cookie the request carries is set to '' with
 * Max-Age=0 on Path=/, through the same cookie store, so the deletion replaces the value the exchange wrote.
 */
async function clearSessionCookies(env: SigninEnv, secure: boolean): Promise<void> {
  try {
    const store = await cookies();
    const names = new Set<string>();
    const key = sessionCookieKey(env.NEXT_PUBLIC_SUPABASE_URL);
    if (key) {
      names.add(key);
      names.add(`${key}-code-verifier`);
      for (let i = 0; i < 10; i++) names.add(`${key}.${i}`);
    }
    for (const c of store.getAll()) if (SESSION_COOKIE_RE.test(c.name)) names.add(c.name);
    for (const name of names) store.set(name, '', { path: '/', sameSite: 'lax', maxAge: 0, expires: new Date(0), ...(secure ? { secure: true } : {}) });
  } catch {
    // no cookie store outside a request: nothing to clear
  }
}

function badRequest(): NextResponse {
  return harden(new NextResponse('bad request', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
}

/** True when `url` is the authorize endpoint of this build's Supabase project (what signInWithOAuth answers). */
function isSupabaseAuthorize(url: string, supabaseUrl: string | undefined): boolean {
  if (!supabaseUrl) return false;
  try {
    const u = new URL(url);
    return u.origin === new URL(supabaseUrl).origin && u.pathname === '/auth/v1/authorize';
  } catch {
    return false;
  }
}

export async function handleOAuthStart(request: NextRequest, ctx: SigninCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  if (site === 'kpop') return notFound();
  const env = ctx.env ?? (process.env as SigninEnv);
  const nowSec = Math.floor((ctx.now ? ctx.now() : Date.now()) / 1000);

  const q = request.nextUrl.searchParams;
  const provider = q.get('provider');
  if (!isOAuthProvider(provider) || !REGISTRY[site].auth.providers.includes(provider)) return badRequest();
  const next = safeAppPath(q.get('returnTo'), '/', site);
  const rawVia = q.get('via');
  const via = rawVia !== null && VIA_RE.test(rawVia) ? rawVia : null;
  const name = oauthReturnCookieName(request.url, request.headers.get('x-forwarded-proto'), env);

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: oauthCallbackUrl(siteBase(site, env)) } });
  const url = data?.url;
  if (error || typeof url !== 'string' || !isSupabaseAuthorize(url, env.NEXT_PUBLIC_SUPABASE_URL)) {
    log('start', 'refused', site);
    return toSelf(withBase(site, '/login'));
  }
  const res = harden(NextResponse.redirect(url, 302));
  if (name) res.cookies.set(name, encodeOAuthReturn({ site, provider, next, via, iat: nowSec }), oauthReturnAttributes(name));
  log('start', provider, site);
  return res;
}

export async function handleWorldCallback(request: NextRequest, ctx: SigninCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  if (site === 'kpop') return notFound();
  const env = ctx.env ?? (process.env as SigninEnv);
  const nowSec = Math.floor((ctx.now ? ctx.now() : Date.now()) / 1000);

  // The return path, the via and the provider come from the cookie /auth/start set, never from the query.
  const name = oauthReturnCookieName(request.url, request.headers.get('x-forwarded-proto'), env);
  const back = name ? decodeOAuthReturn(request.cookies.get(name)?.value, site, nowSec) : null;
  const next = safeAppPath(back?.next ?? null, '/', site);
  const via = back?.via ?? null;
  // Every answer clears the cookie (same name and attributes, Max-Age=0).
  const done = (res: NextResponse): NextResponse => {
    if (name) res.cookies.set(name, '', oauthReturnAttributes(name, 0));
    return res;
  };
  const fail = (outcome: string): NextResponse => {
    log('callback', outcome, site);
    return done(toSelf(withBase(site, '/login')));
  };

  // A provider error (the visitor said no) comes back with ?error= and no code.
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return fail('no_code');

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail('exchange');

  // Google and Discord only: a session opened any other way (an email link asked for by hand with this callback as its
  // address) is closed at once, this browser only, and never reaches a page.
  // A refused session: Supabase's sign-out of this browser (it revokes the refresh token), then the cookies deleted here
  // whatever the sign-out answered.
  const refuse = async (outcome: string): Promise<NextResponse> => {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    await clearSessionCookies(env, secureRequest(request.nextUrl.protocol, request.headers.get('x-forwarded-proto'), env));
    return fail(outcome);
  };
  if (sessionMethod(data?.session?.access_token) !== 'oauth') return refuse('not_oauth');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('no_user');

  // Google or Discord, not another OAuth provider of the shared project (the provider started by /auth/start, and the
  // account's identity of it).
  const allowed = REGISTRY[site].auth.providers.filter(isOAuthProvider);
  if (!oauthProviderAllowed(user, back?.provider ?? null, allowed)) return refuse('provider');

  const { data: profile } = await supabase.from('profiles').select('id, banned_at').eq('id', user.id).maybeSingle();
  if (!profile) {
    log('callback', 'needs_username', site);
    return done(toSelf(withBase(site, noProfilePath(site, next))));
  }
  if ((profile as { banned_at?: string | null }).banned_at) {
    await supabase.auth.signOut();
    return fail('banned');
  }

  await stamp(supabase, site, via);
  log('callback', 'ok', site);
  return done(toSelf(withBase(site, next)));
}
