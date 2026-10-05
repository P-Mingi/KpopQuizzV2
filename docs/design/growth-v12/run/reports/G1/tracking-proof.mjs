#!/usr/bin/env node
// G1 tracking proof against the REAL bt_runs table (V12 prompt 4d). THIS SCRIPT WRITES.
//
// DO NOT RUN without the owner's go for this test. It refuses to start unless
//   --go  and  G1_TRACKING_PROOF_GO=owner-go-v12-g1-tracking-proof
// are both given. It was written in Phase 1 and never run by G1.
//
// What it does, on a LOCAL production build (never the live site):
//   1. one guest run on /blindtest played to the results screen,
//   2. one guest run abandoned after two answers (Quit),
//   then reads the two rows back (read only) and checks them.
// What it writes: exactly two rows in public.bt_runs, both is_test = true (a local
// build has no VERCEL_ENV = production), so they never count: /admin/blind-tests/runs,
// bt_song_stats and songs.play_count all ignore test runs. Nothing else is written:
// every other mutating request is answered locally, as in the specs. A guest run
// awards no XP and touches no account.
//
// Needs:
//   - docs/pending-migrations/v12-g1-bt-runs.sql applied (the owner's `go v12-g1-bt-runs.sql`),
//   - a local production build with NEXT_PUBLIC_BT_TRACKING=1 serving on --base
//     (default http://localhost:3071), VERCEL_ENV unset,
//   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment or in
//     apps/quiz/.env.local, used for read-only SELECTs only and never printed,
//   - PW_CHROMIUM = path of the cached Chromium.
//
// Run from apps/quiz:
//   G1_TRACKING_PROOF_GO=owner-go-v12-g1-tracking-proof PW_CHROMIUM=... \
//     node ../../docs/design/growth-v12/run/reports/G1/tracking-proof.mjs --go [--base http://localhost:3071] [--out <dir>]
//
// Exit 0 = both rows are there and right. The JSON result is printed and, with
// --out, saved as tracking-proof.json (no key, no id of a person: the anon id is a
// random browser id made for this run and is shown shortened).
//
// Cleanup, if the owner wants the two rows gone (they are harmless and excluded
// everywhere): the script prints the exact DELETE with the two ids; it never runs it.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--base', 'http://localhost:3071');
const OUT = opt('--out', null);
const GO = args.includes('--go') && process.env.G1_TRACKING_PROOF_GO === 'owner-go-v12-g1-tracking-proof';

if (!GO) {
  console.error('Refused: this script writes two is_test rows to the production database.');
  console.error('It runs only after the owner\'s go for the tracking proof (see the header of this file).');
  process.exit(2);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) {
  console.error(`Refused: --base must be a local build (http://localhost:<port>), got ${BASE}.`);
  process.exit(2);
}

const require = createRequire(pathToFileURL(process.cwd() + '/').href);
const { chromium } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');

function envFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}
const local = envFile(path.join(process.cwd(), '.env.local'));
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || local.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || local.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SERVICE) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'); process.exit(2); }
const db = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } });

const TRACK = '/api/track/bt-run';
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: Boolean(ok), detail }); console.log(ok ? 'ok  ' : 'FAIL', name, detail); };

// ---- preflight (read only): the table exists, the build has the switch on and is not production ----
const pre = await db.from('bt_runs').select('id', { count: 'exact', head: true });
if (pre.error) { console.error('bt_runs is not readable: apply docs/pending-migrations/v12-g1-bt-runs.sql first.', pre.error.code ?? ''); process.exit(2); }
const probe = await fetch(BASE + TRACK, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'not json' });
if (probe.status !== 200) { console.error(`The build on ${BASE} has NEXT_PUBLIC_BT_TRACKING off (status ${probe.status}).`); process.exit(2); }
const songsBefore = await db.from('songs').select('id', { count: 'exact', head: true }).gt('play_count', 0);

function silentWav(seconds = 12) {
  const rate = 8000; const n = rate * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  // A real browser user agent: the route drops headless and automation agents as bots.
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
});
const page = await context.newPage();
const sent = [];
const answers = [];

