#!/usr/bin/env node
// Run O1 ownership guard (RUN-O1-PROMPT section 2). Copy of scripts/v12-owner-guard.mjs
// with the O1 paths (docs/o1) and the agent id read from git config o1.agent.
//
// Every agent of run O1 may only touch the paths its id owns in
// docs/o1/OWNERSHIP.json (plus the implicit
// docs/o1/reports/<id>.md, docs/o1/reports/<id>/** for the report's evidence, and
// docs/o1/requests/<id>.md). This script enforces it.
//
// Modes
//   (default)                 pre-commit: checks every STAGED path (added,
//                             modified, deleted; a rename counts as its old AND
//                             its new path). Installed per worktree as
//                             scripts/o1-hooks/pre-commit.
//   --range <base>..<head>    ORCH before a merge: every path touched by any
//                             non-merge commit in base..head, plus the net diff
//                             base...head (from the merge base).
//   --paths <p1> [p2 ...]     dry run on explicit paths (self-test, debugging).
//
// Agent id: --agent <id>, else `git config o1.agent` (set per worktree with
// `git config --worktree o1.agent <id>`: env vars do not survive between shell
// calls), else the O1_AGENT env var.
//   - pre-commit with no agent: NO-OP (exit 0), so the owner's own commits and
//     every non-run worktree are never blocked.
//   - --range / --paths with no agent: usage error (exit 2); a merge check must
//     say whose branch it is checking.
// Ownership: OWNERSHIP.json of the working tree, or --ownership <file>, or
// --ownership-ref <rev> (the committed file at that revision). The pre-commit
// hook runs the guard AND reads OWNERSHIP.json from HEAD, so an uncommitted edit
// of either can never loosen the check it is about to be judged by.
//
// Glob dialect (matches OWNERSHIP.json as written): `**` = any depth (also zero
// directories), `*` = anything but `/`, `?` = one char but `/`, `{a,b}` =
// alternatives. `[` `]` `(` `)` are LITERAL (route folders like [slug] and
// (site)). A path is allowed when it matches one positive glob of the agent and
// no `!` glob of the agent.
//
// Exit: 0 all owned, 1 offending paths (listed), 2 usage / setup error.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OWNERSHIP_REL = 'docs/o1/OWNERSHIP.json';
const RUN_REL = 'docs/o1';

function fail(msg, code = 2) {
  process.stderr.write(`o1-owner-guard: ${msg}\n`);
  process.exit(code);
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// ---- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
let range = null;
let paths = null;
let agentArg = null;
let ownershipArg = null;
let ownershipRef = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--range') range = argv[++i];
  else if (a === '--agent') agentArg = argv[++i];
  else if (a === '--ownership') ownershipArg = argv[++i];
  else if (a === '--ownership-ref') ownershipRef = argv[++i];
  else if (a === '--paths') { paths = argv.slice(i + 1); break; }
  else if (a === '-h' || a === '--help') {
    process.stdout.write('usage: o1-owner-guard.mjs [--agent ID] [--ownership FILE | --ownership-ref REV] [--range BASE..HEAD | --paths P...]\n');
    process.exit(0);
  } else fail(`unknown argument "${a}"`);
}
if (range !== null && paths !== null) fail('--range and --paths are exclusive');
if (ownershipArg !== null && ownershipRef !== null) fail('--ownership and --ownership-ref are exclusive');
// git refs can never contain "..", so the first ".." (or "...") is the separator.
const rangeParts = range === null ? null : /^(.+?)\.\.\.?(.+)$/.exec(range);
if (range !== null && !rangeParts) fail('--range expects <base>..<head>');

function configAgent() {
  try { return execFileSync('git', ['config', '--get', 'o1.agent'], { encoding: 'utf8' }).trim(); } catch { return ''; }
}
const agent = (agentArg ?? (configAgent() || process.env.O1_AGENT || '')).trim();
if (!agent) {
  if (range === null && paths === null) process.exit(0); // pre-commit, not a run agent: no-op
  fail('no agent: run `git config --worktree o1.agent <id>` or pass --agent <id>');
}

