import type { NextRequest, NextResponse } from 'next/server';

// W3 PART A2 - proof of possession for the browser id.
//
// THE SECURITY PROBLEM: the claim attaches unowned runs to an account. If the
// client could simply name any anon_id, anyone could type a stranger's id and take
// their runs. A body field is a claim, not a proof.
//
// THE FIX: whenever the server sees a browser id on a WRITE (a play, a battle
// result), it mirrors that id into an httpOnly cookie. The browser cannot read or
// forge it from JS. The claim endpoint then trusts ONLY the cookie, and refuses when
// the body disagrees with it. So a caller can only ever claim an id this server has
// actually seen coming from this browser.

export const ANON_COOKIE = 'nq_anon';
const ONE_YEAR = 60 * 60 * 24 * 365;

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** The id this browser has actually proven to the server, or null. */
export function readAnonCookie(req: NextRequest): string | null {
  const v = req.cookies.get(ANON_COOKIE)?.value;
  return isUuid(v) ? v : null;
}

/**
 * Mirror a browser id seen on a write into the httpOnly cookie. Called on the play
 * and battle-result paths, so by the time a guest is offered "claim this run" the
 * proof already exists.
 */
export function setAnonCookie(res: NextResponse, anonId: string): void {
  res.cookies.set(ANON_COOKIE, anonId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR,
  });
}
