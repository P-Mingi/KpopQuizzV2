#!/usr/bin/env node
// Run O1, lane Q0a: static proof that no URL of the parity list writes to the database on an anonymous GET.
//
//   node apps/quiz/scripts/o1/q0a/get-write-audit.mjs [--urls apps/quiz/e2e/o1/parity/urls.txt] [--json out.json]
//
// For each URL: the route file it renders (app router resolution, the two V12 pretty-URL rewrites of
// next.config.ts, the group hub suffix rule), the layouts above it and src/middleware.ts; then the transitive
// import closure of those files (static imports, re-exports, dynamic import()). In every server module of the
// closure ('use client' modules run their effects in the browser, 'use server' modules only on a POST) it lists:
//   - table writes: .from('<table>') ... .insert/.upsert/.update/.delete in one statement, storage .upload;
//   - RPC calls, each looked up in supabase/migrations and docs/pending-migrations: the last definition of the
//     function is read and marked "writes" when its body has an INSERT, UPDATE, DELETE or a PERFORM/SELECT of a
//     known writing function;
//   - fetch calls with a non-GET method (external writes).
// A module reachable from a URL is not proof that the write runs on that GET, so every reachable write site must be
// listed in REVIEWED below with the reason it does not run on an anonymous GET render. Exit 1 when a reachable write
// site is not reviewed, or when a URL has no route file and is not a known middleware redirect.
// The runtime half of the proof is the write guard of scripts/o1/parity/ (every non-GET database call made while
// parity builds and serves is refused and logged).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const QUIZ = path.resolve(HERE, '../../..'); // apps/quiz
const REPO = path.resolve(QUIZ, '../..');
const SRC = path.join(QUIZ, 'src');
const APP = path.join(SRC, 'app');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const URLS = path.resolve(process.cwd(), opt('--urls', path.join(QUIZ, 'e2e/o1/parity/urls.txt')));
const JSON_OUT = opt('--json', null);

// Reviewed write sites: "<file relative to apps/quiz/src>:<op>:<target>" -> why it never runs on an anonymous GET.
// A site is keyed by file, operation and table or function, not by line, so unrelated edits do not void a review.
export const REVIEWED = {
  'lib/passport.ts:update:profiles': 'writePassportSnapshot and the counter fallback: called from /me (signed in) and API routes, never from a public render',
  'lib/passport.ts:upsert:passport_group_snapshots': 'writePassportSnapshot: /me only (signed in)',
  'lib/passport.ts:delete:passport_group_snapshots': 'writePassportSnapshot: /me only (signed in)',
  'lib/passport.ts:rpc:increment_passport_counter': 'bumpPassportCounter: called from API routes after a play, never from a render',
  'lib/db/queries/plays.ts:rpc:record_play': 'recordPlay has no caller in src (the /q/ page imports getQuizExtraStats only)',
  'lib/db/queries/debate.ts:rpc:ensure_daily_debate': 'getDailyDebate runs inside CommunityContent, which /leaderboard renders only with NEXT_PUBLIC_UX_V1 off; the production flags render LeaderboardV11. /community (which does call it) is not in the list',
  'lib/duel/server.ts:rpc:duel_cast_song_vote': 'DuelStore.vote: called by POST /api/duel/vote only; the hubs call getFansPicked (reads)',
  'lib/duel/server.ts:upsert:duel_song_rankings': 'createRankingSource.save: the nightly cron /api/cron/fans-picked only',
  'lib/duel/server.ts:delete:duel_song_rankings': 'createRankingSource.save: the nightly cron /api/cron/fans-picked only',
  'lib/duel/server.ts:delete:duel_vote_guard': 'createRankingSource.pruneGuard: the nightly cron /api/cron/fans-picked only',
  'lib/name-all/server.ts:insert:name_all_member_results': 'saveRound: called by POST /api/name-all/result only; the pages call getNameAllSet and getNameAllStats (reads)',
  'lib/live/supabase-store.ts:rpc:<fn>': 'the store wrapper of the room writes, called by the /api/live room routes; the public pages reach isLiveOpen, whose probe is store.ping (a GET select)',
  'lib/live/server.ts:fetch:POST': 'broadcastState (Realtime broadcast): called through liveDeps().broadcast by the /api/live room routes only',
};

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const rel = (f) => path.relative(SRC, f);

