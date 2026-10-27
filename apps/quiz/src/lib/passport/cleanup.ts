// Run O1, lane L1 (launch polish): GET /api/cron/passport-cleanup (hub, 55 3 * * *), apis.md 5. Bearer CRON_SECRET else 401; a site other
// than the hub answers 200 {skipped: true}; then public.passport_cleanup() of SQL 006 (service role only) deletes the hand-off codes older
// than one day and the hand-off events older than 90 days. 200 {codesDeleted, eventsDeleted}: counts only, never a code, a user or an address.
// The route file is a one-line wrapper (a route file may export nothing but its handlers), like passport-deletions.

import { isCronAuthorized } from '@/lib/cron-auth';
import { cronSkipFor } from '@/lib/site/cron';
import { SITE_ID } from '@/lib/site/registry';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { log } from './api-util';

import type { SiteId } from '@/lib/site/types';

export interface CleanupCtx {
  readonly site?: SiteId;
  /** The cron secret; process.env.CRON_SECRET by default. */
  readonly secret?: string | undefined;
}

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}

export async function handleCronCleanup(request: Request, ctx: CleanupCtx = {}): Promise<Response> {
  const site = ctx.site ?? SITE_ID;
  const secret = 'secret' in ctx ? ctx.secret : process.env.CRON_SECRET;
  if (!isCronAuthorized(request, secret)) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: JSON_HEADERS });
  const skipped = cronSkipFor(site, ['hub']);
  if (skipped) return skipped;

  const { data, error } = await createServiceRoleClient().rpc('passport_cleanup');
  if (error) {
    // The code is a Postgres or PostgREST code (no row, no value); a 500 shows the failed run in the project's cron log.
    log('cron-cleanup', `failed ${error.code ?? 'error'}`, site);
    return new Response(JSON.stringify({ error: 'cleanup_failed' }), { status: 500, headers: JSON_HEADERS });
  }
  const row = (Array.isArray(data) ? data[0] : data) as { codes_deleted?: unknown; events_deleted?: unknown } | null | undefined;
  const body = { codesDeleted: count(row?.codes_deleted), eventsDeleted: count(row?.events_deleted) };
  log('cron-cleanup', `ok ${body.codesDeleted} ${body.eventsDeleted}`, site);
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS });
}
