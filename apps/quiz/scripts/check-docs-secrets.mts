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
  // The commit trailer of AI-assisted commits ("Co-Authored-By: ... <this address>"),
  // quoted in run briefs and reports. A public no-reply address of a vendor, not ours.
  'noreply@anthropic.com',
]);

/**
 * The project's own domains (owner, 2026-11-09): role addresses on them (the Team accounts of team.bunnyverse.org, the
 * contact and privacy addresses of the legal drafts) are quoted in launch docs, SQL and reports. They are not personal data.
 * The old anime domain, its team subdomain and the old hub domain are the domains planned and abandoned on 2026-10-28 (RUNBOOK,
 * "Superseded"); no account uses them (production read, 2026-11-09). They are built in pieces, as src/lib/site/fandomverse-names.test.ts
 * asks of any code that names an old domain on purpose. An address on any other domain still fails.
 */
const ABANDONED_DOMAINS = [['otakuquiz', 'org'], ['team', 'otakuquiz', 'org'], ['fanquiz', 'org']].map((parts) => parts.join('.'));
const ALLOWED_EMAIL_DOMAINS = new Set(['kpopquiz.org', 'bunnyverse.org', 'team.bunnyverse.org', ...ABANDONED_DOMAINS]);

function isProjectDomainEmail(address: string): boolean {
  return ALLOWED_EMAIL_DOMAINS.has(address.toLowerCase().split('@')[1] ?? '');
}

/**
 * Placeholder addresses are not personal data: the domains RFC 2606 / 6761 reserve for
 * documentation and tests (example.com / .org / .net, *.example, *.test, *.invalid,
 * localhost). Unit-test output and API proofs quoted in reports are full of them.
 */
function isPlaceholderEmail(address: string): boolean {
  const domain = address.toLowerCase().split('@')[1] ?? '';
  return /^(.+\.)?example\.(com|org|net)$/.test(domain) || /\.(example|test|invalid)$/.test(domain) || domain === 'localhost';
}

/**
 * A SQL LIKE pattern is not an address. The v12 editorial-account SQL checks that each account's
 * email ends with the domain of the seeded test accounts (`LIKE '%@fake.kpopquizz.com'`), so the
 * address regex reads the `%` wildcard as a local part. Only that exact wildcard form, and only
 * in docs/pending-migrations/v12-*.sql, passes (owner, 2026-10-06); a real address on that
 * domain, or the pattern anywhere else, still fails.
 */
function isV12FakeDomainPattern(file: string, match: string): boolean {
  return /\/docs\/pending-migrations\/v12-[^/]+\.sql$/.test(file) && match.toLowerCase() === '%@fake.kpopquizz.com';
}

/**
 * Binary files tracked under docs/ (screenshots, design captures) are not text: read as
 * UTF-8 their bytes produce address-shaped noise. They are skipped by extension, and any
 * other file holding a NUL byte is skipped too.
 */
const BINARY_EXT = /\.(png|jpe?g|webp|gif|avif|ico|pdf|zip|gz|woff2?|ttf|otf|mp3|mp4|mov|webm)$/i;

