// Run O1, lot (e), lane B7: the account routes of apis.md 3.4 to 3.6 and the deletion cron of 5. The route files are one-line wrappers
// around these handlers (rule 18: the three builds share this code, never a copy). Every handler reads the build's site first and
// answers 404 outside the hub. The database work is the SQL functions of 016 (service role only); this file adds the session checks.
//
//   POST /api/passport/delete  401 | 403 reauth | 400 confirm | 409 staff_account or manual_deletion | 500 | request, global sign-out, notice, revalidate | 200 {runAfter}
//   GET  /api/passport/delete  401 | 200 {pending, runAfter?}   (kpop only: what the settings screen shows as "cancel")
//   POST /api/passport/cancel  401 | 200 {cancelled}
//   POST /api/passport/leave   401 | 403 reauth | 400 confirm | 409 last_world | leave, revalidate | 200 {counts}
//   GET  /api/cron/passport-deletions  Bearer CRON_SECRET else 401 | hub only | 200 {processed, failed}
//
// The hub answers these routes always. The kpop build answers delete and cancel (and the GET) only when NEXT_PUBLIC_NET_DELETION is on
// (owner decision of 2026-10-24: Settings > "Delete account" on kpopquiz.org starts the passport deletion); with the flag off kpop
// answers 404 as before. Leave stays on the hub, and so does the cron.
//
// Never logged or returned: an address, a username, a user id. The log line carries the route, the outcome and the site.

import { isCronAuthorized } from '@/lib/cron-auth';
import { cronSkipFor } from '@/lib/site/cron';
import { REGISTRY, SITE_ID, flagOn } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import { boundedText, defer, isJson, json, log, notFound, originOk, parseObject } from '../api-util';
import { sendDeletionNotice } from '../email/notice';
import { notifyRevalidate } from '../revalidate';
import { signOut } from '../signout';
import { PASSPORT_SECONDS } from '../types';

import { leavableSites } from './policy';

import type { NextRequest, NextResponse } from 'next/server';
import type { NetOriginEnv } from '@/lib/site/registry';
import type { SiteId } from '@/lib/site/types';
import type { CancelResponse, DeleteResponse, LeaveResponse } from '../types';

export interface AccountCtx {
  readonly site?: SiteId;
  readonly env?: NetOriginEnv;
  /** Milliseconds since the epoch; Date.now by default. */
  readonly now?: () => number;
  /** Purges the member's /u page on these sites. notifyRevalidate by default, deferred. */
  readonly notify?: (username: string, sites: readonly SiteId[]) => Promise<unknown>;
  /** The neutral notice of a scheduled deletion (the site it was asked from decides the brand). sendDeletionNotice by default, deferred. */
  readonly sendNotice?: (to: string, runAfter: string, site: SiteId) => Promise<unknown>;
  /** NEXT_PUBLIC_NET_DELETION: the kpop build answers delete, cancel and the status read. Read from the environment by default. */
  readonly kpopDeletion?: boolean;
}

export { leavableSites };

/** The hub always; kpop only with NEXT_PUBLIC_NET_DELETION on. Anime and every other build: no. */
export function accountRoutesOpen(site: SiteId, kpopDeletion?: boolean): boolean {
  if (site === 'hub') return true;
  return site === 'kpop' && (kpopDeletion ?? flagOn(process.env.NEXT_PUBLIC_NET_DELETION));
}

type Supabase = Awaited<ReturnType<typeof createServerClient>>;

interface Caller {
  readonly id: string;
  readonly email: string | null;
  readonly lastSignInAt: string | null;
}

async function callerOf(supabase: Supabase): Promise<Caller | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null, lastSignInAt: user.last_sign_in_at ?? null };
}

/** True when the last sign-in is within PASSPORT_SECONDS.freshSignIn (600 s); a missing or future-dated time is not fresh. */
export function isFreshSignIn(lastSignInAt: string | null, nowMs: number): boolean {
  if (!lastSignInAt) return false;
  const t = Date.parse(lastSignInAt);
  if (Number.isNaN(t)) return false;
  return nowMs - t <= PASSPORT_SECONDS.freshSignIn * 1000;
}

async function usernameOf(supabase: Supabase, id: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('username').eq('id', id).maybeSingle();
  const u = (data as { username?: unknown } | null)?.username;
  return typeof u === 'string' && u.length > 0 ? u : null;
}

