// SEO Mission 3, part A (2026-10-15): the IndexNow outbox. Feature code never calls
// IndexNow: the database triggers (docs/pending-migrations/seo-indexnow.sql), the nightly
// reconciliation and the post-deploy diff write the outbox, the hourly flush sends it.
// The publish fast path (lib/seo/quiz-freshness.ts) still pings at once, and writes the
// outbox too: it marks the URLs "submitted" when IndexNow accepts them.
//
// Fails soft until the owner applies the SQL: every store call is guarded, `live()` says
// whether the tables exist, and the fast path then pings exactly as it did before.
// Server only: the store uses the service role key.

import { createClient } from '@supabase/supabase-js';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { INDEXNOW_BATCH_MAX, isIndexNowDryRun, pingIndexNow, postIndexNowBatch } from '@/lib/indexnow';
import { backoffState, chunk, classifyStatus, nextBackoff, normalizeUrl, pathOf, planFlush, RESUBMIT_WINDOW_MS } from '@/lib/seo/indexnow-plan';

import type { EventLite, OutboxRow, StateRow } from '@/lib/seo/indexnow-plan';

export type EventKind = 'flush' | 'alert' | 'backoff' | 'reconcile' | 'deploy_diff' | 'keycheck';

export interface IndexNowStore {
  /** Do the three tables exist? Throws on any other failure (a blip is never "not applied"). */
  live(): Promise<boolean>;
  /** Paths (root-relative) into the outbox; returns rows written. */
  enqueue(paths: string[], reason: string): Promise<number>;
  /** Pending rows, oldest first, at most `limit`. */
  pending(limit: number): Promise<OutboxRow[]>;
  /** url -> last_submitted_at for the given URLs (all known URLs when omitted). */
  lastSubmitted(urls?: string[]): Promise<Map<string, string | null>>;
  recordAttempt(ids: number[], status: number, ok: boolean, atIso: string): Promise<void>;
  markUrlsSubmitted(urls: string[], status: number, atIso: string): Promise<void>;
  settle(covered: number[], gaveUp: number[]): Promise<void>;
  events(kinds: EventKind[], limit: number): Promise<EventLite[]>;
  event(kind: EventKind, statusCode: number | null, detail: Record<string, unknown>): Promise<void>;
  states(): Promise<StateRow[]>;
  upsertStates(rows: Array<Partial<StateRow> & { url: string }>): Promise<void>;
  prune(now: Date): Promise<void>;
}

const MISSING = new Set(['42P01', 'PGRST205', 'PGRST202', '42883']);
function isMissing(err: { code?: string | null; message?: string | null } | null | undefined, status?: number): boolean {
  if (!err) return false;
  if (err.code && MISSING.has(err.code)) return true;
  if (status === 404) return true;
  return /could not find the (table|function)|does not exist/i.test(err.message ?? '');
}

type Svc = ReturnType<typeof createClient>;

function must<T extends { error: { message: string } | null }>(r: T, what: string): T {
  if (r.error) throw new Error(`[indexnow-outbox] ${what}: ${r.error.message}`);
  return r;
}

/** The Supabase store, or null when the service role is not configured (local, CI, tests). */
export function getIndexNowStore(): IndexNowStore | null {
  // Unit tests never reach a real database, whatever the environment holds.
  if (process.env.VITEST) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    return supabaseIndexNowStore(createClient(url, key, { auth: { persistSession: false } }));
  } catch {
    return null;
  }
}

