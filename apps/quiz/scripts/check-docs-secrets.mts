/**
 * W5-DOCS-2 - the DOCS SECRET gate.
 *
 * Why it exists: `.gitignore` used to deny `docs/*` by default with a hand-maintained
 * allowlist. That is why 101 strategy documents sat outside git for months while the code
 * was safe in a remote: deny-by-default made tracking a thing someone had to remember, and
 * nobody did. W5-DOCS-2 inverted it, so every `docs/*.md` is tracked automatically. This
 * gate is the safety property that inversion needs: a document with a credential in it
 * fails a check instead of relying on a human opening it first.
 *
 * IT REPORTS LOCATIONS, NEVER VALUES. The rule came from the incident that produced this
 * file: the first report of a leaked address quoted the address, into a tracked file, in a
 * repo about to be pushed. Reporting a leak by copying it is how a leak spreads. So every
 * finding here is `path:line  PATTERN-NAME`, and the matched text is never printed.
 *
 * Unlike the other three gates this needs no server and no database, so it runs on push
 * rather than nightly.
 *
 *   npm run check:docs-secrets
 *
 * WHAT IT MATCHES: value shapes, not vocabulary. Measured against the whole tracked corpus
 * on 2026-08-17: the words `service_role` (45 hits) and `password` (9) appear all over the
 * strategy docs as ordinary prose, while every value-shaped pattern below scored ZERO. A
 * gate that fired on the vocabulary would have been red on its first run and ignored by its
 * second, which is the failure mode already recorded as w7-close-1.
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/**
 * Addresses that are deliberately public and must not fail the build.
 * Keep this list SHORT and justify every entry.
 */
const ALLOWED_EMAILS = new Set([
  // Published on the site itself: apps/quiz/src/app/contact/page.tsx renders it as the
  // support address, so it is already on every indexed copy of /contact.
  'hello@kpopquiz.org',
]);

/** Value-shaped patterns. A hit is a failure. */
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'OPENAI-KEY', re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: 'GITHUB-TOKEN', re: /\bghp_[A-Za-z0-9]{30,}\b/g },
  { name: 'SLACK-TOKEN', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { name: 'GOOGLE-KEY', re: /\bAIza[A-Za-z0-9_-]{30,}\b/g },
  { name: 'BEARER-TOKEN', re: /Bearer\s+[A-Za-z0-9._-]{20,}/g },
  { name: 'DB-CONNECTION-STRING', re: /(?:postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^\s`'"]+/g },
  { name: 'URL-WITH-CREDENTIALS', re: /https?:\/\/[^/\s:]+:[^@/\s]+@/g },
  { name: 'PRIVATE-KEY-BLOCK', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

/**
 * Secret-ish words only fail when a credential-shaped value sits on the SAME LINE, so
 * `service_role` in a sentence is fine and `service_role_key = <40 chars of base64>` is not.
 *
 * "Credential-shaped" had to be tightened after the first run, which produced two false
 * positives in docs/blindtest-migration-map.md: a script FILENAME next to the words
 * "service-role key", and a list of ENV VAR NAMES like NEXT_PUBLIC_SUPABASE_ANON_KEY. Long
 * identifiers are not secrets. A real key mixes lowercase and digits and is not an
 * ALL_CAPS_ENV_NAME, a dotted filename, or a slash path.
 */
const SECRET_WORDS = /\b(service_role|service-role|anon[_ -]?key|password|passwd|api[_ -]?key|secret)\b/i;

function looksLikeSecretValue(token: string): boolean {
  if (token.length < 24) return false;
  if (/^[A-Z0-9_]+$/.test(token)) return false;          // NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (/\.[a-z]{2,5}$/i.test(token)) return false;         // songs-database.json, script.mts
  if (token.includes('/')) return false;                  // a path, not a key
  if (!/[a-z]/.test(token) || !/[0-9]/.test(token)) return false; // real keys mix both
  return true;
}

const CANDIDATE_VALUE = /[A-Za-z0-9_\-./+=]{24,}/g;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

type Finding = { file: string; line: number; pattern: string };

/**
 * Anchored at the REPO ROOT, not the cwd. This gate is run from `apps/quiz` (that is where
 * the npm script lives) and a bare `git ls-files docs` there resolves to `apps/quiz/docs`,
 * which scanned exactly one file and passed. A gate that silently checks the wrong tree is
 * worse than no gate, so the root is resolved explicitly and the count is printed.
 */
function repoRoot(): string {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
}

function trackedDocs(root: string): string[] {
  const out = execSync('git ls-files docs --', { encoding: 'utf8', cwd: root });
  return out.split('\n').filter(Boolean).map((p) => `${root}/${p}`);
}

function scan(file: string): Finding[] {
  let body: string;
  try {
    body = readFileSync(file, 'utf8');
  } catch {
    return []; // unreadable or binary: nothing to assert
  }
  const findings: Finding[] = [];
  const lines = body.split('\n');

  lines.forEach((text, i) => {
    const lineNo = i + 1;

    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(text)) findings.push({ file, line: lineNo, pattern: name });
    }

    if (SECRET_WORDS.test(text)) {
      CANDIDATE_VALUE.lastIndex = 0;
      const tokens = text.match(CANDIDATE_VALUE) ?? [];
      if (tokens.some(looksLikeSecretValue)) {
        findings.push({ file, line: lineNo, pattern: 'SECRET-WORD-WITH-VALUE' });
      }
    }

    EMAIL.lastIndex = 0;
    for (const m of text.matchAll(EMAIL)) {
      if (!ALLOWED_EMAILS.has(m[0].toLowerCase())) {
        findings.push({ file, line: lineNo, pattern: 'EMAIL-NOT-ALLOWLISTED' });
      }
    }
  });

  return findings;
}

function main(): void {
  const root = repoRoot();
  const files = trackedDocs(root);
  const findings = files.flatMap(scan);

  console.log(`Docs secret gate: scanned ${files.length} tracked files under ${root}/docs/.`);
  if (files.length === 0) {
    console.error('Docs secret gate FAILED: zero tracked files found under docs/. That is a broken gate, not a clean repo.');
    process.exit(1);
  }

  if (findings.length > 0) {
    console.error(
      `\nDocs secret gate FAILED: ${findings.length} finding(s) in tracked documentation. ` +
      `Locations only, never values: this gate does not print what it matched, because ` +
      `reporting a leak by copying it is how a leak spreads.`,
    );
    for (const f of findings) console.error(`  x ${f.file.replace(root + '/', '')}:${f.line}  ${f.pattern}`);
    console.error(
      `\nIf a hit is a real credential: rotate it first, then remove it from the file. ` +
      `Removing it from the working copy does NOT remove it from git history.\n` +
      `If a hit is deliberately public (a support address, a sample token in a spec), add it ` +
      `to ALLOWED_EMAILS or narrow the pattern in this file, with a comment saying why.`,
    );
    process.exit(1);
  }

  console.log('Docs secret gate passed: no credential-shaped value in any tracked doc.');
}

main();
