// Bing AI Performance exports (Copilot and Bing AI answers), monthly upload on
// /admin/seo/import (SEO Mission 3, part C). Pure: the page parses in the browser and the API
// route parses again on the server, with the same functions.
//
// The queries export, as Bing Webmaster gave it on 2026-10-14 (docs/seo/bing-2026-10-14/
// AISearchQueriesReport.csv): UTF-8 with a BOM, CRLF lines, every field quoted, header
//   "Grounding Query","Intent","Topic","Citations","Citation Share"
// with shares written "25.01%". The pages export is matched the same way, by header names
// (a URL or Page column, a Citations column, an optional share column).
//
// Per query family (a TARGETS.md cluster, see targets.ts):
//   citations      sum of the citations of the family's queries
//   implied total  sum over its queries of citations / share: how many citations Bing gave
//                  all sites for those queries (the share is ours of that total)
//   share          citations / implied total, over the queries that have a share
//   gap            implied total - citations: the citations that went to other sites
// A query with no share (empty or 0%) cannot imply a total: its citations are counted, and
// left out of the implied total, the share and the gap ("citations without share").
// Example (Bing, 14 October 2026): "kpop games" 453 citations at 5.13% implies 8,830, a gap
// of 8,377, the "about 8,400 citations going elsewhere" of the SEO plan.

import { clusterMatcher } from './targets';

import type { TargetCluster } from './targets';

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and new lines inside quotes, BOM, CRLF. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

/**
 * A count as Bing or a spreadsheet writes it: "1,234", "1 234", "1.234" (thousands), "453".
 * Null when it is not a whole non-negative number.
 */
export function parseCount(raw: string): number | null {
  const s = raw.trim().replace(/[\s  ]/g, '');
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d{1,3}([,.]\d{3})+$/.test(s)) return Number(s.replace(/[,.]/g, ''));
  return null;
}

/**
 * A share as a fraction: "25.01%" and "25,01 %" give 0.2501, "0.2501" gives 0.2501, "37" gives
 * 0.37 (a bare whole number is read as a percent). Null when empty, unreadable or above 100%.
 */
