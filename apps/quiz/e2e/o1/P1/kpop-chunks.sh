#!/bin/bash
# Run O1, lane P1 fix: the kpop client graph must be the same at the base and at the head.
#   kpop-chunks.sh snapshot <name>      reads apps/quiz/.next (an offline build of the kpop site) and stores, per kpop route,
#                                       the client modules of its client reference manifest and the chunk files it loads
#   kpop-chunks.sh compare <a> <b>      compares two snapshots route by route; exit 0 only when every route is identical
# Build first: scripts/o1/env.sh offline -- pnpm -C apps/quiz build. Snapshots live in $O1_SNAP (default $TMPDIR/o1-P1-kpop-chunks).
# Routes named in the report: app/(site)/q/[slug], app/(site)/[slug], app/(site)/blindtest/[mode], app/(site)/page and the (site) layout
# (it holds the sign-in sheet). Every other page manifest under app/(site) is compared too and summarised.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
QUIZ="$(cd "$HERE/../../.." && pwd)"
SNAP="${O1_SNAP:-${TMPDIR:-/tmp}/o1-P1-kpop-chunks}"
cmd="${1:-}"; shift || true
case "$cmd" in
  snapshot)
    name="${1:?usage: kpop-chunks.sh snapshot <name>}"
    mkdir -p "$SNAP/$name"
    NEXT_DIR="$QUIZ/.next" OUT="$SNAP/$name" node -e '
