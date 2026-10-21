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
// Never logged or returned: a token hash, an email, a via. The log line carries the route, the outcome and the site.

import { NextResponse } from 'next/server';

import { safeReturnTo } from '@/lib/auth/return-to';
import { VIA_RE } from '@/lib/network/types';
import { REGISTRY, SITE_ID, netOrigin } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';
import type { NetOriginEnv } from '@/lib/site/registry';
import type { SiteId } from '@/lib/site/types';
import type { AfterSigninRequest, AfterSigninResponse, PassportApiError } from './types';

export interface SigninCtx {
  /** The build's site (SITE.id). */
  readonly site?: SiteId;
  /** process.env by default. */
  readonly env?: NetOriginEnv;
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
  if (origin !== null && origin !== netOrigin(site, env)) return json(403, { error: 'origin' });

  const contentType = request.headers.get('content-type') ?? '';
  const parsed = contentType.toLowerCase().startsWith('application/json') ? parseBody(await request.text()) : null;
  if (!parsed) return json(400, { error: 'bad_request' });

  const next = safeReturnTo(parsed.next, '/', site);
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

  const params = new URL(request.url).searchParams;
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const next = safeReturnTo(params.get('next'), '/', site);
  const fail = (outcome: string): NextResponse => {
    log('confirm', outcome, site);
    return toSelf('/login');
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
    return toSelf(site === 'hub' ? '/' : `/onboarding?returnTo=${encodeURIComponent(next)}`);
  }
  if ((profile as { banned_at?: string | null }).banned_at) {
    await supabase.auth.signOut();
    return fail('banned');
  }

  await stamp(supabase, site, null);
  log('confirm', 'ok', site);
  return toSelf(next);
}
