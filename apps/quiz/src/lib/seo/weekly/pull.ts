// The Monday pull (SEO Mission 3, part C): Search Console and Bing Webmaster into
// seo_gsc_weekly, seo_bing_weekly and seo_bing_links. Called by /api/cron/seo-weekly-data.
//
// Fail soft, always: no key, no database or no table (migration not applied) is a "skipped"
// line in the log and a clean exit; an API error is an "error" line, and the other source
// still runs. Logs carry counts and status codes only: never a query, a URL with its key, a
// token or a secret.

import { fetchAccessToken, GSC_READONLY_SCOPE, parseServiceAccount } from './google-auth';
import { gscSiteUrl, pullGscWeek } from './gsc';
import { bingSiteUrl, pullBing } from './bing';
import { isMissingTable, logRun, upsertBingLinks, upsertBingWeekly, upsertGscWeek } from './store';
import { completedWeeks, dateInZone, mondayOf } from './weeks';

import type { FetchLike } from './google-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SourceSummary {
  status: 'ok' | 'skipped' | 'error';
  rows: number;
  detail: string;
}

export interface PullSummary {
  gsc: SourceSummary;
  bing: SourceSummary;
}

export interface PullDeps {
  db: SupabaseClient | null;
  fetchImpl: FetchLike;
  now: Date;
  env: Record<string, string | undefined>;
  log?: (line: string) => void;
}

/** Search Console weeks are counted in Pacific time, as Search Console does. */
export const GSC_TIME_ZONE = 'America/Los_Angeles';

/** True when the table answers a one-row read; false when it does not exist. Other errors throw. */
async function tableReady(db: SupabaseClient, table: string): Promise<boolean> {
  const { error } = await db.from(table).select('id').limit(1);
  if (!error) return true;
  if (isMissingTable(error)) return false;
  throw new Error(`${table}: ${error.code ?? 'read failed'}`);
}

export async function pullSearchConsole(deps: PullDeps): Promise<SourceSummary> {
  const sa = parseServiceAccount(deps.env.GSC_SERVICE_ACCOUNT_JSON);
  if (!sa) return { status: 'skipped', rows: 0, detail: 'no GSC_SERVICE_ACCOUNT_JSON' };
  if (!deps.db) return { status: 'skipped', rows: 0, detail: 'no database client' };
  try {
    if (!(await tableReady(deps.db, 'seo_gsc_weekly'))) return { status: 'skipped', rows: 0, detail: 'table seo_gsc_weekly missing (migration not applied)' };
    const token = await fetchAccessToken(sa, GSC_READONLY_SCOPE, deps.fetchImpl, deps.now.getTime());
    const site = gscSiteUrl(deps.env);
    // The week that just ended, and the one before it again (its last days settle late).
    const weeks = completedWeeks(dateInZone(deps.now, GSC_TIME_ZONE), 2);
    let total = 0;
    const notes: string[] = [];
    for (const week of weeks) {
      const { rows, truncated } = await pullGscWeek(site, token, week, deps.fetchImpl);
      const stored = await upsertGscWeek(deps.db, week.start, rows);
      if (!stored.ok) return { status: stored.reason === 'table_missing' ? 'skipped' : 'error', rows: total, detail: stored.detail };
      total += stored.rows;
      notes.push(`${week.start}: ${stored.rows}${truncated ? ' (capped)' : ''}`);
    }
    return { status: 'ok', rows: total, detail: notes.join(', ') };
  } catch (e) {
    return { status: 'error', rows: 0, detail: (e as Error).message.slice(0, 200) };
  }
}

export async function pullBingWebmaster(deps: PullDeps): Promise<SourceSummary> {
  const key = (deps.env.BING_WEBMASTER_API_KEY ?? '').trim();
  if (!key) return { status: 'skipped', rows: 0, detail: 'no BING_WEBMASTER_API_KEY' };
  if (!deps.db) return { status: 'skipped', rows: 0, detail: 'no database client' };
  try {
    if (!(await tableReady(deps.db, 'seo_bing_weekly'))) return { status: 'skipped', rows: 0, detail: 'table seo_bing_weekly missing (migration not applied)' };
    const currentMonday = mondayOf(deps.now.toISOString().slice(0, 10));
    const { weekly, links, errors } = await pullBing(key, bingSiteUrl(deps.env), currentMonday, deps.fetchImpl);
    const stored = await upsertBingWeekly(deps.db, weekly);
    if (!stored.ok) return { status: stored.reason === 'table_missing' ? 'skipped' : 'error', rows: 0, detail: stored.detail };
    const linkStore = await upsertBingLinks(deps.db, links, currentMonday);
    const linkNote = linkStore.ok ? `${linkStore.rows} links` : `links not stored (${linkStore.detail})`;
    const detail = [`${stored.rows} traffic rows`, linkNote, ...errors].join('; ').slice(0, 300);
    return { status: errors.length > 0 || !linkStore.ok ? 'error' : 'ok', rows: stored.rows + (linkStore.ok ? linkStore.rows : 0), detail };
  } catch (e) {
    return { status: 'error', rows: 0, detail: (e as Error).message.slice(0, 200) };
  }
}

export async function runWeeklyPull(deps: PullDeps): Promise<PullSummary> {
  const log = deps.log ?? ((line: string) => console.log(line));
  const gsc = await pullSearchConsole(deps);
  log(`[seo-weekly-data] gsc ${gsc.status}: ${gsc.rows} rows. ${gsc.detail}`);
  const bing = await pullBingWebmaster(deps);
  log(`[seo-weekly-data] bing ${bing.status}: ${bing.rows} rows. ${bing.detail}`);
  if (deps.db) {
    // A skipped source because the table is missing cannot be logged either: logRun swallows it.
    await logRun(deps.db, 'gsc', gsc.status, gsc.rows, gsc.detail);
    await logRun(deps.db, 'bing', bing.status, bing.rows, bing.detail);
  }
  return { gsc, bing };
}