const fs = require("fs"), path = require("path"), vm = require("vm");
const next = process.env.NEXT_DIR, out = process.env.OUT;
const root = path.join(next, "server/app/(site)");
const found = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith("_client-reference-manifest.js")) found.push(f); } };
walk(root);
const routes = {};
for (const f of found) routes[path.relative(path.join(next, "server/app"), f).replace(/_client-reference-manifest\.js$/, "").replace(/\//g, "~")] = path.relative(path.join(next, "server/app"), f).replace(/_client-reference-manifest\.js$/, "");
for (const [id, rel] of Object.entries(routes)) {
  const file = path.join(next, "server/app", rel + "_client-reference-manifest.js");
  const g = { globalThis: null }; g.globalThis = g; vm.createContext(g);
  vm.runInContext(fs.readFileSync(file, "utf8"), g);
  const m = Object.values(g.__RSC_MANIFEST)[0];
  const norm = (k) => k.replace(/^\[project\]\/\.claude\/worktrees\/[^/]+\//, "[project]/");
  const mods = Object.entries(m.clientModules).map(([k, v]) => norm(k) + " #" + v.id + (v.async ? " async" : "") + " [" + [...v.chunks].sort().join(",") + "]").sort();
  const chunks = new Set();
  for (const v of Object.values(m.clientModules)) for (const c of v.chunks) chunks.add(c);
  for (const list of Object.values(m.entryJSFiles || {})) for (const c of list) chunks.add("/_next/" + c.replace(/^\/?(_next\/)?/, ""));
  const sizes = {};
  for (const c of chunks) { try { sizes[c] = fs.statSync(path.join(next, c.replace(/^\/_next\//, ""))).size; } catch { sizes[c] = -1; } }
  fs.writeFileSync(path.join(out, id + ".json"), JSON.stringify({ modules: mods, chunks: [...chunks].sort(), sizes }, null, 1));
}
'
    echo "snapshot $name -> $SNAP/$name" ;;
  compare)
    a="${1:?usage: kpop-chunks.sh compare <a> <b>}"; b="${2:?usage: kpop-chunks.sh compare <a> <b>}"
    A="$SNAP/$a" B="$SNAP/$b" NA="$a" NB="$b" node -e '
const fs = require("fs"), path = require("path");
const names = { "q-slug": "(site)/q/[slug]/page", "slug": "(site)/[slug]/page", "blindtest-mode": "(site)/blindtest/[mode]/page", "home": "(site)/page" };
const ids = (d) => fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const all = [...new Set([...ids(process.env.A), ...ids(process.env.B)])].sort();
const key = (rel) => rel.replace(/\//g, "~");
const norm = (c) => "/_next/" + c.replace(/^\/?(_next\/)?/, "");
const read = (d, id) => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(d, id + ".json"), "utf8"));
    if (j.chunks) { const sizes = {}; for (const [c, n] of Object.entries(j.sizes)) sizes[norm(c)] = n; j.chunks = [...new Set(j.chunks.map(norm))].sort(); j.sizes = sizes; }
    return j;
  } catch { return null; }
};
const onlyIn = (p, q) => [...p].filter((v) => !q.has(v));
const strip = (m) => m.replace(/ \[[^\]]*\]$/, "");
const diffA = new Map(), diffB = new Map();   // chunk files that differ somewhere -> size
let graphBad = 0, nameDiff = 0, identical = 0, regroup = 0, added = 0;
const rows = [];
const check = (id, label) => {
  const x = read(process.env.A, id), y = read(process.env.B, id);
  if (!x || !y) { added++; rows.push(label + ": only in " + (x ? process.env.NA : process.env.NB) + " (a page that exists in one build only, not compared)"); return; }
  const mx = new Set(x.modules.map(strip)), my = new Set(y.modules.map(strip)), cx = new Set(x.chunks), cy = new Set(y.chunks);
  const modsOk = mx.size === my.size && onlyIn(mx, my).length === 0;
  const countOk = cx.size === cy.size;
  const namesOk = onlyIn(cx, cy).length === 0 && onlyIn(cy, cx).length === 0;
  for (const c of onlyIn(cx, cy)) diffA.set(c, x.sizes[c]);
  for (const c of onlyIn(cy, cx)) diffB.set(c, y.sizes[c]);
  const verdict = !modsOk ? "DIFFERENT GRAPH" : !countOk ? "SAME CLIENT MODULES, chunk grouping differs" : namesOk ? "IDENTICAL" : "SAME GRAPH, " + onlyIn(cx, cy).length + " chunk file name(s) differ (content hash)";
  if (!modsOk) { graphBad++; for (const v of onlyIn(mx, my)) rows.push("  module only in " + process.env.NA + ": " + v.slice(0, 160)); for (const v of onlyIn(my, mx)) rows.push("  module only in " + process.env.NB + ": " + v.slice(0, 160)); }
  else if (!countOk) regroup++;
  else if (namesOk) identical++; else nameDiff++;
  if (label.startsWith("*") || !modsOk || !countOk) rows.unshift(label.replace(/^\*/, "") + ": " + verdict + "  client modules " + mx.size + "/" + my.size + "  chunk files " + cx.size + "/" + cy.size);
};
const named = new Set(Object.values(names).map(key));
for (const [n, rel] of Object.entries(names)) check(key(rel), "*" + n + " " + rel);
for (const id of all) if (!named.has(id)) check(id, id);
console.log(rows.join("\n"));
console.log("(site) page manifests compared: " + (identical + nameDiff + regroup + graphBad) + "; identical " + identical + "; same graph, chunk names differ " + nameDiff + "; same client modules, chunk grouping differs " + regroup + "; different client modules " + graphBad + "; in one build only " + added);
console.log("chunk files that differ, in " + process.env.NA + ": " + [...diffA].map(([c, n]) => c.replace("/_next/static/chunks/", "") + " " + n + "B").join(", "));
console.log("chunk files that differ, in " + process.env.NB + ": " + [...diffB].map(([c, n]) => c.replace("/_next/static/chunks/", "") + " " + n + "B").join(", "));
console.log(graphBad === 0 ? "RESULT: every kpop page reaches the same client modules as " + process.env.NA : "RESULT: " + graphBad + " page(s) reach other client modules than " + process.env.NA);
process.exit(graphBad === 0 ? 0 : 1);
' ;;
  *) echo "usage: kpop-chunks.sh snapshot <name> | compare <a> <b>" >&2; exit 2 ;;
esac
