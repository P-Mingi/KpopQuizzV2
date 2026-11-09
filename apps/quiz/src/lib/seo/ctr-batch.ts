// Audit 04 section 2 (P1-5, owner 2026-11-09): the position 4 to 10 procedure as pure functions. The CLI is scripts/seo-ctr-batch.mts;
// everything that decides lives here so fixtures test it. No import: it runs under tsx and under vitest alike.
//
//   pick     the site's own CTR curve from non-brand queries, the pages that sit at position 4 to 10 with a CTR far under it,
//            scored by the clicks they leave behind; the top 20 are the batch, the next 20 an untouched control group.
//   check    a proposal is refused when the title is over 49 characters, the description is outside 120 to 160, it has a dash, a
//            typed number, an unreviewed year, a duplicate, or it drops the head term.
//   measure  21 days after deploy + 3 against the 21 days before, minus the control ratio: win, loss (revert) or keep.

// ----------------------------------------------------------------------------------------------------------------------
// Search Console exports

export interface GscRow { key: string; clicks: number; impressions: number; ctr: number; position: number }

/** One CSV line into cells, with quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

const num = (s: string | undefined): number => {
  const t = (s ?? '').replace(/[%,\s]/g, '');
  const v = Number(t);
  return Number.isFinite(v) ? v : 0;
};

/**
 * A Search Console export (Pages or Queries tab, "Top pages" / "Top queries", Clicks, Impressions, CTR, Position). The CTR is
 * read as a share (4.21% becomes 0.0421), or recomputed from the clicks and impressions when the column is absent.
 */
export function parseGscCsv(text: string): GscRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const head = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const col = (...names: string[]): number => head.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
  const iKey = col('top pages', 'top queries', 'page', 'query', 'pages', 'queries');
  const iClicks = col('clicks');
  const iImp = col('impressions');
  const iCtr = col('ctr');
  const iPos = col('position');
  if (iKey < 0 || iClicks < 0 || iImp < 0 || iPos < 0) return [];
  const rows: GscRow[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line);
    const clicks = num(c[iClicks]);
    const impressions = num(c[iImp]);
    const ctr = iCtr >= 0 && (c[iCtr] ?? '').includes('%') ? num(c[iCtr]) / 100 : iCtr >= 0 && c[iCtr] ? num(c[iCtr]) : impressions > 0 ? clicks / impressions : 0;
    rows.push({ key: (c[iKey] ?? '').trim(), clicks, impressions, ctr, position: num(c[iPos]) });
  }
  return rows.filter((r) => r.key.length > 0);
}

/** Per-page queries: the export of one page filtered on a query list ("page", "query", clicks, impressions, position). */
export interface PageQuery { page: string; query: string; clicks: number; impressions: number; position: number }

// ----------------------------------------------------------------------------------------------------------------------
// The site's own CTR curve

const BRAND = /kpopquiz|kpop-quiz\.org|kpopquiz\.org/i;
export const CURVE_MIN_IMPRESSIONS = 20;

/** A query that names the site itself ("kpopquiz", "kpopquiz.org"). "kpop quiz" is the head term, not the brand. */
export const isBrandQuery = (q: string): boolean => BRAND.test(q);

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length === 0 ? 0 : s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Median CTR per rounded position (1 to 10), over non-brand queries with 20+ impressions, forced non-increasing. Index 0 is position 1. */
export function buildCurve(queries: readonly GscRow[]): number[] {
  const byPos: number[][] = Array.from({ length: 10 }, () => []);
  for (const q of queries) {
    if (isBrandQuery(q.key) || q.impressions < CURVE_MIN_IMPRESSIONS) continue;
    const p = Math.round(q.position);
    if (p >= 1 && p <= 10) byPos[p - 1]!.push(q.ctr);
  }
  const raw = byPos.map(median);
  // Forced non-increasing: a position never expects more than the one above it; an empty position takes the one above it.
  // Positions above the first one with data take its value (the curve never rises), the others the minimum so far.
  const first = raw.find((v) => v > 0) ?? 0;
  const out: number[] = [];
  let prev = first;
  for (const v of raw) {
    prev = v > 0 ? Math.min(v, prev) : prev;
    out.push(prev);
  }
  return out;
}

