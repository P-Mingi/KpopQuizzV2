// Storage of the monthly Bing AI Performance import (/admin/seo/import, SEO Mission 3 part C):
// seo_bing_ai_queries and seo_bing_ai_pages, from docs/pending-migrations/seo-weekly-data.sql.
// Until the owner applies it, a save answers { ok: false, reason: 'table_missing' } and the page
// still shows the families it computed in the browser.

import { MAX_QUERY_LENGTH, MAX_URL_LENGTH } from './ai-performance';
import { isMissingTable, MissingTableError } from './store';

import type { AiPageRow, AiQueryRow } from './ai-performance';
import type { StoreResult } from './store';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MAX_IMPORT_ROWS = 20_000;

export interface ImportPayload {
  /** First day of the month the export covers ("2026-09-01"). */
  month: string;
  queries: AiQueryRow[];
  pages: AiPageRow[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1e9;
const isShare = (v: unknown): v is number | null => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1);

/** "2026-09" or "2026-09-01" to "2026-09-01"; null otherwise. */
export function monthStart(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = /^(\d{4})-(\d{2})(?:-01)?$/.exec(raw.trim());
  if (!m) return null;
  const mm = Number(m[2]);
  if (mm < 1 || mm > 12) return null;
  return `${m[1]}-${m[2]}-01`;
}

/** The posted body, checked field by field. Rows that do not fit are refused, not repaired. */
export function validateImportPayload(body: unknown): ImportPayload | { error: string } {
  if (!isObj(body)) return { error: 'Corps de requête illisible.' };
  const month = monthStart(body.month);
  if (!month) return { error: 'Mois invalide (attendu AAAA-MM).' };
  const rawQ = Array.isArray(body.queries) ? body.queries : [];
  const rawP = Array.isArray(body.pages) ? body.pages : [];
  if (rawQ.length === 0 && rawP.length === 0) return { error: 'Aucune ligne à enregistrer.' };
  if (rawQ.length > MAX_IMPORT_ROWS || rawP.length > MAX_IMPORT_ROWS) return { error: `Trop de lignes (maximum ${MAX_IMPORT_ROWS}).` };
  const queries: AiQueryRow[] = [];
  const seenQ = new Set<string>();
  for (const r of rawQ) {
    if (!isObj(r) || typeof r.query !== 'string' || !isCount(r.citations) || !isShare(r.share ?? null)) return { error: 'Ligne de requête invalide.' };
    const query = r.query.trim();
    if (!query || query.length > MAX_QUERY_LENGTH || seenQ.has(query)) return { error: 'Requête vide, trop longue ou en double.' };
    seenQ.add(query);
    queries.push({
      query,
      intent: typeof r.intent === 'string' ? r.intent.slice(0, 80) : '',
      topic: typeof r.topic === 'string' ? r.topic.slice(0, 120) : '',
      citations: r.citations,
      share: (r.share ?? null) as number | null,
    });
  }
  const pages: AiPageRow[] = [];
  const seenP = new Set<string>();
  for (const r of rawP) {
    if (!isObj(r) || typeof r.url !== 'string' || !isCount(r.citations) || !isShare(r.share ?? null)) return { error: 'Ligne de page invalide.' };
    const url = r.url.trim();
    if (!url || url.length > MAX_URL_LENGTH || seenP.has(url)) return { error: 'URL vide, trop longue ou en double.' };
    seenP.add(url);
    pages.push({ url, citations: r.citations, share: (r.share ?? null) as number | null });
  }
  return { month, queries, pages };
}

function fail(table: string, error: { code?: string; message?: string }): StoreResult {
  if (isMissingTable(error)) return { ok: false, reason: 'table_missing', detail: table };
  return { ok: false, reason: 'error', detail: `${table}: ${error.code ?? ''}`.trim() };
}

/**
 * Replace the month: its previous rows go, the new ones come in. A tab that was not uploaded
 * (empty list) keeps what it had.
 */
export async function saveAiImport(db: SupabaseClient, p: ImportPayload): Promise<StoreResult> {
  let total = 0;
  const parts: Array<[string, Record<string, unknown>[]]> = [
    ['seo_bing_ai_queries', p.queries.map((r) => ({ month: p.month, query: r.query, intent: r.intent, topic: r.topic, citations: r.citations, citation_share: r.share }))],
    ['seo_bing_ai_pages', p.pages.map((r) => ({ month: p.month, url: r.url, citations: r.citations, citation_share: r.share }))],
  ];
  for (const [table, rows] of parts) {
    if (rows.length === 0) continue;
    const del = await db.from(table).delete().eq('month', p.month);
    if (del.error) return fail(table, del.error);
    for (let i = 0; i < rows.length; i += 1000) {
      const { error } = await db.from(table).insert(rows.slice(i, i + 1000));
      if (error) return fail(table, error);
    }
    total += rows.length;
  }
  return { ok: true, rows: total };
}

/** The months imported, newest first (at most `max`). Throws MissingTableError. */
export async function readAiMonths(db: SupabaseClient, max = 12): Promise<string[]> {
  const months: string[] = [];
  let before: string | null = null;
  for (let i = 0; i < max; i++) {
    let qb = db.from('seo_bing_ai_queries').select('month');
    if (before) qb = qb.lt('month', before);
    const { data, error } = await qb.order('month', { ascending: false }).limit(1);
    if (error) {
      if (isMissingTable(error)) throw new MissingTableError('seo_bing_ai_queries');
      throw new Error(`seo_bing_ai_queries: ${error.code ?? 'read failed'}`);
    }
    const m = (data?.[0] as { month?: string } | undefined)?.month;
    if (!m) break;
    months.push(m);
    before = m;
  }
  return months;
}

async function readAll<T>(db: SupabaseClient, table: string, columns: string, month: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < MAX_IMPORT_ROWS; from += 1000) {
    const { data, error } = await db.from(table).select(columns).eq('month', month).order('id').range(from, from + 999);
    if (error) {
      if (isMissingTable(error)) throw new MissingTableError(table);
      throw new Error(`${table}: ${error.code ?? 'read failed'}`);
    }
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export async function readAiQueries(db: SupabaseClient, month: string): Promise<AiQueryRow[]> {
  const rows = await readAll<{ query: string; intent: string; topic: string; citations: number; citation_share: number | null }>(db, 'seo_bing_ai_queries', 'query, intent, topic, citations, citation_share', month);
  return rows.map((r) => ({ query: r.query, intent: r.intent, topic: r.topic, citations: r.citations, share: r.citation_share }));
}

export async function readAiPages(db: SupabaseClient, month: string): Promise<AiPageRow[]> {
  const rows = await readAll<{ url: string; citations: number; citation_share: number | null }>(db, 'seo_bing_ai_pages', 'url, citations, citation_share', month);
  return rows.map((r) => ({ url: r.url, citations: r.citations, share: r.citation_share }));
}
