// Run O1, lane Q0a: is a database function read-only? Shared by the parity write guard (freeze-hook.mjs) and the GET
// write audit (apps/quiz/scripts/o1/q0a/get-write-audit.mjs).
// Source: every definition of public.<fn> in supabase/migrations and docs/pending-migrations (rollback files left
// out). Production may run any of them, so a function is 'reads' only when EVERY definition is read-only:
//   - declared STABLE or IMMUTABLE (Postgres refuses a write inside such a function), or
//   - a body with no INSERT INTO, UPDATE ... SET, DELETE FROM, ON CONFLICT, TRUNCATE, COPY, nextval(, setval(,
//     pg_advisory, set_config(, NOTIFY or dynamic EXECUTE, and no call of another function of the repository that
//     is not read-only itself (checked recursively).
// Otherwise 'writes' (with the reason), or 'unknown' when no definition exists (the guard refuses both).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DIRS = ['supabase/migrations', 'docs/pending-migrations'].map((d) => path.join(REPO, d));

let defs = null; // name -> [{ file, volatility, body }]
function walk(d, out) {
  let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of es) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.name.endsWith('.sql') && !e.name.endsWith('.rollback.sql') && !/rollback/i.test(e.name)) out.push(f);
  }
}
function load() {
  if (defs) return defs;
  defs = new Map(); const files = []; DIRS.forEach((d) => walk(d, files)); files.sort();
  const head = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/gi;
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(head)) {
      const tail = s.slice(m.index);
      const tag = tail.match(/\bas\s+(\$[A-Za-z_]*\$)/i);
      let body = tail.slice(0, 6000); let after = '';
      if (tag) {
        const a = tail.indexOf(tag[1], tag.index) + tag[1].length; const b = tail.indexOf(tag[1], a);
        body = tail.slice(a, b < 0 ? a + 12000 : b); after = b < 0 ? '' : tail.slice(b, b + 400).split(';')[0];
      }
      const header = tag ? tail.slice(0, tag.index) : '';
      const vol = /\b(stable|immutable)\b/i.exec(header + ' ' + after);
      const name = m[1].toLowerCase();
      if (!defs.has(name)) defs.set(name, []);
      defs.get(name).push({ file: path.relative(REPO, f), volatility: vol ? vol[1].toLowerCase() : 'volatile', body });
    }
  }
  return defs;
}

const WRITE_RE = /\b(insert\s+into|update\s+[a-z_."]+\s+set|delete\s+from|on\s+conflict|truncate\s|copy\s|nextval\s*\(|setval\s*\(|pg_advisory|set_config\s*\(|notify\s|execute\s+(?!function))/i;
const cache = new Map();

/** { verdict: 'reads' | 'writes' | 'unknown', why, files } */
export function rpcVerdict(name, seen = new Set()) {
  const n = String(name).toLowerCase();
  if (cache.has(n)) return cache.get(n);
  const all = load().get(n);
  if (!all || !all.length) return { verdict: 'unknown', why: 'no definition in the repository', files: [] };
  if (seen.has(n)) return { verdict: 'reads', why: 'recursive', files: [] }; // the cycle is judged by its other bodies
  seen.add(n);
  let r = { verdict: 'reads', why: '', files: all.map((d) => d.file) };
  for (const d of all) {
    if (d.volatility !== 'volatile') continue;
    const w = d.body.match(WRITE_RE);
    if (w) { r = { verdict: 'writes', why: `${w[1].trim()} in ${d.file}`, files: r.files }; break; }
    const calls = new Set([...d.body.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/gi)].map((x) => x[1].toLowerCase()));
    calls.delete(n);
    const bad = [...calls].find((c) => load().has(c) && rpcVerdict(c, seen).verdict !== 'reads');
    if (bad) { r = { verdict: 'writes', why: `calls ${bad} in ${d.file}`, files: r.files }; break; }
  }
  cache.set(n, r);
  return r;
}