// ---- ownership ----------------------------------------------------------------
let root;
try { root = git(['rev-parse', '--show-toplevel']).trim(); } catch { fail('not inside a git work tree'); }
const ownershipFile = ownershipRef !== null
  ? `${ownershipRef}:${OWNERSHIP_REL}`
  : ownershipArg ? path.resolve(ownershipArg) : path.join(root, OWNERSHIP_REL);
let ownership;
try {
  const raw = ownershipRef !== null
    ? git(['show', `${ownershipRef}:${OWNERSHIP_REL}`])
    : fs.readFileSync(ownershipFile, 'utf8');
  ownership = JSON.parse(raw);
} catch (e) { fail(`cannot read ${ownershipFile}: ${String(e.message).split('\n')[0]}`); }
const globs = Array.isArray(ownership[agent]) ? ownership[agent].filter((g) => !g.startsWith('TODO')) : ownership[agent];
if (!Array.isArray(globs)) {
  const ids = Object.keys(ownership).filter((k) => !k.startsWith('_')).join(', ');
  fail(`unknown agent "${agent}" (OWNERSHIP.json ids: ${ids})`);
}

function expandBraces(glob) {
  const m = /\{([^{}]*)\}/.exec(glob);
  if (!m) return [glob];
  return m[1].split(',').flatMap((alt) => expandBraces(glob.slice(0, m.index) + alt + glob.slice(m.index + m[0].length)));
}

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } // "**/" = zero or more directories
        else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const compile = (list) => list.flatMap(expandBraces).map(globToRegExp);
// Implicit per-agent files: the report (+ a folder for its screenshots, which the
// report must show and the PR links to) and the request log to other owners.
const positive = compile(globs.filter((g) => !g.startsWith('!')).concat([
  `${RUN_REL}/reports/${agent}.md`,
  `${RUN_REL}/reports/${agent}/**`,
  `${RUN_REL}/requests/${agent}.md`,
]));
const negative = compile(globs.filter((g) => g.startsWith('!')).map((g) => g.slice(1)));

function isOwned(p) {
  // a path with a '.' or '..' segment, or an absolute path, is never owned (no escape through ../)
  if (p.startsWith('/') || p.split('/').some((seg) => seg === '..' || seg === '.')) return false;
  return positive.some((r) => r.test(p)) && !negative.some((r) => r.test(p));
}

// ---- collect paths ------------------------------------------------------------
function splitZ(out) { return out.split('\0').filter(Boolean); }

let checked;
let label;
if (paths !== null) {
  checked = paths;
  label = 'given paths';
} else if (range !== null) {
  const [, base, head] = rangeParts;
  for (const ref of [base, head]) {
    try { git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); } catch { fail(`unknown ref "${ref}"`); }
  }
  const perCommit = splitZ(git(['log', '--no-merges', '--format=', '--name-only', '--no-renames', '-z', `${base}..${head}`]));
  const net = splitZ(git(['diff', '--name-only', '--no-renames', '-z', `${base}...${head}`]));
  const merges = git(['rev-list', '--merges', `${base}..${head}`]).split('\n').filter(Boolean);
  if (merges.length) process.stderr.write(`o1-owner-guard: note: ${merges.length} merge commit(s) in ${range}; their own changes are covered by the net diff only\n`);
  checked = [...new Set([...perCommit, ...net])];
  label = `range ${range}`;
} else {
  // --no-renames: a rename shows up as a delete of the old path + an add of the new one
  checked = splitZ(git(['diff', '--cached', '--name-only', '--no-renames', '-z']));
  label = 'staged paths';
}

const offending = checked.filter((p) => !isOwned(p)).sort();
if (offending.length) {
  process.stderr.write(`o1-owner-guard: ${agent} does not own ${offending.length} of ${checked.length} ${label}:\n`);
  for (const p of offending) process.stderr.write(`  - ${p}\n`);
  process.stderr.write(`Ownership: ${ownershipRef !== null ? ownershipFile : path.relative(root, ownershipFile)}. Ask the owner of the file through ${RUN_REL}/requests/${agent}.md.\n`);
  process.exit(1);
}
process.stdout.write(`o1-owner-guard: ${agent} ok (${checked.length} ${label})\n`);
process.exit(0);
