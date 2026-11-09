/**
 * Audit 04 P1-5: the position 4 to 10 title batch (docs: audit 04 section 2). Reads the owner's Search Console exports and writes
 * one batch file; it never edits a page. The decisions live in src/lib/seo/ctr-batch.ts (unit tested on fixtures).
 *
 *   pick     tsx scripts/seo-ctr-batch.mts --pages Pages.csv --queries Queries.csv [--by-page PageQueries.csv]
 *                [--changed changed.txt] [--include-top] [--fetch] [--date 2026-11-20] [--out docs/seo/ctr-batches]
 *            Writes {date}-batch-{n}.json and .md: the curve, the batch (top 20), the control (next 20), the pages left out as top by
 *            clicks, and for each batch page its top 3 non-brand queries, its TARGETS row and (with --fetch) its live title,
 *            description and H1. --fetch asks the public site politely: one request every 1.5 s, a generic User-Agent, 20 pages at most.
 *   check    tsx scripts/seo-ctr-batch.mts --check proposals.json [--reviewed-years 2026] [--existing titles.txt]
 *            proposals.json is [{ page, title, description, headTerm }]. Exit 1 with the reasons when any proposal is refused.
 *   measure  tsx scripts/seo-ctr-batch.mts --measure batch.json --before PagesBefore.csv --after PagesAfter.csv
 *            Verdicts (win, loss, keep) and the revert list; the verdicts are written back into the batch file under "verdicts".
 *
 * One PR and one deploy day for the 20 pages. At day 21 compare the 21 days from deploy + 3 with the 21 days before. Log the verdicts in
 * the batch file (the July sprint never did).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { buildCurve, checkProposals, measureBatch, parseGscCsv, pickBatch, topQueries } from '../src/lib/seo/ctr-batch.ts';

import type { Candidate, PageQuery, Proposal } from '../src/lib/seo/ctr-batch.ts';

const args = process.argv.slice(2);
const flag = (name: string): boolean => args.includes(`--${name}`);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const read = (p: string): string => readFileSync(resolve(p), 'utf8');
const lines = (p: string | undefined): string[] => (p ? read(p).split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : []);
const UA = 'Mozilla/5.0 (compatible; kpopquiz-seo-batch)';
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function die(msg: string): never { console.error(msg); process.exit(1); }

async function live(url: string): Promise<{ title: string | null; description: string | null; h1: string | null }> {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  const html = await res.text();
  const pick = (re: RegExp): string | null => (re.exec(html)?.[1] ?? null)?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() ?? null;
  return { title: pick(/<title>([\s\S]*?)<\/title>/i), description: pick(/<meta name="description" content="([^"]*)"/i), h1: pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i) };
}

function targetsRow(md: string, url: string): string | null {
  const path = url.replace(/^https?:\/\/[^/]+/, '') || '/';
  return md.split('\n').find((l) => l.startsWith('|') && l.split('|')[3]?.trim() === path) ?? null;
}

function parseByPage(text: string): PageQuery[] {
  // The export of one page filtered on a query: "page,query,clicks,impressions,position" (a header line is allowed).
  const out: PageQuery[] = [];
  for (const l of text.split(/\r?\n/).slice(1)) {
    const c = l.split(',');
    if (c.length < 5) continue;
    out.push({ page: c[0]!.trim(), query: c[1]!.trim(), clicks: Number(c[2]), impressions: Number(c[3]), position: Number(c[4]) });
  }
  return out;
}

async function pick(): Promise<void> {
  const pagesFile = opt('pages'); const queriesFile = opt('queries');
  if (!pagesFile || !queriesFile) die('pick needs --pages and --queries (Search Console exports).');
  const pages = parseGscCsv(read(pagesFile)); const queries = parseGscCsv(read(queriesFile));
  if (!pages.length || !queries.length) die('An export has no rows or no recognised columns (Top pages / Top queries, Clicks, Impressions, CTR, Position).');
  const curve = buildCurve(queries);
  const picked = pickBatch(pages, curve, { recentlyChanged: new Set(lines(opt('changed'))), includeTop: flag('include-top') });
  const byPage = opt('by-page') ? parseByPage(read(opt('by-page')!)) : [];
  const targets = existsSync('../../docs/seo/TARGETS.md') ? read('../../docs/seo/TARGETS.md') : '';
  const doFetch = flag('fetch');
  const detail: Array<Candidate & { queries: PageQuery[]; targets: string | null; live?: Awaited<ReturnType<typeof live>> }> = [];
  for (const c of picked.batch) {
    const d: (typeof detail)[number] = { ...c, queries: topQueries(byPage, c.page), targets: targetsRow(targets, c.page) };
    if (doFetch) { d.live = await live(c.page); await sleep(1500); }
    detail.push(d);
  }
  const date = opt('date') ?? new Date().toISOString().slice(0, 10);
  const dir = resolve(opt('out') ?? '../../docs/seo/ctr-batches');
  mkdirSync(dir, { recursive: true });
  const n = readdirSync(dir).filter((f) => f.startsWith(`${date}-batch-`) && f.endsWith('.json')).length + 1;
  const base = join(dir, `${date}-batch-${n}`);
  const batch = { date, curve, batch: detail, control: picked.control, excludedTop: picked.excludedTop, proposals: [] as Proposal[], verdicts: [] as unknown[] };
  writeFileSync(`${base}.json`, `${JSON.stringify(batch, null, 2)}\n`);
  const md = [
    `# Title batch ${date} #${n}`, '',
    `Curve (CTR by position 1 to 10): ${curve.map((v) => `${(v * 100).toFixed(1)}%`).join(' ')}`, '',
    '| Page | Pos | Impr | CTR | Expected | Score | Top queries |', '|---|---|---|---|---|---|---|',
    ...detail.map((d) => `| ${d.page} | ${d.position.toFixed(1)} | ${d.impressions} | ${(d.ctr * 100).toFixed(2)}% | ${(d.expected * 100).toFixed(2)}% | ${d.score.toFixed(1)} | ${d.queries.map((q) => q.query).join('; ')} |`),
    '', `Control group (untouched): ${picked.control.length} pages.`,
    picked.excludedTop.length ? `Left out as top pages by clicks (join only with the owner's OK): ${picked.excludedTop.join(', ')}` : '',
    '', 'Write the proposals into the JSON file (proposals: page, title, description, headTerm), then run --check. At day 21 run --measure.', '',
  ].join('\n');
  writeFileSync(`${base}.md`, md);
  console.log(`wrote ${base}.json and .md: ${detail.length} batch pages, ${picked.control.length} control pages.`);
}

function check(): void {
  const f = opt('check'); if (!f) die('check needs a proposals file.');
  const raw = JSON.parse(read(f)) as Proposal[] | { proposals: Proposal[] };
  const proposals = Array.isArray(raw) ? raw : raw.proposals;
  const years = (opt('reviewed-years') ?? '').split(',').map(Number).filter(Boolean);
  const problems = checkProposals(proposals, { reviewedYears: years, existingTitles: lines(opt('existing')) });
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`${proposals.length} proposals pass.`);
}

function measure(): void {
  const f = opt('measure'); const before = opt('before'); const after = opt('after');
  if (!f || !before || !after) die('measure needs a batch file, --before and --after (Pages exports).');
  const batchFile = JSON.parse(read(f)) as { batch: Candidate[]; control: Candidate[]; verdicts?: unknown[] };
  const b = new Map(parseGscCsv(read(before)).map((r) => [r.key, r] as const));
  const a = new Map(parseGscCsv(read(after)).map((r) => [r.key, r] as const));
  const period = (m: Map<string, { clicks: number; impressions: number; position: number }>, k: string) => m.get(k) ?? { clicks: 0, impressions: 0, position: 0 };
  const r = measureBatch(
    batchFile.batch.map((c) => ({ page: c.page, before: period(b, c.page), after: period(a, c.page) })),
    batchFile.control.map((c) => ({ before: period(b, c.page), after: period(a, c.page) })),
  );
  batchFile.verdicts = r.measures;
  writeFileSync(resolve(f), `${JSON.stringify(batchFile, null, 2)}\n`);
  for (const m of r.measures) console.log(`${m.verdict.padEnd(5)} ${m.page}  CTR ${(m.ctrBefore * 100).toFixed(2)}% -> ${(m.ctrAfter * 100).toFixed(2)}%  vs control ${(m.delta * 100).toFixed(0)}%  position ${m.positionShift >= 0 ? '+' : ''}${m.positionShift.toFixed(1)}`);
  console.log(r.revert.length ? `Revert PR: ${r.revert.join(' ')}` : 'No revert.');
}

if (flag('check') || opt('check')) check();
else if (opt('measure')) measure();
else await pick();
