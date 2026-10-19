// Run O1, lot (c) part 2, lane B3: the five handlers of the passport jump (docs/o1/contracts/apis.md 2.1 to 2.5,
// cookies.md). The route files under app/(site)/auth and app/api/passport are one-line wrappers around them
// (rule 18: the three builds share this code, never a copy). Each handler reads the build's site first
// (`ctx.site`, SITE.id by default) and answers from the flag: with PASSPORT_JUMP off (or no secret) nothing new is
// reachable: /auth/passport/out sends the visitor to the target page signed out, /auth/arrive to `next`, and
// authorize, land and redeem answer 404.
//
// The chain: source /auth/passport/out mints a ticket -> target /auth/arrive sets the transaction cookie ->
// identity site /auth/authorize issues a one-time code (passport_issue_code) -> target /auth/land (a tiny page
// that posts the code from the URL fragment) -> target POST /api/passport/redeem (state, PKCE, passport_redeem_code,
// a session through the service role: generateLink then verifyOtp, no email sent, then ensure_membership).
//
// Outcomes. The events the database accepts are the HANDOFF_OUTCOMES of types.ts; the handlers log with
// passport_log_event (and the two SQL functions log theirs: issued, refusals, redeemed, pkce_fail, replay,
// expired). The names of the brief map as: ok = redeemed (logged by passport_redeem_code), replay, pkce_fail,
// banned and unconfirmed (logged by the functions), state_mismatch and expired (the redeem route), no_session =
// login_required (authorize), open_redirect = bad_ticket (arrive: a `next` that safeReturnTo changed, or a ticket
// that does not match). other_user answers 409 and has no event value (a new outcome is a CR, BACKLOG 5.2).
// Logging never fails a request. A code, a verifier, a state, a ticket and an email are never logged or returned.

import { NextResponse } from 'next/server';

import { safeReturnTo } from '@/lib/auth/return-to';
import { VIA_RE } from '@/lib/network/types';
import { REGISTRY, SITE_ID, isSiteId, netOrigin } from '@/lib/site/registry';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import {
  clientIp, codeHash, ipHash, newCode, newState, newVerifier, passportJumpOn, pkceChallenge, safeEqual,
  signTicket, signTx, ticketSecret, txCookieAttributes, txCookieName, uaFamily, verifyTicket, verifyTx,
} from './ticket';
import { B64U_16_RE, B64U_32_RE } from './types';

import type { NextRequest } from 'next/server';
import type { SiteId } from '@/lib/site/types';
import type { PassportEnv } from './ticket';
import type { HandoffOutcome, RedeemFailure, RedeemRequest, RedeemResponse } from './types';

/** What a handler reads besides the request: tests pass them, the routes leave them to the defaults. */
export interface HandoffCtx {
  /** The build's site (SITE.id). */
  readonly site?: SiteId;
  /** process.env by default. */
  readonly env?: PassportEnv;
  /** Unix milliseconds; Date.now by default. */
  readonly now?: () => number;
}

interface Run {
  readonly site: SiteId;
  readonly env: PassportEnv;
  readonly nowSec: number;
}