async function memberSites(userId: string): Promise<SiteId[]> {
  const { data } = await createServiceRoleClient().from('world_memberships').select('site_id').eq('user_id', userId);
  const rows = (Array.isArray(data) ? data : []) as Array<{ site_id?: unknown }>;
  return rows.map((r) => r.site_id).filter((s): s is SiteId => typeof s === 'string' && (SITE_IDS as readonly string[]).includes(s));
}

async function readBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (!isJson(request)) return null;
  const text = boundedText(await request.text());
  return text === null ? null : parseObject(text);
}

function deferNotify(ctx: AccountCtx, username: string, sites: readonly SiteId[]): void {
  const notify = ctx.notify ?? ((u: string, s: readonly SiteId[]) => notifyRevalidate(u, s));
  defer(() => notify(username, sites));
}

// ---------------------------------------------------------------------------------------------------------------
// 3.4 POST /api/passport/delete
// ---------------------------------------------------------------------------------------------------------------

// The three refusals of public.admin_delete_account (docs/pending-migrations/account-deletion.sql, part D), asked before the request is
// recorded: a staff account would be told "deletion scheduled" and then never deleted. A read error throws, the caller answers 500.
export type DeletionRefusal = 'staff_account' | 'manual_deletion';

async function exists(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<boolean> {
  const { data, error } = await query;
  if (error) throw new Error('refusal read failed');
  return Array.isArray(data) && data.length > 0;
}

/** A quiz of the user that the deletion would delete (all of them with keep off, only drafts and removed ones with keep on) and that quiz_bank links. */
async function bankLinkedQuiz(admin: ReturnType<typeof createServiceRoleClient>, userId: string, keep: boolean): Promise<boolean> {
  const PAGE = 1000;
  const CHUNK = 100;
  for (let from = 0; ; from += PAGE) {
    const base = admin.from('quizzes').select('id').eq('creator_id', userId);
    const { data, error } = await (keep ? base.in('status', ['draft', 'removed']) : base).order('id').range(from, from + PAGE - 1);
    if (error) throw new Error('refusal read failed');
    const ids = (Array.isArray(data) ? data : []).map((r) => (r as { id?: unknown }).id).filter((i): i is string => typeof i === 'string');
    for (let i = 0; i < ids.length; i += CHUNK) {
      if (await exists(admin.from('quiz_bank').select('published_quiz_id').in('published_quiz_id', ids.slice(i, i + CHUNK)).limit(1))) return true;
    }
    if (ids.length < PAGE) return false;
  }
}

export async function deletionRefusal(userId: string, keepQuizzes: boolean): Promise<DeletionRefusal | null> {
  const admin = createServiceRoleClient();
  if (await exists(admin.from('editorial_accounts').select('user_id').eq('user_id', userId).limit(1))) return 'staff_account';
  if (await exists(admin.from('editorial_drafts').select('id').eq('reviewed_by', userId).not('status', 'in', '(draft,rejected)').limit(1))) return 'staff_account';
  if (await bankLinkedQuiz(admin, userId, keepQuizzes)) return 'manual_deletion';
  return null;
}

export async function handleDelete(request: NextRequest, ctx: AccountCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  if (!accountRoutesOpen(site, ctx.kpopDeletion)) return notFound();
  const env = ctx.env ?? (process.env as NetOriginEnv);
  if (!originOk(request, site, env)) return json(403, { error: 'origin' });

  const supabase = await createServerClient();
  const caller = await callerOf(supabase);
  if (!caller) {
    log('delete', 'unauthenticated', site);
    return json(401, { error: 'unauthenticated' });
  }
  if (!isFreshSignIn(caller.lastSignInAt, (ctx.now ?? Date.now)())) {
    log('delete', 'reauth', site);
    return json(403, { error: 'reauth' });
  }
  const body = await readBody(request);
  if (!body || typeof body.keepQuizzes !== 'boolean' || typeof body.confirm !== 'string') return json(400, { error: 'bad_request' });
  const username = await usernameOf(supabase, caller.id);
  if (!username || body.confirm !== `@${username}`) {
    log('delete', 'confirm', site);
    return json(400, { error: 'confirm' });
  }

  let refusal: DeletionRefusal | null;
  try {
    refusal = await deletionRefusal(caller.id, body.keepQuizzes);
  } catch {
    log('delete', 'refusal_check_failed', site);
    return json(500, { error: 'server' });
  }
  if (refusal) {
    log('delete', refusal, site);
    return json(409, { error: refusal });
  }

  const sites = await memberSites(caller.id);
  const { data, error } = await createServiceRoleClient().rpc('passport_request_deletion', {
    p_user: caller.id, p_from_site: site, p_keep_quizzes: body.keepQuizzes,
  });
  if (error || typeof data !== 'string') {
    log('delete', 'failed', site);
    return json(500, { error: 'server' });
  }
  const runAfter = new Date(data).toISOString();

  try {
    await signOut(supabase, 'global', site);
  } catch {
    // The request is recorded but the sessions are still alive: answer 500 so the member retries (the request is
    // idempotent, a retry refreshes it and signs out again). No notice and no revalidation until the sessions are ended.
    log('delete', 'signout_failed', site);
    return json(500, { error: 'server' });
  }
  if (caller.email) {
    const to = caller.email;
    // With no Resend key the notice is skipped (sendDeletionNotice answers false): the deletion is already recorded, so this only logs
    // the skip, with the route, the outcome and the site, never the address.
    const send = ctx.sendNotice ?? (async (addr: string, at: string, from: SiteId) => {
      const sent = await sendDeletionNotice(addr, at, undefined, undefined, from);
      if (!sent) log('delete', 'notice_skipped', from);
      return sent;
    });
    defer(() => send(to, runAfter, site));
  }
  deferNotify(ctx, username, sites.length > 0 ? sites : [site]);
  log('delete', 'ok', site);
  const res: DeleteResponse = { runAfter };
  return json(200, { ...res });
}

// ---------------------------------------------------------------------------------------------------------------
// 3.5 POST /api/passport/cancel
// ---------------------------------------------------------------------------------------------------------------

export async function handleCancel(request: NextRequest, ctx: AccountCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  if (!accountRoutesOpen(site, ctx.kpopDeletion)) return notFound();
  const env = ctx.env ?? (process.env as NetOriginEnv);
  if (!originOk(request, site, env)) return json(403, { error: 'origin' });

  const supabase = await createServerClient();
  const caller = await callerOf(supabase);
  if (!caller) {
    log('cancel', 'unauthenticated', site);
    return json(401, { error: 'unauthenticated' });
  }
  const { data, error } = await createServiceRoleClient().rpc('passport_cancel_deletion', { p_user: caller.id });
  if (error) {
    log('cancel', 'failed', site);
    return json(500, { error: 'server' });
  }
  const cancelled = data === true;
  log('cancel', cancelled ? 'ok' : 'nothing_pending', site);
  const res: CancelResponse = { cancelled };
  return json(200, { ...res });
}

/** GET /api/passport/delete: is a deletion pending for the signed-in member, and when does it run. 401 | 200 {pending, runAfter?}. */
export async function handleDeletionStatus(request: NextRequest, ctx: AccountCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  if (!accountRoutesOpen(site, ctx.kpopDeletion)) return notFound();
  const env = ctx.env ?? (process.env as NetOriginEnv);
  if (!originOk(request, site, env)) return json(403, { error: 'origin' });

  const supabase = await createServerClient();
  const caller = await callerOf(supabase);
  if (!caller) return json(401, { error: 'unauthenticated' });
  const { data, error } = await createServiceRoleClient().rpc('passport_deletion_status', { p_user: caller.id });
  if (error) {
    log('status', 'failed', site);
    return json(500, { error: 'server' });
  }
  if (typeof data !== 'string') return json(200, { pending: false });
  return json(200, { pending: true, runAfter: new Date(data).toISOString() });
}

// ---------------------------------------------------------------------------------------------------------------
// 3.6 POST /api/passport/leave
// ---------------------------------------------------------------------------------------------------------------

export async function handleLeave(request: NextRequest, ctx: AccountCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  if (site !== 'hub') return notFound();
  const env = ctx.env ?? (process.env as NetOriginEnv);
  if (!originOk(request, site, env)) return json(403, { error: 'origin' });

  const supabase = await createServerClient();
  const caller = await callerOf(supabase);
  if (!caller) {
    log('leave', 'unauthenticated', site);
    return json(401, { error: 'unauthenticated' });
  }
  if (!isFreshSignIn(caller.lastSignInAt, (ctx.now ?? Date.now)())) {
    log('leave', 'reauth', site);
    return json(403, { error: 'reauth' });
  }
  const body = await readBody(request);
  const target = typeof body?.site === 'string' ? body.site : '';
  if (!body || typeof body.keepQuizzes !== 'boolean' || typeof body.confirm !== 'string' || !(leavableSites() as readonly string[]).includes(target)) {
    return json(400, { error: 'bad_request' });
  }
  const username = await usernameOf(supabase, caller.id);
  if (!username || body.confirm !== `@${username}`) {
    log('leave', 'confirm', site);
    return json(400, { error: 'confirm' });
  }

  const sites = await memberSites(caller.id);
  if (!sites.includes(target as SiteId)) return json(400, { error: 'bad_request' });
  if (!sites.some((s) => s !== target && REGISTRY[s].kind === 'world')) {
    log('leave', 'last_world', site);
    return json(409, { error: 'last_world' });
  }
  const { data, error } = await createServiceRoleClient().rpc('passport_leave_world', {
    p_user: caller.id, p_site: target, p_dry_run: false, p_keep_quizzes: body.keepQuizzes,
  });
  if (error || typeof data !== 'object' || data === null) {
    log('leave', 'failed', site);
    return json(500, { error: 'server' });
  }
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) if (typeof v === 'number') counts[k] = v;
  deferNotify(ctx, username, sites);
  log('leave', 'ok', site);
  const res: LeaveResponse = { counts };
  return json(200, { ...res });
}