export function supabaseIndexNowStore(svc: Svc): IndexNowStore {
  // The generated Database types do not know these tables yet (pending SQL): untyped access.
  const db = svc as unknown as { from: (t: string) => any; rpc: (f: string, a: Record<string, unknown>) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    async live() {
      for (const [table, col] of [['seo_indexnow_outbox', 'id'], ['seo_url_state', 'url'], ['seo_indexnow_events', 'id']] as const) {
        // GET with limit 1, never HEAD: a HEAD on a missing table answers 204 without an error.
        const { error, status } = await db.from(table).select(col).limit(1);
        if (!error) continue;
        if (isMissing(error, status)) return false;
        throw new Error(`[indexnow-outbox] probe ${table}: ${error.message}`);
      }
      return true;
    },
    async enqueue(paths, reason) {
      if (paths.length === 0) return 0;
      let written = 0;
      for (const part of chunk(paths, 1000)) {
        const { data } = must(await db.rpc('seo_indexnow_enqueue', { p_paths: part, p_reason: reason, p_only_known: false }), 'enqueue');
        written += Number(data ?? 0);
      }
      return written;
    },
    async pending(limit) {
      // Paginated past the 1000-row cap, and bounded: a bulk import never loads everything.
      const out: OutboxRow[] = [];
      for (let from = 0; from < limit; from += 1000) {
        const to = Math.min(from + 999, limit - 1);
        const { data } = must(await db.from('seo_indexnow_outbox')
          .select('id, url, reason, enqueued_at, last_enqueued_at, attempts')
          .is('outcome', null).order('enqueued_at', { ascending: true }).order('id', { ascending: true })
          .range(from, to), 'pending');
        const rows = (data ?? []) as OutboxRow[];
        out.push(...rows);
        if (rows.length < to - from + 1) break;
      }
      return out;
    },
    async lastSubmitted(urls) {
      const out = new Map<string, string | null>();
      if (urls && urls.length <= 50) {
        if (urls.length === 0) return out;
        const { data } = must(await db.from('seo_url_state').select('url, last_submitted_at').in('url', urls), 'last submitted');
        for (const r of (data ?? []) as Array<{ url: string; last_submitted_at: string | null }>) out.set(r.url, r.last_submitted_at);
        return out;
      }
      const rows = await fetchAllRows<{ url: string; last_submitted_at: string | null }>(() => db.from('seo_url_state').select('url, last_submitted_at').order('url'));
      for (const r of rows) out.set(r.url, r.last_submitted_at);
      return out;
    },
    async recordAttempt(ids, status, ok, atIso) {
      for (const part of chunk(ids, 5000)) {
        must(await db.rpc('seo_indexnow_record_attempt', { p_ids: part, p_status: status, p_ok: ok, p_at: atIso }), 'record attempt');
      }
    },
    async markUrlsSubmitted(urls, status, atIso) {
      if (urls.length === 0) return;
      must(await db.rpc('seo_indexnow_mark_submitted', { p_urls: urls, p_status: status, p_at: atIso }), 'mark submitted');
    },
    async settle(covered, gaveUp) {
      for (const part of chunk(covered, 200)) must(await db.from('seo_indexnow_outbox').update({ outcome: 'covered' }).in('id', part).is('outcome', null), 'settle covered');
      for (const part of chunk(gaveUp, 200)) must(await db.from('seo_indexnow_outbox').update({ outcome: 'gave_up' }).in('id', part).is('outcome', null), 'settle gave up');
    },
    async events(kinds, limit) {
      const { data } = must(await db.from('seo_indexnow_events').select('kind, created_at, detail, status_code').in('kind', kinds).order('created_at', { ascending: false }).limit(limit), 'events');
      return (data ?? []) as EventLite[];
    },
    async event(kind, statusCode, detail) {
      must(await db.from('seo_indexnow_events').insert({ kind, status_code: statusCode, detail }), 'event');
    },
    async states() {
      return fetchAllRows<StateRow>(() => db.from('seo_url_state')
        .select('url, hash, indexable, in_sitemap, last_submitted_at, last_checked_at, last_changed_at, http_status, scope').order('url'));
    },
    async upsertStates(rows) {
      for (const part of chunk(rows, 500)) must(await db.from('seo_url_state').upsert(part, { onConflict: 'url' }), 'upsert states');
    },
    async prune(now) {
      const outboxCut = new Date(now.getTime() - 90 * 86400000).toISOString();
      const eventsCut = new Date(now.getTime() - 180 * 86400000).toISOString();
      must(await db.from('seo_indexnow_outbox').delete().not('outcome', 'is', null).lt('enqueued_at', outboxCut), 'prune outbox');
      must(await db.from('seo_indexnow_events').delete().lt('created_at', eventsCut), 'prune events');
    },
  };
}