/** Value-shaped patterns. A hit is a failure. */
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'OPENAI-KEY', re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: 'GITHUB-TOKEN', re: /\bghp_[A-Za-z0-9]{30,}\b/g },
  { name: 'SLACK-TOKEN', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { name: 'GOOGLE-KEY', re: /\bAIza[A-Za-z0-9_-]{30,}\b/g },
  { name: 'BEARER-TOKEN', re: /Bearer\s+[A-Za-z0-9._-]{20,}/g },
  { name: 'DB-CONNECTION-STRING', re: /(?:postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^\s`'"]+/g },
  { name: 'PRIVATE-KEY-BLOCK', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

/**
 * user:password@host. The user and password parts exclude quotes, backslashes, braces,
 * brackets and commas: without that, a JSON-LD dump (`"https://schema.org","@type":...`)
 * read as credentials (37 false positives the day the v11 reports were merged). A URL
 * whose HOST is a reserved placeholder domain (a unit test named
 * `refuses "https://user:pw@example.com/..."`) is not a credential either.
 */
const URL_WITH_CREDENTIALS = /https?:\/\/[^/\s:@"'\\{}[\],]+:[^@/\s"'\\{}[\],]+@([A-Za-z0-9.-]+)/g;

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
  // Run O1 content (owner, 2026-11-09): quiz slugs and fact ids next to the word "secret" in quiz text
  // ("akito-s-secret-...", "spy-x-family-anya-telepath-013") are kebab-case words, not keys. A UUID shape stays a candidate.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(token) && /^[a-z]+(-[a-z0-9]+){2,}$/.test(token) && /[a-z]{3,}-[a-z]{3,}/.test(token)) return false;
  // A schema-qualified SQL name next to service_role (`grant execute on function public.ensure_daily_quiz_v2 to service_role`).
  if (/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(token)) return false;
  // The all-zero sentinel UUID of the account deletion docs (00000000-0000-0000-0000-00000000dead) is not a key.
  if (/^0{8}-0{4}-0{4}-0{4}-[0-9a-f]{12}$/.test(token)) return false;
  return true;
}

const CANDIDATE_VALUE = /[A-Za-z0-9_\-./+=]{24,}/g;

/**
 * Run O1 (owner, 2026-11-09): the rehearsal and proof scripts under docs/ build their database URL from the environment
 * (`postgresql://postgres.${REF}:${PW}@host/postgres`). A connection string whose password is a shell variable, a <placeholder>
 * or absent is a template, not a credential. A literal password still fails.
 */
function isTemplateConnection(url: string): boolean {
  const cred = /^[a-z+]+:\/\/([^@/]*)@/i.exec(url)?.[1];
  if (cred === undefined) return true;
  const pw = cred.includes(':') ? cred.slice(cred.indexOf(':') + 1) : '';
  return pw === '' || /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$/.test(pw) || /^<[^<>]+>$/.test(pw);
}

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
  if (BINARY_EXT.test(file)) return [];
  let body: string;
  try {
    body = readFileSync(file, 'utf8');
  } catch {
    return []; // unreadable: nothing to assert
  }
  if (body.includes('\u0000')) return []; // binary content under another extension
  const findings: Finding[] = [];
  const lines = body.split('\n');

  lines.forEach((text, i) => {
    const lineNo = i + 1;

    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      if (name === 'DB-CONNECTION-STRING') {
        if ([...text.matchAll(re)].some((m) => !isTemplateConnection(m[0]))) findings.push({ file, line: lineNo, pattern: name });
        continue;
      }
      if (re.test(text)) findings.push({ file, line: lineNo, pattern: name });
    }

    URL_WITH_CREDENTIALS.lastIndex = 0;
    for (const m of text.matchAll(URL_WITH_CREDENTIALS)) {
      if (!isPlaceholderEmail(`x@${m[1]}`)) findings.push({ file, line: lineNo, pattern: 'URL-WITH-CREDENTIALS' });
    }

    if (SECRET_WORDS.test(text)) {
      CANDIDATE_VALUE.lastIndex = 0;
      // A piece of a URL path on the same line (a Wikipedia title cut at "(" or a non-ASCII letter) is a path, like the tokens
      // holding a "/" that looksLikeSecretValue already skips. The query string and fragment are not skipped.
      const urlPaths = [...text.matchAll(/https?:\/\/[^\s"'<>?#]+/g)].map((m) => m[0]);
      const tokens = (text.match(CANDIDATE_VALUE) ?? []).filter((t) => !urlPaths.some((u) => u.includes(t)));
      if (tokens.some(looksLikeSecretValue)) {
        findings.push({ file, line: lineNo, pattern: 'SECRET-WORD-WITH-VALUE' });
      }
    }

    EMAIL.lastIndex = 0;
    for (const m of text.matchAll(EMAIL)) {
      if (!ALLOWED_EMAILS.has(m[0].toLowerCase()) && !isPlaceholderEmail(m[0]) && !isProjectDomainEmail(m[0]) && !isV12FakeDomainPattern(file, m[0])) {
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