// ---------------------------------------------------------------------------------------------------------------
// 5 GET /api/cron/passport-deletions
// ---------------------------------------------------------------------------------------------------------------

export interface CronCtx {
  readonly site?: SiteId;
  readonly secret?: string | undefined;
  readonly notify?: (username: string, sites: readonly SiteId[]) => Promise<unknown>;
  /** Requests handled in one run. */
  readonly limit?: number;
}

/** A GoTrue "user not found": the auth user is already gone, which is what the cron wanted. */
function alreadyGone(error: { status?: number; code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.status === 404 || error.code === 'user_not_found' || /not found/i.test(error.message ?? '');
}

export async function handleCronDeletions(request: NextRequest | Request, ctx: CronCtx = {}): Promise<Response> {
  const site = ctx.site ?? SITE_ID;
  if (!isCronAuthorized(request, ctx.secret ?? process.env.CRON_SECRET)) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  const skipped = cronSkipFor(site, ['hub']);
  if (skipped) return skipped;

  const admin = createServiceRoleClient();
  const { data: due, error } = await admin.rpc('passport_due_deletions', { p_limit: ctx.limit ?? 25 });
  if (error) {
    log('cron-deletions', 'list_failed', site);
    return new Response(JSON.stringify({ processed: 0, failed: 0 }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  const rows = (Array.isArray(due) ? due : []) as Array<{ user_id?: unknown }>;
  let processed = 0;
  let failed = 0;
  for (const row of rows) {
    const id = typeof row.user_id === 'string' ? row.user_id : null;
    if (!id) continue;
    // what the purge of the caches needs is read before the rows go
    const { data: prof } = await admin.from('profiles').select('username').eq('id', id).maybeSingle();
    const username = (prof as { username?: unknown } | null)?.username;
    const sites = await memberSites(id);

    const run = await admin.rpc('passport_run_deletion', { p_user: id, p_dry_run: false });
    if (run.error) {
      failed += 1;
      log('cron-deletions', `failed ${run.error.code ?? 'error'}`, site);
      continue;
    }
    const gone = await admin.auth.admin.deleteUser(id);
    if (gone.error && !alreadyGone(gone.error as { status?: number; code?: string; message?: string })) {
      failed += 1;
      log('cron-deletions', 'auth_delete_failed', site);
      continue;
    }
    processed += 1;
    if (typeof username === 'string' && username) {
      const notify = ctx.notify ?? ((u: string, s: readonly SiteId[]) => notifyRevalidate(u, s));
      await notify(username, sites.length > 0 ? sites : ['hub']).catch(() => undefined);
    }
  }
  log('cron-deletions', `done ${processed} ${failed}`, site);
  return new Response(JSON.stringify({ processed, failed }), { status: 200, headers: { 'content-type': 'application/json' } });
}