// ----- the publish fast path -------------------------------------------------------------

/**
 * Called inside after() when a quiz is published, edited or removed. Writes the outbox, skips
 * the URLs IndexNow accepted less than 5 minutes ago (they stay pending for the flush), pings
 * the rest, and marks them submitted when IndexNow answers 200 or 202. Without the tables (SQL
 * not applied) it pings `paths` exactly as before. Never throws.
 */
export async function submitFastPath(
  paths: string[],
  reason: string,
  deps: { store?: IndexNowStore | null; ping?: typeof pingIndexNow; now?: () => Date } = {},
): Promise<void> {
  const ping = deps.ping ?? pingIndexNow;
  const now = deps.now ?? (() => new Date());
  const store = deps.store !== undefined ? deps.store : getIndexNowStore();
  let live = false;
  let toSend = paths;
  if (store) {
    try {
      await store.enqueue(paths, reason);
      live = true;
    } catch (err) {
      // tables not applied yet, or a blip: today's behaviour, ping only
      if (!/does not exist|could not find/i.test(String(err))) console.warn('[indexnow-outbox] fast path enqueue failed:', err instanceof Error ? err.message : err);
    }
    if (live) {
      try {
        const last = await store.lastSubmitted(paths.map((p) => normalizeUrl(p)).filter((u): u is string => !!u));
        const t = now().getTime();
        toSend = paths.filter((p) => {
          const at = last.get(normalizeUrl(p) ?? '');
          return !at || t - Date.parse(at) >= RESUBMIT_WINDOW_MS;
        });
      } catch {
        toSend = paths;
      }
    }
  }
  if (toSend.length === 0) return;
  try {
    const startedAt = now().toISOString();
    const res = await ping(toSend);
    if (live && store && res.ok && !res.dryRun) {
      const urls = toSend.map((p) => normalizeUrl(p)).filter((u): u is string => !!u);
      await store.markUrlsSubmitted(urls, res.statuses?.[0] ?? 200, startedAt).catch((err: unknown) => {
        console.warn('[indexnow-outbox] fast path mark failed:', err instanceof Error ? err.message : err);
      });
    }
  } catch (err) {
    console.warn('[indexnow-outbox] fast path ping failed:', err instanceof Error ? err.message : err);
  }
}

// ----- the hourly flush ------------------------------------------------------------------

export interface FlushReport {
  ok: boolean;
  skipped?: 'not_live' | 'backoff';
  backoffUntil?: string;
  dryRun: boolean;
  pending: number;
  sent: number;
  batches: number;
  statuses: number[];
  covered: number;
  deferred: number;
  gaveUp: number;
  stoppedOn?: number;
}

export interface FlushOptions {
  now?: Date;
  dryRun?: boolean;
  /** Submit one URL only (the owner's single real test). It is enqueued first. */
  onlyUrl?: string;
  /** URLs sent per run at most (default two IndexNow batches). */
  maxUrls?: number;
  batchSize?: number;
  post?: (urls: string[]) => Promise<{ status: number; retryAfter: string | null }>;
}

/**
 * One flush: dedupe the pending rows, settle the covered and the given-up ones, wait out a
 * 429 back-off, send the rest in batches of at most 10,000 URLs, record every answer. Stops at
 * the first 429 (back-off event), 400, 403 or 422 (alert event) or network failure. Dry run:
 * plans and records, sends nothing and changes no row.
 */