// ---------- route resolution ----------
function listDir(d) { try { return fs.readdirSync(d, { withFileTypes: true }); } catch { return []; } }
const ROUTE_FILES = ['page.tsx', 'page.ts', 'route.ts', 'route.tsx'];
function routeFileIn(dir) { for (const f of ROUTE_FILES) if (fs.existsSync(path.join(dir, f))) return path.join(dir, f); return null; }
// Children of dir with route groups flattened: [{ name, dir, chain }], chain = the group dirs passed through.
function children(dir, chain = []) {
  const out = [];
  for (const e of listDir(dir)) {
    if (!e.isDirectory() || e.name.startsWith('_') || e.name.startsWith('@')) continue;
    const d = path.join(dir, e.name);
    if (/^\(.*\)$/.test(e.name)) out.push(...children(d, [...chain, d]));
    else out.push({ name: e.name, dir: d, chain });
  }
  return out;
}
function rootRoute(dir, chain = []) { // a page directly in dir or in one of its route groups
  const f = routeFileIn(dir); if (f) return { file: f, chain };
  for (const e of listDir(dir)) {
    if (e.isDirectory() && /^\(.*\)$/.test(e.name)) { const r = rootRoute(path.join(dir, e.name), [...chain, path.join(dir, e.name)]); if (r) return r; }
  }
  return null;
}
function match(dir, segs, chain) {
  if (segs.length === 0) { const r = rootRoute(dir, []); return r ? { file: r.file, dirs: [...chain, ...r.chain] } : null; }
  const [head, ...rest] = segs; const kids = children(dir);
  const order = [
    ...kids.filter((k) => k.name === head),
    ...kids.filter((k) => /^\[[^.\]]+\]$/.test(k.name)),
    ...kids.filter((k) => /^\[\.\.\.[^\]]+\]$/.test(k.name) || /^\[\[\.\.\.[^\]]+\]\]$/.test(k.name)),
  ];
  for (const k of order) {
    const catchAll = k.name.startsWith('[...') || k.name.startsWith('[[...');
    const r = catchAll ? (routeFileIn(k.dir) ? { file: routeFileIn(k.dir), dirs: [...chain, ...k.chain, k.dir] } : null)
      : match(k.dir, rest, [...chain, ...k.chain, k.dir]);
    if (r) return r;
  }
  return null;
}
// The two V12 rewrites of next.config.ts (flag on, the production flags).
function rewrite(p) {
  let m = p.match(/^\/([a-z0-9-]+)-name-all-members$/); if (m) return `/name-all/${m[1]}`;
  m = p.match(/^\/which-([a-z0-9-]+)-member-are-you$/); if (m) return `/personality/${m[1]}`;
  return p;
}
const SPECIAL = { '/sitemap.xml': 'sitemap.ts', '/robots.txt': 'robots.ts' };
export function resolveRoute(urlPath) {
  const p = urlPath.split('?')[0];
  if (SPECIAL[p]) return { file: path.join(APP, SPECIAL[p]), dirs: [] };
  const segs = rewrite(p).split('/').filter(Boolean);
  const r = match(APP, segs, []);
  // (site)/[slug] is reachable only through the allowlist's suffix rules (lib/route-allowlist.ts): any other
  // one-segment path that no static route matches is 301'd to / by the middleware before a page renders.
  if (r && /\/\(site\)\/\[slug\]\/page\.tsx$/.test(r.file) && !/-(quiz|trivia)$/.test(p)) return null;
  return r;
}

