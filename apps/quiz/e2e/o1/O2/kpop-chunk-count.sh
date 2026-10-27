#!/bin/bash
# Run O1, lane O2: the kpop routes load the chunks they loaded before the series art.
#   kpop-chunk-count.sh snapshot <name>   reads apps/quiz/.next (an offline build of the kpop site) with e2e/o1/P1/kpop-chunks.sh
#   kpop-chunk-count.sh compare <a> <b>   per kpop route, the number of client modules and of chunk files in both snapshots; exit 0
#                                         only when every route has the same client modules and the same number of chunk files
# Build first: scripts/o1/env.sh offline -- env NEXT_PUBLIC_SITE_ID=kpop NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 pnpm -C apps/quiz build
# Snapshots live in $O1_SNAP (default $TMPDIR/o1-P1-kpop-chunks), like the P1 script. The base is `git merge-base o1/integration o1/O2`,
# built and snapshotted on its own (git checkout --detach), then the head: the two builds run one after the other.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SNAP="${O1_SNAP:-${TMPDIR:-/tmp}/o1-P1-kpop-chunks}"
cmd="${1:-}"; shift || true
case "$cmd" in
  snapshot) exec bash "$HERE/../P1/kpop-chunks.sh" snapshot "${1:?usage: kpop-chunk-count.sh snapshot <name>}" ;;
  compare)
    a="${1:?usage: kpop-chunk-count.sh compare <a> <b>}"; b="${2:?usage: kpop-chunk-count.sh compare <a> <b>}"
    A="$SNAP/$a" B="$SNAP/$b" NA="$a" NB="$b" node -e '
const fs = require("fs"), path = require("path");
const ids = (d) => fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const all = [...new Set([...ids(process.env.A), ...ids(process.env.B)])].sort();
const read = (d, id) => { try { return JSON.parse(fs.readFileSync(path.join(d, id + ".json"), "utf8")); } catch { return null; } };
const strip = (m) => m.replace(/ \[[^\]]*\]$/, "");
// The routes of the brief first: the group hubs and trivia hubs, trending, a quiz page, the quiz list routes.
const named = [
  ["app/(site)/[slug]", "(site)~[slug]~page"], ["app/(site)/trending", "(site)~trending~page"], ["app/(site)/q/[slug]", "(site)~q~[slug]~page"],
  ["app/(site)/new", "(site)~new~page"], ["app/(site)/most-liked", "(site)~most-liked~page"], ["app/(site)/quizzes", "(site)~quizzes~page"],
  ["app/(site)/easy-kpop-quizzes", "(site)~easy-kpop-quizzes~page"], ["app/(site)/hard-kpop-quizzes", "(site)~hard-kpop-quizzes~page"],
  ["app/(site)/kpop-demon-hunters-quiz", "(site)~kpop-demon-hunters-quiz~page"], ["app/(site)/page", "(site)~page"],
];
let bad = 0, same = 0;
const line = (label, id, always) => {
  const x = read(process.env.A, id), y = read(process.env.B, id);
  if (!x || !y) { if (always) { console.log(label + ": missing in " + (x ? process.env.NB : process.env.NA)); bad++; } return; }
  const mx = x.modules.map(strip).sort(), my = y.modules.map(strip).sort();
  const modsOk = mx.length === my.length && mx.every((m, i) => m === my[i]);
  const cx = new Set(x.chunks), cy = new Set(y.chunks);
  const countOk = cx.size === cy.size;
  const sameFiles = countOk && [...cx].every((c) => cy.has(c));
  if (modsOk && countOk) same++; else bad++;
  if (always || !modsOk || !countOk) console.log(label.padEnd(36) + " client modules " + mx.length + "/" + my.length + "  chunk files " + cx.size + "/" + cy.size + "  " + (modsOk && countOk ? (sameFiles ? "equal (same files)" : "equal (same counts, file names differ)") : "DIFFERENT"));
};
for (const [label, id] of named) line(label, id, true);
const done = new Set(named.map((n) => n[1]));
for (const id of all) if (!done.has(id)) line(id, id, false);
console.log("routes compared: " + (same + bad) + "; equal " + same + "; different " + bad);
console.log(bad === 0 ? "RESULT: every kpop route has the same client modules and the same number of chunk files in " + process.env.NA + " and " + process.env.NB : "RESULT: " + bad + " route(s) differ between " + process.env.NA + " and " + process.env.NB);
process.exit(bad === 0 ? 0 : 1);
' ;;
  *) echo "usage: kpop-chunk-count.sh snapshot <name> | compare <a> <b>" >&2; exit 2 ;;
esac
