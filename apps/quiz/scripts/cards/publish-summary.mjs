#!/usr/bin/env node
// publish-summary.mjs: the summary of a run of .github/workflows/cards-publish.yml (integrator, 2026-11-17), written to the job's page
// (GITHUB_STEP_SUMMARY), else printed. It reads only the two reports the run leaves: the JSON of publish-card-files.mjs --report (counts,
// failed photos and why, the cleanup's counts, the live photos read) and the CSV of kpopdle-photos.mjs --publish (one line per idol). Neither carries a secret;
// the summary repeats nothing else.
//   node apps/quiz/scripts/cards/publish-summary.mjs --cards <report.json> --kpopdle-csv <report.csv> --kpopdle oui|non
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** One markdown table cell: no line break, no pipe that would open a column. */
export const cell = (v) => String(v ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();

/** The rows of a CSV written by kpopdle-photos.mjs (quoted fields with "" inside), header first. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** The Kpopdle counts from its CSV: published (a photo was given), errors, without a photo; the error lines. */
export function kpopdleCounts(csvText) {
  const [head, ...rows] = parseCsv(csvText);
  const at = (name) => (head ?? []).indexOf(name);
  const [iName, iGroup, iResult] = [at('name'), at('group'), at('result')];
  const out = { published: 0, soft: 0, errors: [], none: 0 };
  for (const r of rows) {
    const result = r[iResult] ?? '';
    if (result.startsWith('published')) { out.published++; if (result.includes('small source')) out.soft++; }
    else if (result.startsWith('error:')) out.errors.push({ name: r[iName] ?? '', group: r[iGroup] ?? '', reason: result.slice(6).trim() });
    else if (result.startsWith('no photo')) out.none++;
  }
  return out;
}

/** The markdown of the job summary. `cards`: the parsed report (null: none written); `kpopdle`: { asked, csv } (csv: its text or null). */
export function summaryMarkdown({ cards, kpopdle }) {
  const L = ['## KpopCards: the card files', ''];
  if (!cards) {
    L.push('No report: the publish step did not run to its end (stopped, cancelled or timed out). Its log says where it stopped.');
  } else {
    L.push(`Project: \`${cell(cards.host ?? 'not reached')}\`, ${cell(cards.mode)} mode${cards.keepGoing ? ', --keep-going' : ''}.`, '');
    L.push('| | Count |', '| --- | ---: |');
    // lot CPUB-RETRY (run Cards publish #2 read 1,000 of 1,101 live photos): the total read comes first, so a gap with the lines below shows
    L.push(`| Live photos read (auto or approved) | ${cards.photos.live ?? 'not read'} |`);
    L.push(`| Photos published | ${cards.photos.uploaded} |`);
    L.push(`| Cards published (one per part, one per person) | ${cards.cards} |`);
    L.push(`| Panoramas published | ${cards.panoramas} |`);
    L.push(`| Photos already up to date | ${cards.photos.upToDate} |`);
    L.push(`| Photos not in the data files | ${cards.photos.notInData} |`);
    L.push(`| Photos failed | ${cards.photos.failed} |`);
    L.push('');
    if (cards.failed.length) {
      L.push('### Photos failed (skipped; their rows are unchanged, a new run tries them again)', '');
      L.push('| Subject | Photo | Commons page | Why |', '| --- | ---: | --- | --- |');
      for (const f of cards.failed) L.push(`| ${cell(f.slug)} | ${cell(f.slot)} | ${cell(f.page)} | ${cell(f.reason)} |`);
      L.push('');
    }
    if (cards.cleanup) {
      L.push(`Cleanup: ${cards.cleanup.objects} files in the bucket, ${cards.cleanup.kept} current files kept, ${cards.cleanup.proposed} proposed for deletion, ${cards.cleanup.deleted} deleted${cards.mode === 'non-interactive' ? ' (this mode only lists)' : ''}.`, '');
    }
    if (cards.stopped) L.push(`**Stopped:** ${cell(cards.stopped)}`, '');
  }
  L.push('## Kpopdle: the idol photos', '');
  if (!kpopdle?.asked) L.push('Not run (input kpopdle = non).');
  else if (!kpopdle.csv) L.push('No report: the Kpopdle step did not reach its end. Its log says why.');
  else {
    const k = kpopdleCounts(kpopdle.csv);
    L.push('| | Count |', '| --- | ---: |');
    L.push(`| Idols given a photo | ${k.published} |`);
    L.push(`| Of which from a small source (may look soft) | ${k.soft} |`);
    L.push(`| Errors | ${k.errors.length} |`);
    L.push(`| Idols without a photo | ${k.none} |`, '');
    if (k.errors.length) {
      L.push('| Idol | Group | Error |', '| --- | --- | --- |');
      for (const e of k.errors) L.push(`| ${cell(e.name)} | ${cell(e.group)} | ${cell(e.reason)} |`);
      L.push('');
    }
  }
  return `${L.join('\n')}\n`;
}

function main(argv) {
  const value = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] ?? null : null; };
  const cardsFile = value('--cards');
  const csvFile = value('--kpopdle-csv');
  const cards = cardsFile && existsSync(cardsFile) ? JSON.parse(readFileSync(cardsFile, 'utf8')) : null;
  const asked = value('--kpopdle') === 'oui';
  const csv = asked && csvFile && existsSync(csvFile) ? readFileSync(csvFile, 'utf8') : null;
  const md = summaryMarkdown({ cards, kpopdle: { asked, csv } });
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  else process.stdout.write(md);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