export function parseShare(raw: string): number | null {
  const s = raw.trim().replace(/[\s  ]/g, '');
  if (!s) return null;
  const percent = s.endsWith('%');
  const n = Number(s.replace('%', '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  // A bare whole number ("37", "1") is a percent too; only a decimal up to 1 is a fraction.
  const v = percent || n > 1 || (Number.isInteger(n) && n !== 0) ? n / 100 : n;
  return v <= 1 ? Math.round(v * 1e6) / 1e6 : null;
}

export interface AiQueryRow {
  query: string;
  intent: string;
  topic: string;
  citations: number;
  share: number | null;
}

export interface AiPageRow {
  url: string;
  citations: number;
  share: number | null;
}

export interface ParseResult<T> {
  rows: T[];
  skipped: number;
  error: string | null;
}

function headerIndex(header: string[], tests: RegExp[]): number {
  const h = header.map((c) => c.trim().toLowerCase());
  for (const t of tests) {
    const i = h.findIndex((c) => t.test(c));
    if (i >= 0) return i;
  }
  return -1;
}

const SHARE_HEADERS = [/^citation share$/, /share/, /^part/];
const CITATION_HEADERS = [/^citations$/, /^citations? count$/, /citation(?!.*share)/];

export const MAX_QUERY_LENGTH = 500;
export const MAX_URL_LENGTH = 2000;

export function parseAiQueriesCsv(text: string): ParseResult<AiQueryRow> {
  const rows = parseCsv(text);
  if (rows.length === 0) return { rows: [], skipped: 0, error: 'Fichier vide.' };
  const header = rows[0]!;
  const qi = headerIndex(header, [/^grounding query$/, /query/, /requ[eê]te/]);
  const ci = headerIndex(header, CITATION_HEADERS);
  if (qi < 0 || ci < 0) return { rows: [], skipped: 0, error: 'Colonnes introuvables: il faut "Grounding Query" et "Citations" (export Requêtes de Bing AI Performance).' };
  const si = headerIndex(header, SHARE_HEADERS);
  const ii = headerIndex(header, [/^intent$/, /intent/]);
  const ti = headerIndex(header, [/^topic$/, /topic/]);
  const out: AiQueryRow[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const query = (r[qi] ?? '').trim();
    const citations = parseCount(r[ci] ?? '');
    if (!query || query.length > MAX_QUERY_LENGTH || citations === null || seen.has(query)) {
      skipped++;
      continue;
    }
    seen.add(query);
    out.push({
      query,
      intent: ii >= 0 ? (r[ii] ?? '').trim().slice(0, 80) : '',
      topic: ti >= 0 ? (r[ti] ?? '').trim().slice(0, 120) : '',
      citations,
      share: si >= 0 ? parseShare(r[si] ?? '') : null,
    });
  }
  return { rows: out, skipped, error: out.length === 0 ? 'Aucune ligne lisible.' : null };
}

export function parseAiPagesCsv(text: string): ParseResult<AiPageRow> {
  const rows = parseCsv(text);
  if (rows.length === 0) return { rows: [], skipped: 0, error: 'Fichier vide.' };
  const header = rows[0]!;
  const ui = headerIndex(header, [/^url$/, /^page$/, /url/, /page/]);
  const ci = headerIndex(header, CITATION_HEADERS);
  if (ui < 0 || ci < 0) return { rows: [], skipped: 0, error: 'Colonnes introuvables: il faut une colonne URL (ou Page) et "Citations" (export Pages de Bing AI Performance).' };
  const si = headerIndex(header, SHARE_HEADERS);
  const out: AiPageRow[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const url = (r[ui] ?? '').trim();
    const citations = parseCount(r[ci] ?? '');
    if (!url || url.length > MAX_URL_LENGTH || citations === null || seen.has(url)) {
      skipped++;
      continue;
    }
    seen.add(url);
    out.push({ url, citations, share: si >= 0 ? parseShare(r[si] ?? '') : null });
  }
  return { rows: out, skipped, error: out.length === 0 ? 'Aucune ligne lisible.' : null };
}

export interface FamilyStat {
  /** The cluster name, or "other" / "total". */
  id: string;
  label: string;
  url: string;
  queryCount: number;
  citations: number;
  /** Citations of the queries that came with a share (the base of share and gap). */
  citationsWithShare: number;
  impliedTotal: number | null;
  share: number | null;
  gap: number | null;
  /** The family's most cited queries, at most 5. */
  topQueries: string[];
}

export interface FamilyReport {
  families: FamilyStat[];
  other: FamilyStat;
  total: FamilyStat;
}

function stat(id: string, label: string, url: string, rows: AiQueryRow[]): FamilyStat {
  let citations = 0;
  let withShare = 0;
  let implied = 0;
  for (const r of rows) {
    citations += r.citations;
    if (r.share !== null && r.share > 0) {
      withShare += r.citations;
      implied += r.citations / r.share;
    }
  }
  const hasImplied = implied > 0;
  return {
    id,
    label,
    url,
    queryCount: rows.length,
    citations,
    citationsWithShare: withShare,
    impliedTotal: hasImplied ? implied : null,
    share: hasImplied ? withShare / implied : null,
    gap: hasImplied ? implied - withShare : null,
    topQueries: [...rows].sort((a, b) => b.citations - a.citations).slice(0, 5).map((r) => r.query),
  };
}

/** The family table: one row per cluster with at least one query, then "other" and the total. */
export function computeFamilies(rows: AiQueryRow[], clusters: TargetCluster[]): FamilyReport {
  const match = clusterMatcher(clusters);
  const byCluster = new Map<number, AiQueryRow[]>();
  const other: AiQueryRow[] = [];
  for (const r of rows) {
    const m = match(r.query);
    if (!m) {
      other.push(r);
      continue;
    }
    const i = clusters.indexOf(m.cluster);
    const list = byCluster.get(i) ?? [];
    list.push(r);
    byCluster.set(i, list);
  }
  const families = [...byCluster.entries()]
    .map(([i, list]) => stat(clusters[i]!.cluster, clusters[i]!.cluster, clusters[i]!.url, list))
    .sort((a, b) => b.citations - a.citations || a.id.localeCompare(b.id));
  return {
    families,
    other: stat('other', 'Autres requêtes', '', other),
    total: stat('total', 'Total', '', rows),
  };
}

export interface FamilyDelta {
  id: string;
  /** Share change in percentage points (current - previous), null when one side has no share. */
  sharePoints: number | null;
  citationsDelta: number;
}

/** Month over month, by family id. A family absent last month compares with nothing. */
export function compareFamilies(current: FamilyReport, previous: FamilyReport | null): Map<string, FamilyDelta> {
  const out = new Map<string, FamilyDelta>();
  if (!previous) return out;
  const prev = new Map<string, FamilyStat>([...previous.families, previous.other, previous.total].map((f) => [f.id, f]));
  for (const f of [...current.families, current.other, current.total]) {
    const p = prev.get(f.id);
    if (!p) continue;
    out.set(f.id, {
      id: f.id,
      sharePoints: f.share !== null && p.share !== null ? Math.round((f.share - p.share) * 1000) / 10 : null,
      citationsDelta: f.citations - p.citations,
    });
  }
  return out;
}
