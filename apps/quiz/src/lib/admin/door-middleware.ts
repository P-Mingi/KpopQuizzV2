// ADMIN-2 (owner, 2026-10-30; PLAN-ADMIN-2 section 1): the two steps of the hub middleware that concern the secret door. Edge-safe (no Node
// built-in; the session code it calls already runs in the middleware).
//
//   adminDoorAnswer   the rewrite of the secret address and every page below it to the internal admin tree, on the hub build only: the session is refreshed, anyone who
//                     may not go on gets the answer of an unknown URL, and the rewrite carries the door header (a value derived from ADMIN_PATH)
//                     and the address that was asked for. The page's own requireAdmin still decides: nothing here grants anything.
//   stripDoorHeaders  every other request that arrives with the door headers loses them before any page or route sees them.
import { NextResponse } from 'next/server';

import { NOT_FOUND_REWRITE } from '@/lib/route-allowlist';
import { updateSession } from '@/lib/supabase/middleware';

import { ADMIN_DOOR_HEADER, ADMIN_DOOR_NEXT_HEADER, adminDoorValue } from './door';

import type { NextRequest } from 'next/server';

const DOOR_HEADERS: readonly string[] = [ADMIN_DOOR_HEADER, ADMIN_DOOR_NEXT_HEADER];

/** True when the request carries a door header, from a client or from anywhere else. */
export function carriesDoorHeader(request: NextRequest): boolean {
  return DOOR_HEADERS.some((name) => request.headers.has(name));
}

/** The answer of an unknown URL, as the rest of the middleware gives it. */
function unknownUrl(request: NextRequest): NextResponse {
  return NextResponse.rewrite(new URL(NOT_FOUND_REWRITE, request.url));
}

/**
 * The rewrite of the door. `internalPath` is adminDoorTarget's answer ('/admin', '/admin/code', ...); the hub's catch-all rewrite puts
 * /sites/hub in front of it. The session cookies the refresh set ride on the answer. If the refresh fails or the door value cannot be made
 * (no ADMIN_PATH: cannot happen here), the request is still not granted anything: the answer is the unknown URL or the page's own guard.
 */
export async function adminDoorAnswer(request: NextRequest, internalPath: string): Promise<NextResponse> {
  const value = await adminDoorValue();
  if (value === null) return unknownUrl(request);
  let session: NextResponse | null = null;
  try {
    session = await updateSession(request, { admin: true });
  } catch {
    session = null;
  }
  // The refresh answers the unknown URL (a rewrite) to anyone who may not reach the admin, and a redirect never: pass its answer on as it is.
  if (session && (session.headers.get('x-middleware-rewrite') || session.headers.get('location'))) return session;

  const headers = new Headers(request.headers);
  headers.set(ADMIN_DOOR_HEADER, value);
  headers.set(ADMIN_DOOR_NEXT_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const res = NextResponse.rewrite(new URL(`${internalPath}${request.nextUrl.search}`, request.url), { request: { headers } });
  // The paths next.config.ts marks noindex and no-store (/admin/...) are the internal ones; this answer is for the secret address.
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'no-store');
  session?.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

/**
 * `res` with the door headers removed from the request the page will see. Next's override protocol: x-middleware-override-headers lists the
 * request headers that go on, each value in x-middleware-request-<name>. When the answer already overrides some (the session refresh did),
 * that list is kept minus ours; otherwise every header of the request is listed but ours. Fails closed: if a header cannot be copied, the
 * answer is the unknown URL.
 */
export function stripDoorHeaders(request: NextRequest, res: NextResponse): NextResponse {
  try {
    const existing = res.headers.get('x-middleware-override-headers');
    const names = new Set<string>();
    if (existing !== null) existing.split(',').forEach((n) => { if (n.trim()) names.add(n.trim().toLowerCase()); });
    else request.headers.forEach((_v, name) => names.add(name.toLowerCase()));
    for (const drop of DOOR_HEADERS) {
      names.delete(drop);
      res.headers.delete(`x-middleware-request-${drop}`);
    }
    if (existing === null) names.forEach((name) => res.headers.set(`x-middleware-request-${name}`, request.headers.get(name) ?? ''));
    res.headers.set('x-middleware-override-headers', [...names].join(','));
    return res;
  } catch {
    return unknownUrl(request);
  }
}
