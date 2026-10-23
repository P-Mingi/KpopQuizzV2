// Database side of the weekly SEO data (SEO Mission 3, part C). The tables come from
// docs/pending-migrations/seo-weekly-data.sql, which is applied only on the owner's go: every
// function here reports a missing table as { ok: false, reason: 'table_missing' } (writes) or
// throws MissingTableError (reads), and the callers turn that into a quiet skip.
//
// Reads go through the service role on the server only; the tables have RLS on with no policy.

import { createHash } from 'node:crypto';

import type { BingLinkRow, BingWeeklyRow } from './bing';
import type { GscRow } from './gsc';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PgError {
  code?: string;
  message?: string;
}

// undefined_table, undefined_column + PostgREST schema-cache misses (as lib/ranked/db.ts).
const MISSING_SCHEMA = new Set(['42P01', '42703', 'PGRST200', 'PGRST204', 'PGRST205']);

export function isMissingTable(err: PgError | null | undefined): boolean {
  return !!err && typeof err.code === 'string' && MISSING_SCHEMA.has(err.code);
}

export class MissingTableError extends Error {
  constructor(table: string) {
    super(`table missing: ${table}`);
    this.name = 'MissingTableError';
  }
}

/** sha1 of the dimensions: a short fixed key for the unique constraint, whatever their length. */
export function rowKey(...parts: string[]): string {
  return createHash('sha1').update(parts.join('\u0001')).digest('hex');
}

export type StoreResult = { ok: true; rows: number } | { ok: false; reason: 'table_missing' | 'error'; detail: string };

const CHUNK = 1000;

async function upsertChunks(db: SupabaseClient, table: string, rows: Record<string, unknown>[], onConflict: string): Promise<StoreResult> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) {
      if (isMissingTable(error)) return { ok: false, reason: 'table_missing', detail: table };
      return { ok: false, reason: 'error', detail: `${table}: ${error.code ?? ''} ${error.message ?? ''}`.trim().slice(0, 200) };
    }
  }
  return { ok: true, rows: rows.length };
}

/** The rows of one ISO week, replacing what an earlier pull stored for the same keys. */
export function gscRecords(weekStart: string, rows: GscRow[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const key = rowKey(r.query, r.page, r.country, r.device);
    byKey.set(key, {
      week_start: weekStart,
      row_key: key,
      query: r.query,
      page: r.page,
      country: r.country,
      device: r.device,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
      pulled_at: new Date().toISOString(),
    });
  }
  return [...byKey.values()];
}

export function upsertGscWeek(db: SupabaseClient, weekStart: string, rows: GscRow[]): Promise<StoreResult> {
  return upsertChunks(db, 'seo_gsc_weekly', gscRecords(weekStart, rows), 'week_start,row_key');
}

export function bingRecords(rows: BingWeeklyRow[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const key = rowKey(r.query, r.page);
    byKey.set(`${r.weekStart}|${r.kind}|${key}`, {
      week_start: r.weekStart,
      kind: r.kind,
      row_key: key,
      query: r.query,
      page: r.page,
      clicks: r.clicks,
      impressions: r.impressions,
      avg_click_position: r.avgClickPosition,
      avg_impression_position: r.avgImpressionPosition,
      pulled_at: new Date().toISOString(),
    });
  }
  return [...byKey.values()];
}

export function upsertBingWeekly(db: SupabaseClient, rows: BingWeeklyRow[]): Promise<StoreResult> {
  return upsertChunks(db, 'seo_bing_weekly', bingRecords(rows), 'week_start,kind,row_key');
}

/**
 * Links seen this Monday. A link keeps the first Monday it was ever seen (read before the
 * upsert), so "new referring domains" means new, not "seen again".
 */
export async function upsertBingLinks(db: SupabaseClient, links: BingLinkRow[], seenMonday: string): Promise<StoreResult> {
  const byKey = new Map<string, BingLinkRow>();
  for (const l of links) byKey.set(rowKey(l.targetUrl, l.sourceUrl), l);
  const keys = [...byKey.keys()];
  const firstSeen = new Map<string, string>();
  for (let i = 0; i < keys.length; i += 200) {
    const { data, error } = await db.from('seo_bing_links').select('row_key, first_seen').in('row_key', keys.slice(i, i + 200));
    if (error) {
      if (isMissingTable(error)) return { ok: false, reason: 'table_missing', detail: 'seo_bing_links' };
      return { ok: false, reason: 'error', detail: `seo_bing_links: ${error.code ?? ''} ${error.message ?? ''}`.trim().slice(0, 200) };
    }
    for (const r of (data ?? []) as Array<{ row_key: string; first_seen: string }>) firstSeen.set(r.row_key, r.first_seen);
  }
  const records = keys.map((key) => {
    const l = byKey.get(key)!;
    return {
      row_key: key,
      target_url: l.targetUrl,
      source_url: l.sourceUrl,
      source_domain: l.sourceDomain,
      anchor_text: l.anchorText,
      first_seen: firstSeen.get(key) ?? seenMonday,
      last_seen: seenMonday,
    };
  });
  return upsertChunks(db, 'seo_bing_links', records, 'row_key');
}

/** One line in seo_weekly_runs. Never throws: the log is a convenience, not a gate. */
export async function logRun(db: SupabaseClient, source: 'gsc' | 'bing' | 'report', status: 'ok' | 'skipped' | 'error', rowCount: number, detail: string): Promise<void> {
  try {
    await db.from('seo_weekly_runs').insert({ source, status, row_count: Math.max(0, Math.round(rowCount)), detail: detail.slice(0, 300) });
  } catch {
    // ignore
  }
}