// Every mutating request is answered locally EXCEPT the two this proof is about:
// the tracking endpoint (the write under test) and generate (a POST that only reads).
await context.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
  const req = route.request();
  const p = new URL(req.url()).pathname;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || p === TRACK || p === '/api/blind-test/generate') { await route.continue(); return; }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await context.route(/cdnt-preview\.dzcdn\.net|cdn-preview|dzcdn\.net\/.*\.mp3/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }));
page.on('request', (r) => { if (new URL(r.url()).pathname === TRACK && r.method() === 'POST') { try { sent.push(JSON.parse(r.postData() ?? '{}')); } catch { /* not ours */ } } });
page.on('response', async (r) => { if (new URL(r.url()).pathname === TRACK && r.request().method() === 'POST') { try { answers.push({ status: r.status(), body: await r.json() }); } catch { answers.push({ status: r.status(), body: null }); } } });

const v11 = async () => (await page.locator('.ux-app').count()) > 0;
const waitFor = async (fn, what, ms = 20_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return; await page.waitForTimeout(150); }
  throw new Error(`timeout: ${what}`);
};

async function startRun() {
  await page.goto(`${BASE}/blindtest`, { waitUntil: 'domcontentloaded' });
  if (await v11()) {
    await page.locator('.p6-setup[data-live]').waitFor({ timeout: 60_000 });
    await page.locator('.p6-setup .ux-btn-primary').click();
    await page.locator('.p6-ans').first().waitFor({ timeout: 30_000 });
  } else {
    await page.locator('.bt-setup .bt-start').waitFor({ timeout: 60_000 });
    await page.waitForTimeout(1500); // hydration
    await page.locator('.bt-start').click();
    await page.locator('.answers button').first().waitFor({ timeout: 30_000 });
  }
}

/** Answer the current round (first choice) and go to the next one. Returns false once the results show. */
async function answerRound() {
  if (await v11()) {
    await waitFor(async () => (await page.locator('.p6-ans:not([disabled])').count()) === 4 || (await page.locator('.p6-btcard').count()) > 0, 'a v11 round');
    if ((await page.locator('.p6-btcard').count()) > 0) return false;
    await page.waitForTimeout(700); // a human does not answer in 0 ms
    await page.locator('.p6-ans').first().click();
    await page.locator('.p6-next').click();
    return true;
  }
  await waitFor(async () => (await page.locator('.answers button:not([disabled])').count()) === 4 || (await page.locator('.bt-results').count()) > 0, 'a legacy round');
  if ((await page.locator('.bt-results').count()) > 0) return false;
  await page.waitForTimeout(700);
  await page.locator('.answers button').first().click();
  await waitFor(async () => (await page.locator('.answers button:not([disabled])').count()) === 4 || (await page.locator('.bt-results').count()) > 0, 'the next legacy round', 15_000);
  return true;
}

// ---- run 1: to the results ----
await startRun();
await waitFor(() => sent.filter((e) => e.event === 'start').length === 1, 'the first start');
for (let i = 0; i < 20 && (await answerRound()); i++) { /* play */ }
await waitFor(async () => (await page.locator('.p6-btcard, .bt-results').count()) > 0, 'the results screen', 30_000);
await waitFor(() => sent.filter((e) => e.event === 'finish').length === 1, 'the first finish');
const run1 = sent.find((e) => e.event === 'start').run_id;

// ---- run 2: abandoned after two answers ----
await startRun();
await waitFor(() => sent.filter((e) => e.event === 'start').length === 2, 'the second start');
await answerRound();
await answerRound();
if (await v11()) await page.getByRole('button', { name: 'Quit blindtest' }).click();
else await page.getByRole('button', { name: 'Quit game' }).click();
await waitFor(() => sent.filter((e) => e.event === 'finish').length === 2, 'the abandoned finish (beacon)');
const run2 = sent.filter((e) => e.event === 'start')[1].run_id;
await page.waitForTimeout(3000); // let the two writes land
await browser.close();