/** The CTR the curve expects at a position (rounded, clamped to 1..10). */
export function expectedCtr(curve: readonly number[], position: number): number {
  const p = Math.min(10, Math.max(1, Math.round(position)));
  return curve[p - 1] ?? 0;
}

// ----------------------------------------------------------------------------------------------------------------------
// Picking the batch

export interface Candidate { page: string; clicks: number; impressions: number; ctr: number; position: number; expected: number; score: number }
export interface PickOptions {
  minImpressions?: number;          // default 300 (28 days)
  minPosition?: number;             // default 4.0
  maxPosition?: number;             // default 10.9
  ratio?: number;                   // default 0.75
  batchSize?: number;               // default 20
  /** Pages whose title changed in the last 28 days. */
  recentlyChanged?: ReadonlySet<string>;
  /** Pages by clicks that join only with the owner's OK. */
  includeTop?: boolean;
  topN?: number;                    // default 20
}

/** The score is the clicks a page leaves behind: impressions x (expected CTR minus actual CTR). */
export function pickBatch(pages: readonly GscRow[], curve: readonly number[], opts: PickOptions = {}): { batch: Candidate[]; control: Candidate[]; excludedTop: string[] } {
  const minImp = opts.minImpressions ?? 300;
  const lo = opts.minPosition ?? 4;
  const hi = opts.maxPosition ?? 10.9;
  const ratio = opts.ratio ?? 0.75;
  const size = opts.batchSize ?? 20;
  const top = new Set([...pages].sort((a, b) => b.clicks - a.clicks || a.key.localeCompare(b.key)).slice(0, opts.topN ?? 20).map((p) => p.key));
  const excludedTop: string[] = [];
  const cands: Candidate[] = [];
  for (const p of pages) {
    if (p.impressions < minImp || p.position < lo || p.position > hi) continue;
    if (opts.recentlyChanged?.has(p.key)) continue;
    const expected = expectedCtr(curve, p.position);
    if (!(p.ctr < ratio * expected)) continue;
    if (top.has(p.key) && !opts.includeTop) { excludedTop.push(p.key); continue; }
    cands.push({ page: p.key, clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position, expected, score: p.impressions * (expected - p.ctr) });
  }
  cands.sort((a, b) => b.score - a.score || a.page.localeCompare(b.page));
  return { batch: cands.slice(0, size), control: cands.slice(size, size * 2), excludedTop: excludedTop.sort() };
}

/** The top queries of a page that are not the brand, most impressions first. */
export function topQueries(rows: readonly PageQuery[], page: string, n = 3): PageQuery[] {
  return rows.filter((r) => r.page === page && !isBrandQuery(r.query)).sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query)).slice(0, n);
}

// ----------------------------------------------------------------------------------------------------------------------
// The proposal check

export const BATCH_TITLE_MAX = 49;
export const BATCH_DESC_MIN = 120;
export const BATCH_DESC_MAX = 160;

export interface Proposal {
  page: string;
  title: string;
  description: string;
  /** The head term of the page's top non-brand query ("bts quiz"): the new title keeps all its words. */
  headTerm: string;
}
export interface CheckContext {
  /** Titles already live elsewhere on the site (lowercase compared). */
  existingTitles?: readonly string[];
  /** Years with a dated review of the page's content. */
  reviewedYears?: readonly number[];
}

const DASH = /[–—]/;
const words = (s: string): string[] => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);

/** A typed number: 2 or more digits standing alone, or any number with a plus or a thousands comma ("450+", "4,200"). Ordinals ("5th"), names ("2NE1") and one digit pass. */
export function typedNumbers(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(?<![A-Za-z0-9])(\d[\d,]*\+|\d{1,3}(?:,\d{3})+|\d{2,})(?![A-Za-z0-9])/g)) {
    if (/^(19|20)\d{2}$/.test(m[1]!)) continue; // years have their own rule
    out.push(m[1]!);
  }
  return out;
}