function run(ctx: HandoffCtx): Run {
  return {
    site: ctx.site ?? SITE_ID,
    env: ctx.env ?? process.env,
    nowSec: Math.floor((ctx.now ? ctx.now() : Date.now()) / 1000),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Responses (apis.md 1.1 rule 2: no-store and no-referrer on every answer)
// ---------------------------------------------------------------------------------------------------------------

const FRAME_CSP = "frame-ancestors 'none'";

function harden<R extends Response>(res: R, csp?: string): R {
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  if (csp) res.headers.set('Content-Security-Policy', csp);
  return res;
}

function redirect(location: string, csp?: string): NextResponse {
  return harden(NextResponse.redirect(location, 302), csp);
}

function notFound(): NextResponse {
  return harden(new NextResponse(null, { status: 404 }));
}

function jsonError(status: number, error: string, extra: Record<string, unknown> = {}): NextResponse {
  return harden(NextResponse.json({ error, ...extra }, { status }));
}

/** 302 to a path of this very site (the request's own origin), for the cases that end on `next`. */
function toSelf(request: NextRequest, path: string): NextResponse {
  return redirect(new URL(path, request.url).toString());
}

// ---------------------------------------------------------------------------------------------------------------
// Logging (passport_log_event), fail soft
// ---------------------------------------------------------------------------------------------------------------

interface LogRow {
  readonly outcome: HandoffOutcome;
  readonly user?: string | null;
  readonly from?: string | null;
  readonly to?: string | null;
  readonly via?: string | null;
}

function visitor(request: NextRequest, env: PassportEnv): { ip: string | null; ua: string } {
  return { ip: ipHash(clientIp(request.headers), env), ua: uaFamily(request.headers.get('user-agent')) };
}

async function logEvent(request: NextRequest, env: PassportEnv, row: LogRow): Promise<void> {
  try {
    const v = visitor(request, env);
    await createServiceRoleClient().rpc('passport_log_event', {
      p_outcome: row.outcome,
      p_user: row.user ?? null,
      p_from_site: row.from ?? null,
      p_to_site: row.to ?? null,
      p_via_code: row.via ?? null,
      p_ip_hash: v.ip,
      p_ua_family: v.ua,
    });
  } catch {
    // a log call never fails the request
  }
}

// ---------------------------------------------------------------------------------------------------------------
// via
// ---------------------------------------------------------------------------------------------------------------

/** `via` is kept when it matches VIA_RE and starts with the letter of `source`, else dropped (null). */
function keepVia(raw: string | null, source: SiteId): string | null {
  if (raw === null || !VIA_RE.test(raw)) return null;
  return raw.startsWith(`${REGISTRY[source].letter}.`) ? raw : null;
}

// ---------------------------------------------------------------------------------------------------------------
// 2.1 GET /auth/passport/out?to&next&via (on the source site)
// ---------------------------------------------------------------------------------------------------------------

export async function handleOut(request: NextRequest, ctx: HandoffCtx = {}): Promise<NextResponse> {
  const { site, env, nowSec } = run(ctx);
  const q = request.nextUrl.searchParams;
  const to = q.get('to');
  if (!isSiteId(to) || to === site) return jsonError(400, 'bad_request');

  const next = safeReturnTo(q.get('next'), '/', to);
  const via = keepVia(q.get('via'), site);
  const base = netOrigin(to, env);

  // Flag off, or the viewer is signed out here: the target page, signed out (via as a query parameter).
  const plain = (): NextResponse => {
    const url = new URL(next, base);
    if (via) url.searchParams.set('via', via);
    return redirect(url.toString());
  };
  if (!passportJumpOn(env)) return plain();

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return plain();

  const ticket = signTicket(ticketSecret(env)!, { from: site, to, next }, nowSec);
  const params = new URLSearchParams({ from: site, next, t: ticket });
  if (via) params.set('via', via);
  return redirect(`${base}/auth/arrive?${params.toString()}`);
}

// ---------------------------------------------------------------------------------------------------------------
// 2.2 GET /auth/arrive?from&next&t[&via] (on the target, the relying party)
// ---------------------------------------------------------------------------------------------------------------

export async function handleArrive(request: NextRequest, ctx: HandoffCtx = {}): Promise<NextResponse> {
  const { site, env, nowSec } = run(ctx);
  const q = request.nextUrl.searchParams;
  const rawNext = q.get('next');
  const next = safeReturnTo(rawNext, '/', site);
  if (!passportJumpOn(env)) return toSelf(request, next);

  const fromParam = q.get('from');
  const from = isSiteId(fromParam) ? fromParam : null;
  const via = from ? keepVia(q.get('via'), from) : null;
  const bad = (): Promise<void> => logEvent(request, env, { outcome: 'bad_ticket', from, to: site, via });

  if (q.has('mode')) {
    await bad();
    return toSelf(request, next);
  }
  const t = q.get('t');
  if (!t) return toSelf(request, next); // crawlers and plain links write nothing

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return toSelf(request, next); // never switches account

  // An open redirect attempt: safeReturnTo changed the path. Same answer as a bad ticket, to the sanitised path.
  const check = rawNext !== null && rawNext === next
    ? verifyTicket(ticketSecret(env)!, t, { to: site, from: fromParam, next: rawNext }, nowSec)
    : ({ ok: false, reason: 'next' } as const);
  const name = txCookieName(request.url, request.headers.get('x-forwarded-proto'), env);
  if (!check.ok || from === null || name === null) {
    if (!check.ok) await bad();
    return toSelf(request, next);
  }

  const state = newState();
  const verifier = newVerifier();
  const cookie = signTx(ticketSecret(env)!, { state, verifier, next, from, via, iat: nowSec });
  const authorize = new URLSearchParams({
    client: site, state, code_challenge: pkceChallenge(verifier), method: 'S256', prompt: 'none',
  });
  const res = redirect(`${netOrigin(from, env)}/auth/authorize?${authorize.toString()}`);
  res.cookies.set(name, cookie, txCookieAttributes(name));
  return res;
}

// ---------------------------------------------------------------------------------------------------------------
// 2.3 GET /auth/authorize?client&state&code_challenge&method=S256&prompt=none (on the identity site)
// ---------------------------------------------------------------------------------------------------------------

function plain400(): NextResponse {
  return harden(
    new NextResponse('bad request', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } }),
    FRAME_CSP,
  );
}