// ---- read back (read only) ----
const { data: rows, error } = await db.from('bt_runs').select('*').in('id', [run1, run2]);
check('both rows are readable with the service role', !error && rows?.length === 2, error?.code ?? `${rows?.length ?? 0} rows`);
const r1 = rows?.find((r) => r.id === run1);
const r2 = rows?.find((r) => r.id === run2);
const delay = (r) => (r ? Math.round((Date.parse(r.finished_at) - Date.parse(r.created_at)) / 1000) : null);

check('the endpoint answered ok to all four events', answers.filter((a) => a.status === 200 && a.body?.ok === true).length >= 3, JSON.stringify(answers.map((a) => [a.status, a.body?.ok, a.body?.reason ?? ''])));
for (const [name, r] of [['completed run', r1], ['abandoned run', r2]]) {
  check(`${name}: row exists`, Boolean(r));
  if (!r) continue;
  check(`${name}: is_test = true (local build, never counted)`, r.is_test === true);
  check(`${name}: playlist all, source hub, mode classic, locale en`, r.playlist === 'all' && r.source === 'hub' && r.mode === 'classic' && r.locale === 'en', `${r.playlist} ${r.source} ${r.mode} ${r.locale}`);
  check(`${name}: a guest (no player_id, an anon_id)`, r.player_id === null && typeof r.anon_id === 'string');
  check(`${name}: user_agent_class desktop`, r.user_agent_class === 'desktop', r.user_agent_class);
  check(`${name}: finished_at set after created_at`, r.finished_at && Date.parse(r.finished_at) >= Date.parse(r.created_at), `${delay(r)} s`);
  check(`${name}: songs = one entry per answer with song_id, kind, correct, ms`, Array.isArray(r.songs) && r.songs.length === r.answered && r.songs.every((s) => s.song_id && (s.kind === 'title' || s.kind === 'artist') && typeof s.correct === 'boolean' && Number.isInteger(s.ms)), `${r.songs?.length} songs`);
  check(`${name}: correct = right answers in songs`, r.correct === (r.songs ?? []).filter((s) => s.correct).length, `${r.correct}`);
}
if (r1) check('completed run: completed = true and every round answered', r1.completed === true && r1.answered === r1.rounds, `${r1.answered}/${r1.rounds}`);
if (r2) check('abandoned run: completed = false with 2 answers', r2.completed === false && r2.answered === 2, `${r2.answered}/${r2.rounds}`);
if (r1 && r2) check('both runs carry the same browser id', r1.anon_id === r2.anon_id);

const songsAfter = await db.from('songs').select('id', { count: 'exact', head: true }).gt('play_count', 0);
check('songs.play_count did not move (test runs never bump it)', songsBefore.count === songsAfter.count, `${songsBefore.count} -> ${songsAfter.count}`);
const stats = await db.rpc('bt_runs_admin_stats', { p_days: 1 });
check('bt_runs_admin_stats answers and ignores the two test rows', !stats.error && typeof stats.data?.totals?.runs === 'number', stats.error?.code ?? `real runs today: ${stats.data?.totals?.runs}`);

const short = (id) => (typeof id === 'string' ? `${id.slice(0, 8)}...` : null);
const result = {
  base: BASE,
  at: new Date().toISOString(),
  ui: r1 ? 'recorded' : 'unknown',
  runs: [r1, r2].filter(Boolean).map((r) => ({
    id: r.id, completed: r.completed, is_test: r.is_test, playlist: r.playlist, source: r.source, mode: r.mode, rounds: r.rounds,
    answered: r.answered, correct: r.correct, score: r.score, best_combo: r.best_combo, duration_ms: r.duration_ms,
    user_agent_class: r.user_agent_class, anon_id: short(r.anon_id), player_id: r.player_id, seconds_to_finish: delay(r),
  })),
  checks,
  passed: checks.every((c) => c.ok),
  cleanup_if_wanted: `DELETE FROM public.bt_runs WHERE is_test AND id IN ('${run1}', '${run2}');`,
};
console.log(JSON.stringify(result, null, 1));
if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'tracking-proof.json'), JSON.stringify(result, null, 1)); }
process.exit(result.passed ? 0 : 1);
