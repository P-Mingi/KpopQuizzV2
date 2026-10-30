// ADMIN-1 (owner, 2026-10-30): the admin lock. The ONE server guard of every admin page, admin route, admin cron door and
// admin power (the Verse super-user included). Nothing else in the app reads ADMIN_USER_IDS.
//
// requireAdmin() lets a request through only when ALL of these hold:
//   1. the access token of the session cookie is verified by the auth server (auth.getUser(token)); getSession() only hands
//      over the token, it is never trusted on its own: a forged or edited cookie fails here;
//   2. the verified user id is in ADMIN_USER_IDS;
//   3. that same verified token is at assurance level aal2 (auth.mfa.getAuthenticatorAssuranceLevel(token): currentLevel
//      'aal2', read from the token the auth server has just verified).
// Every other case is a 404, never a 401, a 403 or a redirect to /login: a page calls notFound(), a route answers the 404
// JSON of adminNotFound(). The only exception is an admin (steps 1 and 2 passed) at aal1: a page sends them to the TOTP
// code page (a factor exists) or the TOTP setup page (none yet); a route still answers 404.
//
// Modes of the one function:
//   requireAdmin()         pages, layouts and server components: the context, or notFound() / redirect to the MFA pages
//   requireAdmin('api')    route handlers: { ok: true, user, supabase } or { ok: false, res } (the 404 JSON)
//   requireAdmin('check')  never throws: the context at aal2, else null (an "admin OR curator" decision, the is_admin flag)
//   requireAdmin('mfa')    the two MFA pages and their server actions: any listed, verified admin with the level they are
//                          at ('pass', 'challenge' or 'enrol'), else null (the caller answers 404)
// The decision is computed once per server render (React cache); a route handler computes it on each call.
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import { ADMIN_MFA_CODE_PATH, ADMIN_MFA_SETUP_PATH } from './paths';

import type { User } from '@supabase/supabase-js';

export type AdminClient = Awaited<ReturnType<typeof createServerClient>>;

/** A request that passed requireAdmin: the verified admin and the user's own server client (its JWT is aal2). */
export interface AdminContext {
  readonly user: User;
  readonly supabase: AdminClient;
}

export type AdminGate = ({ readonly ok: true } & AdminContext) | { readonly ok: false; readonly res: NextResponse };

/** Where a listed, verified admin stands: aal2 ('pass'), aal1 with a verified factor ('challenge'), aal1 with none ('enrol'). */
export type AdminLevel = 'pass' | 'challenge' | 'enrol';

export interface AdminMfaContext extends AdminContext {
  readonly level: AdminLevel;
}

export { ADMIN_HOME_PATH, ADMIN_MFA_API, ADMIN_MFA_CODE_PATH, ADMIN_MFA_DIR, ADMIN_MFA_SETUP_PATH } from './paths';

/** The headers of every admin answer: never indexed, never stored by a cache. next.config.ts sets them on the paths too. */
export const ADMIN_RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
};

/** The answer of an admin route to anyone requireAdmin refuses: a plain 404, the same for every case. */
export function adminNotFound(): NextResponse {
  return NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404, headers: { ...ADMIN_RESPONSE_HEADERS } });
}

function listedIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '').split(',').map((id) => id.trim()).filter((id) => id.length > 0);
}

/**
 * True when `id` is in ADMIN_USER_IDS. For a STORED id only (the reviewer requireAdmin recorded on an editorial draft, checked
 * again by the publisher cron): it grants nothing to the current request. A request is an admin only through requireAdmin.
 */
export function isListedAdminId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.length > 0 && listedIds().includes(id);
}

type Decision = { readonly level: 'none' } | ({ readonly level: AdminLevel } & AdminContext);
const NONE: Decision = { level: 'none' };

async function decideNow(): Promise<Decision> {
  // Outside the try: cookies() must be free to tell Next that the render is dynamic (a caught signal would let a build
  // prerender the 404 of an admin page).
  const supabase = await createServerClient();
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return NONE;
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user ?? null;
    if (userError || !user || !isListedAdminId(user.id)) return NONE;
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(token);
    if (aalError || !aal) return NONE;
    if (aal.currentLevel === 'aal2') return { level: 'pass', user, supabase };
    if (aal.currentLevel !== 'aal1') return NONE;
    return { level: aal.nextLevel === 'aal2' ? 'challenge' : 'enrol', user, supabase };
  } catch {
    return NONE;
  }
}

const decide = cache(decideNow);

export function requireAdmin(): Promise<AdminContext>;
export function requireAdmin(mode: 'page'): Promise<AdminContext>;
export function requireAdmin(mode: 'api'): Promise<AdminGate>;
export function requireAdmin(mode: 'check'): Promise<AdminContext | null>;
export function requireAdmin(mode: 'mfa'): Promise<AdminMfaContext | null>;
export async function requireAdmin(mode: 'page' | 'api' | 'check' | 'mfa' = 'page'): Promise<AdminContext | AdminGate | AdminMfaContext | null> {
  const d = await decide();
  if (mode === 'mfa') return d.level === 'none' ? null : { level: d.level, user: d.user, supabase: d.supabase };
  const ctx: AdminContext | null = d.level === 'pass' ? { user: d.user, supabase: d.supabase } : null;
  if (mode === 'check') return ctx;
  if (mode === 'api') return ctx ? { ok: true, ...ctx } : { ok: false, res: adminNotFound() };
  if (ctx) return ctx;
  if (d.level === 'challenge') redirect(ADMIN_MFA_CODE_PATH);
  if (d.level === 'enrol') redirect(ADMIN_MFA_SETUP_PATH);
  notFound();
}

/**
 * The admin power of `userId` in a decision that also lets others through (a Verse curator, a quiz's creator): true only when
 * `userId` is the admin that requireAdmin lets through on this request (verified, listed, aal2). Any other id, including a
 * listed admin's id read from data, is not an admin here. Ids outside the list never reach the session (no extra cost).
 */
export async function adminPowerFor(userId: string | null | undefined): Promise<boolean> {
  if (!isListedAdminId(userId)) return false;
  const ctx = await requireAdmin('check');
  return ctx !== null && ctx.user.id === userId;
}
