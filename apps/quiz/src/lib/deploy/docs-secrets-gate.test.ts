// The docs secret gate (scripts/check-docs-secrets.mts), run as CI runs it on a throwaway git repository: a docs/ file
// with credential-shaped values must fail, the project's own role addresses and identifiers must pass.
//
// Owner, 2026-11-09: the false positives of run O1 were narrowed (closed list of project domains, slugs, schema.function
// names, the zero sentinel UUID, URL path pieces, templated connection strings). This test pins what the gate must STILL
// catch, so loosening it later breaks CI. Every fake value is assembled at run time from pieces: no fake secret is ever
// committed in clear, and the gate's output is checked to never contain one.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const GATE = path.join(APP, 'scripts/check-docs-secrets.mts');
const TSX_CLI = path.join(path.dirname(createRequire(import.meta.url).resolve('tsx/package.json')), 'dist/cli.mjs');

const repos: string[] = [];
afterAll(() => repos.forEach((r) => rmSync(r, { recursive: true, force: true })));

/** A git repository holding one tracked docs/fixture.md with these lines; the gate's exit code and output. */
function runGate(lines: string[]): { status: number | null; out: string } {
  const repo = mkdtempSync(path.join(tmpdir(), 'docs-secrets-'));
  repos.push(repo);
  spawnSync('git', ['init', '-q'], { cwd: repo });
  mkdirSync(path.join(repo, 'docs'));
  writeFileSync(path.join(repo, 'docs/fixture.md'), `${lines.join('\n')}\n`);
  spawnSync('git', ['add', 'docs/fixture.md'], { cwd: repo });
  const r = spawnSync(process.execPath, [TSX_CLI, GATE], { cwd: repo, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}

const j = (...parts: string[]): string => parts.join('');
// Credential-shaped fakes, never written whole in this file.
const FAKE = {
  serviceRoleKey: j('k9f2', 'm7q4', 'x1z8', 'c3v6', 'b5n0', 'l2p7', 'r4t8'),
  password: j('abcd', '1234', 'efgh', '5678', 'ijkl', '9012', 'mnop'),
  dbPassword: j('N0t', 'AReal', '1', 'Pass', 'word'),
  personalEmail: j('someone.person', '@', 'gmail', '.com'),
  supabaseSecret: j('sb_', 'secret_', 'q8w7e6r5', 't4y3u2i1', 'o0p9a8s7', 'd6f5'),
  uuid: j('3f2a9c1e', '-7b4d', '-4e8a', '-9c21', '-5d6e7f8a9b0c'),
  queryKey: j('zx81cv72', 'bn63ma54', 'sd45fg36'),
  subdomainEmail: j('someone', '@', 'mail.', 'kpopquiz', '.org'),
  lookalikeEmail: j('someone', '@', 'kpopquiz.org', '.attacker', '.net'),
};

describe('docs secret gate: what it must still catch', () => {
  const lines = [
    `the service_role key is ${FAKE.serviceRoleKey} here`,
    `password = ${FAKE.password}`,
    j('postgresql://postgres', ':', FAKE.dbPassword, '@', 'db.fakeref.supabase.co:5432/postgres'),
    `write to ${FAKE.personalEmail}`,
    `secret: ${FAKE.supabaseSecret}`,
    `webhook secret ${FAKE.uuid}`,
    j('api key in a query https://api.fakeservice.com/v1?api_key=', FAKE.queryKey),
    `a subdomain of a project domain is not on the list: ${FAKE.subdomainEmail}`,
    `a lookalike domain: ${FAKE.lookalikeEmail}`,
  ];
  const { status, out } = runGate(lines);

  it('fails', () => {
    expect(status).toBe(1);
    expect(out).toContain('Docs secret gate FAILED');
  });

  it.each([
    [1, 'SECRET-WORD-WITH-VALUE', 'a key-shaped value next to service_role'],
    [2, 'SECRET-WORD-WITH-VALUE', 'a password value'],
    [3, 'DB-CONNECTION-STRING', 'a connection string with a literal password'],
    [4, 'EMAIL-NOT-ALLOWLISTED', 'a gmail address'],
    [5, 'SECRET-WORD-WITH-VALUE', 'a Supabase sb_secret_ key'],
    [6, 'SECRET-WORD-WITH-VALUE', 'an ordinary UUID next to "secret"'],
    [7, 'SECRET-WORD-WITH-VALUE', 'a key in a URL query string'],
    [8, 'EMAIL-NOT-ALLOWLISTED', 'a subdomain of an allowed domain (exact names only)'],
    [9, 'EMAIL-NOT-ALLOWLISTED', 'a lookalike domain'],
  ])('line %i: %s (%s)', (line, pattern) => {
    expect(out).toContain(`docs/fixture.md:${line}  ${pattern}`);
  });

  it('reports locations only, never a value', () => {
    for (const v of Object.values(FAKE)) expect(out).not.toContain(v);
  });
});

describe('docs secret gate: what run O1 legitimately writes', () => {
  it('passes the project role addresses, slugs, SQL names, the sentinel UUID, URL pieces and templated connections', () => {
    const { status, out } = runGate([
      'Team account: oq_creator_01@team.bunnyverse.org; contact hello@kpopquiz.org, privacy@bunnyverse.org',
      // The abandoned domains, built in pieces as src/lib/site/fandomverse-names.test.ts asks.
      j('Old drafts: privacy@', 'otakuquiz', '.org, team@team.', 'otakuquiz', '.org, legal@', 'fanquiz', '.org'),
      'a quiz with a secret: akito-s-secret-kazuma-s-boy-and-the-last-season-fruits-basket-hard-quiz',
      'fact ids next to the word secret: spy-x-family-anya-telepath-013, demon-slayer-arcs-list-001',
      'grant execute on function public.ensure_daily_quiz_v2 to service_role;',
      'the deletion sentinel for service_role: 00000000-0000-0000-0000-00000000dead',
      'secret source: https://en.wikipedia.org/wiki/Bleach_(season_1_the_substitute_arc_2004)',
      'psql "postgresql://postgres.${REF}:${PW}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"',
    ]);
    expect(out).toContain('Docs secret gate passed');
    expect(status).toBe(0);
  });
});