/** Every reason a batch of proposals is refused ([] = clean). */
export function checkProposals(proposals: readonly Proposal[], ctx: CheckContext = {}): string[] {
  const out: string[] = [];
  const seen = new Map<string, string>();
  const existing = new Set((ctx.existingTitles ?? []).map((t) => t.toLowerCase().trim()));
  for (const p of proposals) {
    const at = (m: string): void => { out.push(`${p.page}: ${m}`); };
    if (p.title.length > BATCH_TITLE_MAX) at(`title is ${p.title.length} characters, over ${BATCH_TITLE_MAX}`);
    if (p.title.length === 0) at('title is empty');
    if (p.description.length < BATCH_DESC_MIN || p.description.length > BATCH_DESC_MAX) at(`description is ${p.description.length} characters, outside ${BATCH_DESC_MIN} to ${BATCH_DESC_MAX}`);
    if (DASH.test(p.title) || DASH.test(p.description)) at('has an en or em dash');
    const nums = [...typedNumbers(p.title), ...typedNumbers(p.description)];
    if (nums.length) at(`has a typed number (${nums.join(', ')}): counts come from the shared helper`);
    for (const y of [...p.title.matchAll(/\b(20\d{2})\b/g), ...p.description.matchAll(/\b(20\d{2})\b/g)]) {
      if (!(ctx.reviewedYears ?? []).includes(Number(y[1]))) at(`has the year ${y[1]} without a dated review`);
    }
    const key = p.title.toLowerCase().trim();
    if (seen.has(key)) at(`title duplicates the one proposed for ${seen.get(key)}`);
    else seen.set(key, p.page);
    if (existing.has(key)) at('title duplicates a live title');
    const have = new Set(words(p.title));
    const missing = words(p.headTerm).filter((w) => !have.has(w));
    if (missing.length) at(`drops the head term "${p.headTerm}" (missing: ${missing.join(', ')})`);
    if (!new Set(words(p.description)).has(words(p.headTerm)[0] ?? '')) at(`the description does not use the head term "${p.headTerm}"`);
  }
  return out;
}

// ----------------------------------------------------------------------------------------------------------------------
// Measuring a batch

export interface PagePeriod { clicks: number; impressions: number; position: number }
export type Verdict = 'win' | 'loss' | 'keep';
export interface Measure { page: string; ctrBefore: number; ctrAfter: number; ratio: number; controlRatio: number; delta: number; positionShift: number; verdict: Verdict }

const ctrOf = (p: PagePeriod): number => (p.impressions > 0 ? p.clicks / p.impressions : 0);

/**
 * Win: the CTR ratio minus the control ratio is +15% or more and the position moved by 1.0 at most. Loss: -10% or worse (a revert PR).
 * Anything else: keep. The control is the pooled CTR of the control pages, after over before: it absorbs the award-season swings.
 */
export function measureBatch(
  batch: readonly { page: string; before: PagePeriod; after: PagePeriod }[],
  control: readonly { before: PagePeriod; after: PagePeriod }[],
): { measures: Measure[]; revert: string[]; controlRatio: number } {
  const sum = (xs: readonly PagePeriod[]): PagePeriod => ({
    clicks: xs.reduce((a, x) => a + x.clicks, 0), impressions: xs.reduce((a, x) => a + x.impressions, 0), position: xs.length ? xs.reduce((a, x) => a + x.position, 0) / xs.length : 0,
  });
  const cb = ctrOf(sum(control.map((c) => c.before)));
  const ca = ctrOf(sum(control.map((c) => c.after)));
  const controlRatio = cb > 0 ? ca / cb - 1 : 0;
  const measures: Measure[] = batch.map((b) => {
    const before = ctrOf(b.before);
    const after = ctrOf(b.after);
    const ratio = before > 0 ? after / before - 1 : 0;
    const delta = ratio - controlRatio;
    const positionShift = b.after.position - b.before.position;
    const verdict: Verdict = before === 0 ? 'keep' : delta <= -0.1 ? 'loss' : delta >= 0.15 && Math.abs(positionShift) <= 1 ? 'win' : 'keep';
    return { page: b.page, ctrBefore: before, ctrAfter: after, ratio, controlRatio, delta, positionShift, verdict };
  });
  return { measures, revert: measures.filter((m) => m.verdict === 'loss').map((m) => m.page), controlRatio };
}