export async function handleAuthorize(request: NextRequest, ctx: HandoffCtx = {}): Promise<NextResponse> {
  const { site, env } = run(ctx);
  if (!passportJumpOn(env)) return notFound();

  const q = request.nextUrl.searchParams;
  const client = q.get('client');
  const state = q.get('state');
  const challenge = q.get('code_challenge');
  if (
    q.get('prompt') !== 'none' || q.get('method') !== 'S256'
    || challenge === null || !B64U_32_RE.test(challenge)
    || state === null || !B64U_16_RE.test(state)
    || !isSiteId(client) || client === site
  ) {
    return plain400();
  }

  // The relying party never learns why: every refusal is the same fragment, the real outcome is logged here.
  const target = `${netOrigin(client, env)}/auth/land`;
  const refused = (): NextResponse => redirect(`${target}#error=login_required&state=${state}`, FRAME_CSP);

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await logEvent(request, env, { outcome: 'login_required', from: site, to: client });
    return refused();
  }

  const code = newCode();
  const v = visitor(request, env);
  const { data, error } = await createServiceRoleClient().rpc('passport_issue_code', {
    p_user: user.id,
    p_from_site: site,
    p_to_site: client,
    p_code_hash: codeHash(code),
    p_code_challenge: challenge,
    p_via_code: null,
    p_ip_hash: v.ip,
    p_ua_family: v.ua,
  });
  if (error || data !== 'issued') return refused();
  return redirect(`${target}#code=${code}&state=${state}`, FRAME_CSP);
}

// ---------------------------------------------------------------------------------------------------------------
// 2.4 GET /auth/land (on the relying party)
// ---------------------------------------------------------------------------------------------------------------

/** The land page's script: reads the fragment, strips it, posts to redeem, goes to the `next` of the answer. */
function landScript(): string {
  return [
    '(function(){',
    "var h=location.hash.replace(/^#/,'');",
    "history.replaceState(null,'','/auth/land');",
    'var p=new URLSearchParams(h);',
    "var code=p.get('code'),state=p.get('state'),err=p.get('error');",
    "function go(u){location.replace(typeof u==='string'&&u.charAt(0)==='/'&&u.charAt(1)!=='/'&&u.indexOf('\\\\')<0?u:'/');}",
    "if(!state||(!code&&err!=='login_required')){go('/');return;}",
    "var body=code?{code:code,state:state}:{error:'login_required',state:state};",
    "fetch('/api/passport/redeem',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)})",
    '.then(function(r){return r.json().catch(function(){return {};});})',
    '.then(function(j){go(j&&j.next);})',
    ".catch(function(){go('/');});",
    '})();',
  ].join('');
}

export function landHtml(nonce: string): string {
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">',
    '<title>Signing in</title></head><body>',
    '<p>Signing you in...</p>',
    '<noscript><p><a href="/">Continue</a></p></noscript>',
    `<script nonce="${nonce}">${landScript()}</script>`,
    '</body></html>',
  ].join('');
}

export async function handleLand(_request: NextRequest, ctx: HandoffCtx = {}): Promise<NextResponse> {
  const { env } = run(ctx);
  if (!passportJumpOn(env)) return notFound();
  const nonce = newState(); // 16 random bytes, base64url: fresh per response
  const csp = `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; ${FRAME_CSP}`;
  return harden(
    new NextResponse(landHtml(nonce), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }),
    csp,
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 2.5 POST /api/passport/redeem (on the relying party)
// ---------------------------------------------------------------------------------------------------------------

const BODY_MAX_BYTES = 2048;

function parseRedeemBody(text: string): RedeemRequest | null {
  if (Buffer.byteLength(text, 'utf8') > BODY_MAX_BYTES) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.state !== 'string') return null;
  if (b.error === 'login_required') return { error: 'login_required', state: b.state };
  if (typeof b.code === 'string') return { code: b.code, state: b.state };
  return null;
}

