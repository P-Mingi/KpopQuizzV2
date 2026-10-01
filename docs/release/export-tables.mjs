#!/usr/bin/env node
// R1 release, section 4a: READ-ONLY export of the existing tables the SQL files touch
// (a column added, a policy dropped, a trigger added), one CSV per table, written
// OUTSIDE the repository. GET requests only, through the project's REST API with the
// service role key read from apps/quiz/.env.local. The key is never printed or written.
//
//   node docs/release/export-tables.mjs ~/kpq-backups/2026-10-01
//
// It is a second safety net: the real backup is Supabase's own daily backup, which the
// owner confirms before any SQL is applied.

import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// table -> the column to page on (a stable, indexed order).
const TABLES = {
  plays: 'id',                 // v11-p4-relaxed-runs.sql adds plays.relaxed
  notification_prefs: 'user_id', // v11-p10-email-prefs.sql adds two columns
  ranked_plays: 'id',          // v11-p7-ranked.sql adds two columns; r1-rls-tighten.sql drops a policy
  quizzes: 'id',               // v11-p3-group-quiz-alerts.sql adds a trigger on publish
  battles: 'id',               // r1-rls-tighten.sql drops a policy
  battle_results: 'id',        // r1-rls-tighten.sql drops a policy
  pending_questions: 'id',     // r1-rls-tighten.sql drops a policy
  quiz_bank: 'id',             // r1-rls-tighten.sql drops a policy
  quiz_time_stats: 'id',       // r1-rls-tighten.sql drops a policy
};
const PAGE = 1000;

const outDir = process.argv[2];
if (!outDir) { console.error('usage: export-tables.mjs <output directory outside the repo>'); process.exit(2); }

const envFile = fileURLToPath(new URL('../../apps/quiz/.env.local', import.meta.url));
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8').split('\n')
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/))
    .filter(Boolean).map((m) => [m[1], m[2]]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('missing Supabase URL or service role key in apps/quiz/.env.local'); process.exit(2); }
if (!url.includes('rdkgouofytwfdpbxbzio')) { console.error('this is not the kpopquiz project: stopping'); process.exit(2); }

mkdirSync(outDir, { recursive: true });
const summary = [];

for (const [table, orderBy] of Object.entries(TABLES)) {
  const file = join(outDir, `${table}.csv`);
  let rows = 0;
  let offset = 0;
  let header = null;
  writeFileSync(file, '');
  for (;;) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&order=${orderBy}.asc&limit=${PAGE}&offset=${offset}`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: 'text/csv', prefer: 'count=exact' },
    });
    if (!res.ok) { summary.push(`${table}: FAILED ${res.status} ${(await res.text()).slice(0, 120)}`); rows = -1; break; }
    const text = await res.text();
    const total = Number((res.headers.get('content-range') ?? '').split('/')[1]);
    if (!text.trim()) break;
    const nl = text.indexOf('\n');
    const head = nl === -1 ? text : text.slice(0, nl);
    const body = nl === -1 ? '' : text.slice(nl + 1);
    if (header === null) { header = head; appendFileSync(file, head + '\n'); }
    appendFileSync(file, body.endsWith('\n') || body === '' ? body : body + '\n');
    offset += PAGE;
    rows = Number.isFinite(total) ? Math.min(offset, total) : offset;
    if (Number.isFinite(total) ? offset >= total : body.split('\n').length < PAGE) { rows = Number.isFinite(total) ? total : rows; break; }
  }
  if (rows >= 0) summary.push(`${table}: ${rows} rows -> ${file}`);
  console.log(summary[summary.length - 1]);
}

writeFileSync(join(outDir, 'README.txt'), `kpopquiz R1 release, read-only export taken ${new Date().toISOString()}\n${summary.join('\n')}\n`);
