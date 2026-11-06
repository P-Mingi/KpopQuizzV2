// Private launch: GET /auth/private-launch and /auth/private-launch/leave of the hub and anime builds (the gate's rewrites send them to
// app/sites/private-launch/enter and leave). Server side only: the session is read with the app's server client (getUser asks the auth server),
// the id is checked against PRIVATE_LAUNCH_ALLOW, and only then is the cookie set. Every redirect goes to a fixed path of this build
// (never a value of the request: no open redirect). An account that may not enter gets the same plain redirect to the home, where the gate
// shows Coming soon like to anyone: no message says whether an account is allowed.
import { withBase } from '@/lib/auth/site-base';

import { ENTER_PATH, OFF, PRIVATE_COOKIE, PRIVATE_COOKIE_MAX_AGE, mayEnter, readPrivateLaunch } from './config';

import type { PrivateLaunch, PrivateLaunchEnv } from './config';
import type { SiteId } from '@/lib/site/types';

export interface EnterCtx {
  readonly site: SiteId;
  readonly env: PrivateLaunchEnv;
  /** The signed-in user id, null when signed out. May throw (the auth server is down): read as not allowed. */
  readonly userId: () => Promise<string | null>;
}

function plain(status: number, headers: Record<string, string> = {}): Response {
  return new Response(status === 404 ? 'Not found' : null, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...(status === 404 ? { 'content-type': 'text/plain; charset=utf-8' } : {}), ...headers },
  });
}

/** The Set-Cookie value of bv_private: HttpOnly, Secure, SameSite=Lax, Path=/ (the hub and /anime), 30 days; Max-Age=0 clears it. */
export function privateCookieHeader(value: string, maxAge: number = PRIVATE_COOKIE_MAX_AGE): string {
  const expires = maxAge === 0 ? '; Expires=Thu, 01 Jan 1970 00:00:00 GMT' : '';
  return `${PRIVATE_COOKIE}=${value}; Path=/; Max-Age=${maxAge}${expires}; HttpOnly; Secure; SameSite=Lax`;
}

function gateOf(ctx: EnterCtx): PrivateLaunch {
  if (ctx.site === 'kpop') return OFF;
  return readPrivateLaunch(ctx.site, ctx.env);
}

/** GET /auth/private-launch. 404 with the gate off and on kpop. */
export async function handleEnter(ctx: EnterCtx): Promise<Response> {
  const pl = gateOf(ctx);
  if (!pl.on) return plain(404);
  const home = withBase(ctx.site, '/');
  let userId: string | null;
  try {
    userId = await ctx.userId();
  } catch {
    return plain(302, { Location: home, 'Set-Cookie': privateCookieHeader('', 0) });
  }
  if (userId === null) {
    return plain(302, { Location: withBase(ctx.site, `/login?returnTo=${encodeURIComponent(ENTER_PATH)}`) });
  }
  if (!mayEnter(pl, userId) || pl.expected === null) {
    return plain(302, { Location: home, 'Set-Cookie': privateCookieHeader('', 0) });
  }
  return plain(302, { Location: home, 'Set-Cookie': privateCookieHeader(pl.expected) });
}

/** GET /auth/private-launch/leave: clears the cookie and goes home. 404 with the gate off and on kpop. */
export function handleLeave(ctx: Pick<EnterCtx, 'site' | 'env'>): Response {
  const pl = gateOf({ ...ctx, userId: async () => null });
  if (!pl.on) return plain(404);
  return plain(302, { Location: withBase(ctx.site, '/'), 'Set-Cookie': privateCookieHeader('', 0) });
}