export async function flushOutbox(store: IndexNowStore, opts: FlushOptions = {}): Promise<FlushReport> {
  const now = opts.now ?? new Date();
  const dryRun = opts.dryRun ?? isIndexNowDryRun();
  const batchSize = Math.min(opts.batchSize ?? INDEXNOW_BATCH_MAX, INDEXNOW_BATCH_MAX);
  const maxUrls = opts.maxUrls ?? 2 * INDEXNOW_BATCH_MAX;
  const post = opts.post ?? ((urls: string[]) => postIndexNowBatch(urls));
  const report: FlushReport = { ok: true, dryRun, pending: 0, sent: 0, batches: 0, statuses: [], covered: 0, deferred: 0, gaveUp: 0 };

  const recent = await store.events(['backoff', 'flush'], 50);
  const bo = backoffState(recent, now);
  if (bo.active) {
    return { ...report, skipped: 'backoff', ...(bo.until ? { backoffUntil: bo.until.toISOString() } : {}) };
  }

  let only: string | null = null;
  if (opts.onlyUrl) {
    only = normalizeUrl(opts.onlyUrl);
    if (!only) throw new Error('onlyUrl is not a kpopquiz.org URL');
    await store.enqueue([pathOf(only)], 'manual');
  }

  let rows = await store.pending(only ? 100000 : maxUrls * 2);
  if (only) rows = rows.filter((r) => (normalizeUrl(r.url) ?? r.url) === only);
  report.pending = rows.length;
  const plan = planFlush(rows, await store.lastSubmitted(), now);
  report.covered = plan.covered.length;
  report.deferred = plan.deferred.length;
  report.gaveUp = plan.gaveUp.length;
  const toSend = plan.send.slice(0, maxUrls);

  if (dryRun) {
    const batches = chunk(toSend, batchSize).length;
    console.info(`[indexnow-flush] dry run: would send ${toSend.length} URL(s) in ${batches} batch(es); covered ${plan.covered.length}, deferred ${plan.deferred.length}, given up ${plan.gaveUp.length}`);
    await store.event('flush', null, { dryRun: true, wouldSend: toSend.length, batches, covered: plan.covered.length, deferred: plan.deferred.length, gaveUp: plan.gaveUp.length, sample: toSend.slice(0, 10).map((s) => s.url) });
    return { ...report, batches };
  }

  await store.settle(plan.covered, plan.gaveUp);
  if (plan.gaveUp.length > 0) {
    console.error(`[indexnow-flush] ALERT: ${plan.gaveUp.length} outbox row(s) given up after repeated failures`);
    await store.event('alert', null, { reason: 'gave_up', rows: plan.gaveUp.length });
  }

  for (const batch of chunk(toSend, batchSize)) {
    const urls = batch.map((b) => b.url);
    const ids = batch.flatMap((b) => b.ids);
    const startedAt = new Date().toISOString();
    const { status, retryAfter } = await post(urls);
    report.statuses.push(status);
    report.batches += 1;
    const cls = classifyStatus(status);
    await store.recordAttempt(ids, status, cls === 'ok', startedAt);
    if (cls === 'ok') { report.sent += urls.length; continue; }
    report.ok = false;
    report.stoppedOn = status;
    if (cls === 'backoff') {
      const next = nextBackoff(bo.consecutive + 1, retryAfter, now);
      report.backoffUntil = next.until.toISOString();
      console.warn(`[indexnow-flush] 429 from IndexNow: waiting until ${report.backoffUntil} (${next.consecutive} in a row)`);
      await store.event('backoff', status, { until: report.backoffUntil, consecutive: next.consecutive, retryAfter });
    } else if (cls === 'alert') {
      console.error(`[indexnow-flush] ALERT: IndexNow answered ${status} for a batch of ${urls.length} URL(s)`);
      await store.event('alert', status, { reason: `indexnow_${status}`, urls: urls.length, sample: urls.slice(0, 5) });
    } else {
      console.warn(`[indexnow-flush] IndexNow answered ${status}: retrying next run`);
    }
    break;
  }

  await store.event('flush', report.stoppedOn ?? (report.statuses[0] ?? null), {
    ok: report.ok, sent: report.sent, batches: report.batches, statuses: report.statuses,
    covered: report.covered, deferred: report.deferred, gaveUp: report.gaveUp, pending: report.pending,
    ...(only ? { onlyUrl: only } : {}),
  });
  await store.prune(now).catch(() => undefined);
  return report;
}