// ---------- import closure ----------
const EXT = ['', '.ts', '.tsx', '.js', '.mjs', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
function resolveImport(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec === '@kpopquiz/shared') base = path.join(REPO, 'packages/shared/src/index');
  else if (spec.startsWith('@kpopquiz/shared/')) base = path.join(REPO, 'packages/shared/src', spec.slice('@kpopquiz/shared/'.length));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null; // a package
  for (const e of EXT) { const f = base + e; if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
  return null;
}
const IMPORT_RE = /(?:^|[\s;])(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
function directive(src) {
  const head = src.replace(/^(\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*/, '').trimStart();
  if (/^['"]use client['"]/.test(head)) return 'client';
  if (/^['"]use server['"]/.test(head)) return 'server-action';
  return 'server';
}
export function closure(entries) {
  const seen = new Map(); // file -> kind
  const stack = entries.map((f) => [f, false]);
  while (stack.length) {
    const [f, underClient] = stack.pop();
    const src = read(f); if (src == null) continue;
    const d = directive(src);
    const kind = underClient || d === 'client' ? 'client' : d;
    const prev = seen.get(f);
    if (prev === kind || prev === 'server') continue; // server wins: it runs on the GET
    seen.set(f, kind);
    if (kind === 'server-action') continue; // runs only on a POST
    for (const m of src.replace(/import\s+type\s+[^;]+;/g, '').matchAll(IMPORT_RE)) {
      const t = resolveImport(m[1] ?? m[2], f);
      if (t) stack.push([t, kind === 'client']);
    }
  }
  return seen;
}

// ---------- write sites ----------
const SQL_DIRS = [path.join(REPO, 'supabase/migrations'), path.join(REPO, 'docs/pending-migrations')];
let sqlFiles = null;
function allSql() {
  if (sqlFiles) return sqlFiles;
  sqlFiles = [];
  const walk = (d) => { for (const e of listDir(d)) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith('.sql') && !e.name.endsWith('.rollback.sql')) sqlFiles.push(f); } };
  SQL_DIRS.forEach(walk); sqlFiles.sort(); return sqlFiles;
}
const fnCache = new Map();
export function rpcWrites(name) {
  if (fnCache.has(name)) return fnCache.get(name);
  let last = null;
  const head = new RegExp(`create\\s+(or\\s+replace\\s+)?function\\s+(public\\.)?"?${name}"?\\s*\\(`, 'i');
  for (const f of allSql()) {
    const s = read(f); const m = s && s.match(head); if (!m) continue;
    const start = m.index; const tail = s.slice(start);
    const tag = tail.match(/as\s+(\$[A-Za-z_]*\$)/i);
    let body = tail.slice(0, 4000);
    if (tag) { const a = tail.indexOf(tag[1]) + tag[1].length; const b = tail.indexOf(tag[1], a); body = tail.slice(a, b < 0 ? a + 8000 : b); }
    last = { file: path.relative(REPO, f), body };
  }
  const r = !last ? { verdict: 'unknown', file: null }
    : { verdict: /\b(insert\s+into|update\s+[a-z_."]+\s+set|delete\s+from|on\s+conflict)\b/i.test(last.body) ? 'writes' : 'reads', file: last.file };
  fnCache.set(name, r); return r;
}
export function writeSites(src) {
  const out = [];
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  for (const m of src.matchAll(/\.(insert|upsert|update|delete)\(/g)) {
    const before = src.slice(Math.max(0, m.index - 400), m.index);
    const stmt = before.slice(before.lastIndexOf(';') + 1);
    // .from('table') or .from(<variable>) earlier in the same statement (a variable table is reported as <name>).
    const from = [...stmt.matchAll(/\.from\(\s*(?:['"`]([a-z_0-9]+)['"`]|([A-Za-z_$][\w$.]*))\s*\)/g)].pop();
    if (!from) continue;
    out.push({ op: m[1], target: from[1] ?? `<${from[2]}>`, line: lineOf(m.index) });
  }
  for (const m of src.matchAll(/\.upload\(/g)) {
    const before = src.slice(Math.max(0, m.index - 300), m.index);
    if (/\.storage\b/.test(before.slice(before.lastIndexOf(';') + 1))) out.push({ op: 'upload', target: 'storage', line: lineOf(m.index) });
  }
  for (const m of src.matchAll(/\.rpc\(\s*(['"`]([a-z_0-9]+)['"`]|([A-Za-z_$][\w$]*))/g)) {
    // A constant of the same file (const WAR_RPC = 'get_fandom_war_map') is resolved to its value.
    const c = m[3] && src.match(new RegExp(`const\\s+${m[3]}\\s*(?::[^=]+)?=\\s*['"\`]([a-z_0-9]+)['"\`]`));
    out.push({ op: 'rpc', target: m[2] ?? (c ? c[1] : `<${m[3]}>`), line: lineOf(m.index) });
  }
  for (const m of src.matchAll(/\bfetch\(([^;]{0,400})/g)) {
    const mm = m[1].match(/method:\s*['"`](POST|PUT|PATCH|DELETE)['"`]/i);
    if (mm) out.push({ op: 'fetch', target: mm[1].toUpperCase(), line: lineOf(m.index) });
  }
  return out;
}

// ---------- main ----------
function layoutsFor(dirs) {
  const files = [];
  const add = (d) => { for (const f of ['layout.tsx', 'layout.ts', 'template.tsx', 'not-found.tsx', 'error.tsx', 'loading.tsx']) { const p = path.join(d, f); if (fs.existsSync(p)) files.push(p); } };
  add(APP); for (const d of dirs) add(d);
  return files;
}
function main() {
  const urls = read(URLS).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const report = []; let bad = 0;
  const middleware = path.join(SRC, 'middleware.ts');
  for (const u of urls) {
    const r = resolveRoute(u);
    const entries = [middleware, ...(r ? [r.file, ...layoutsFor(r.dirs)] : [])];
    const mods = closure(entries);
    const sites = [];
    for (const [f, kind] of [...mods.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (kind !== 'server') continue;
      for (const s of writeSites(read(f))) {
        const key = `${rel(f)}:${s.op}:${s.target}`;
        const rpc = s.op === 'rpc' && !s.target.startsWith('<') ? rpcWrites(s.target) : null;
        const isWrite = s.op === 'rpc' ? !(rpc && rpc.verdict === 'reads') : true;
        if (!isWrite) { sites.push({ ...s, file: rel(f), status: `read-only rpc (${rpc.file})` }); continue; }
        const why = REVIEWED[key];
        sites.push({ ...s, file: rel(f), status: why ? `reviewed: ${why}` : `UNREVIEWED${rpc ? ` (rpc ${rpc.verdict}${rpc.file ? `, ${rpc.file}` : ''})` : ''}` });
        if (!why) bad++;
      }
    }
    const route = r ? rel(r.file) : 'no route file: the middleware 301s an unknown path to /';
    if (!r && !/unknown/.test(u)) bad++;
    report.push({ url: u, route, modules: mods.size, serverModules: [...mods.values()].filter((k) => k === 'server').length, sites });
  }
  for (const x of report) {
    process.stdout.write(`${x.url}  ->  ${x.route}  (${x.serverModules} server modules of ${x.modules})\n`);
    for (const s of x.sites) process.stdout.write(`    ${s.file}:${s.line} ${s.op} ${s.target}: ${s.status}\n`);
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));
  process.stdout.write(bad ? `\n${bad} unreviewed write site(s) or unresolved URL(s)\n` : `\nall ${report.length} URLs: no unreviewed write reachable from the server render\n`);
  process.exitCode = bad ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