export async function handleRedeem(request: NextRequest, ctx: HandoffCtx = {}): Promise<NextResponse> {
  const { site, env, nowSec } = run(ctx);
  if (!passportJumpOn(env)) return notFound();

  const origin = request.headers.get('origin');
  if (origin !== null && origin !== netOrigin(site, env)) return jsonError(403, 'origin');

  const name = txCookieName(request.url, request.headers.get('x-forwarded-proto'), env);
  const secret = ticketSecret(env)!;

  // Every answer from here on clears the transaction cookie (Max-Age=0, same name and attributes).
  const answer = (status: number, body: RedeemResponse | RedeemFailure): NextResponse => {
    const res = harden(NextResponse.json(body, { status }));
    if (name) res.cookies.set(name, '', txCookieAttributes(name, 0));
    return res;
  };
  const fail = (status: number, error: string, next: string): NextResponse => answer(status, { error, next });

  const contentType = request.headers.get('content-type') ?? '';
  const parsed = contentType.toLowerCase().startsWith('application/json') ? parseRedeemBody(await request.text()) : null;
  if (!parsed) return fail(400, 'bad_request', '/');

  const check = name ? verifyTx(secret, request.cookies.get(name)?.value, nowSec) : null;
  // The payload of a valid cookie, or of one that only expired (so the visitor still reaches its `next`).
  const tx = check === null ? null : check.ok ? check.tx : (check.tx ?? null);
  const next = tx ? safeReturnTo(tx.next, '/', site) : '/';
  const log = (outcome: HandoffOutcome, userId?: string | null): Promise<void> =>
    logEvent(request, env, { outcome, user: userId ?? null, from: tx?.from ?? null, to: site, via: tx?.via ?? null });

  if (!check || !tx) {
    await log('state_mismatch');
    return fail(400, 'state_mismatch', next);
  }
  if (!check.ok) {
    await log('expired');
    return fail(400, 'expired', next);
  }
  if (!safeEqual(tx.state, parsed.state)) {
    await log('state_mismatch');
    return fail(400, 'state_mismatch', next);
  }
  if ('error' in parsed) return fail(400, 'login_required', next); // the identity site logged the real outcome

  if (!B64U_32_RE.test(parsed.code)) {
    await log('expired');
    return fail(400, 'expired', next);
  }

  // One UPDATE consumes the code and compares the PKCE challenge in constant time; the function logs the outcome.
  const admin = createServiceRoleClient();
  const v = visitor(request, env);
  const { data: rows, error: redeemError } = await admin.rpc('passport_redeem_code', {
    p_code_hash: codeHash(parsed.code),
    p_to_site: site,
    p_code_challenge: pkceChallenge(tx.verifier),
    p_via_code: tx.via,
    p_ip_hash: v.ip,
    p_ua_family: v.ua,
  });
  const row = (Array.isArray(rows) ? rows[0] : rows) as { outcome?: string; user_id?: string; from_site?: string } | null | undefined;
  if (redeemError || !row || typeof row.outcome !== 'string') return fail(400, 'expired', next);
  if (row.outcome !== 'redeemed') return fail(400, row.outcome, next);
  const userId = row.user_id;
  if (!userId || row.from_site !== tx.from) return fail(400, 'state_mismatch', next);

  // A session already exists here: the same user keeps it, another user is never switched silently.
  const supabase = await createServerClient();
  const { data: { user: current } } = await supabase.auth.getUser();
  if (current && current.id !== userId) return fail(409, 'other_user', next);

  if (!current) {
    const { data: who } = await admin.auth.admin.getUserById(userId);
    const email = who?.user?.email;
    if (!email) return fail(400, 'expired', next);
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) return fail(400, 'expired', next);
    const { data: verified, error: otpError } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
    if (otpError || verified?.user?.id !== userId) {
      if (verified?.session) await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      return fail(400, 'expired', next);
    }
  }

  // The stamp of this site (a failure here keeps the session and still answers 200).
  try {
    const { data: stamp } = await supabase.rpc('ensure_membership', { p_site: site, p_via: 'jump', p_via_code: tx.via });
    const made = (Array.isArray(stamp) ? stamp[0] : stamp) as { created?: boolean } | null | undefined;
    if (made?.created === true && tx.via) {
      await admin.rpc('net_bridge_bump', {
        p_src: tx.from, p_dst: site, p_bridge: tx.via.slice(2), p_step: 'join', p_signed_in: true, p_n: 1,
      });
    }
  } catch {
    // fail soft
  }

  return answer(200, { next });
}
