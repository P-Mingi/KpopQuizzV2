// .github/workflows/cards-publish.yml (integrator, 2026-11-17): the owner publishes the card files from GitHub Actions. Read as text (no
// YAML dependency): started by hand only, read-only token, the environment "cards-publish" (its reviewer and its secret), 300 minutes,
// Node 22, a frozen install, the host checked exactly before anything, the inputs and the secret reaching the scripts through the
// environment only (never written into a shell line), the non-interactive publish with --keep-going, Kpopdle on "oui", the summary, and the
// cache of the Commons originals saved even when photos failed.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const FILE = path.resolve(__dirname, '../../../../../.github/workflows/cards-publish.yml');
const text = readFileSync(FILE, 'utf8');
const code = text.split('\n').filter((l) => !/^\s*#/.test(l)); // the lines that are not comments

/** The top-level block `name:` (its lines, indented below it). */
function block(name: string): string[] {
  const i = code.findIndex((l) => l === `${name}:`);
  if (i < 0) return [];
  const out: string[] = [];
  for (const l of code.slice(i + 1)) { if (/^\S/.test(l)) break; out.push(l); }
  return out;
}

/** Every step: its lines, from its `- ` line to the next one. */
function steps(): string[][] {
  const at = code.findIndex((l) => /^ {4}steps:$/.test(l));
  const out: string[][] = [];
  for (const l of code.slice(at + 1)) {
    if (/^ {6}- /.test(l)) out.push([l]);
    else if (out.length && (/^ {7,}\S/.test(l) || l.trim() === '')) out[out.length - 1]!.push(l);
    else if (/^\S|^ {0,5}\S/.test(l)) break;
  }
  return out;
}
const stepNamed = (name: string): string[] => steps().find((s) => s.some((l) => l.includes(`name: ${name}`))) ?? [];
/** The shell of a step: its `run:` line and, for `run: |`, the lines below it. */
function shell(step: string[]): string {
  const i = step.findIndex((l) => /^\s*(- )?run:/.test(l));
  if (i < 0) return '';
  const first = step[i]!.replace(/^\s*(- )?run:\s*/, '');
  if (first !== '|') return first;
  const indent = step[i]!.search(/\S/) + 2;
  const out: string[] = [];
  for (const l of step.slice(i + 1)) { if (l.trim() !== '' && l.search(/\S/) < indent) break; out.push(l); }
  return out.join('\n');
}

describe('cards-publish.yml', () => {
  it('starts by hand only: workflow_dispatch, never a push, a pull request or a schedule', () => {
    const on = block('on').filter((l) => /^ {2}\S/.test(l)).map((l) => l.trim());
    expect(on).toEqual(['workflow_dispatch:']);
    for (const l of code) expect(l).not.toMatch(/\b(push|pull_request|pull_request_target|schedule|workflow_run|repository_dispatch|workflow_call)\s*:/);
  });

  it('has the two inputs: the host (text) and kpopdle (non or oui, non by default)', () => {
    const on = block('on').join('\n');
    expect(on).toMatch(/ {6}host:\n {8}description: [^\n]+\n {8}required: true\n {8}type: string/);
    expect(on).toMatch(/ {6}kpopdle:\n(?: {8}[^\n]+\n)*? {8}type: choice\n {8}options:\n {10}- non\n {10}- oui\n {8}default: non/);
  });

  it('reads the repository only, in the environment cards-publish, for 300 minutes at most', () => {
    expect(block('permissions')).toEqual(['  contents: read', '']);
    expect(code.filter((l) => /^\s+permissions:/.test(l))).toEqual([]);
    expect(code).toContain('    environment: cards-publish');
    expect(code).toContain('    timeout-minutes: 300');
    expect(code).toContain('          node-version: 22');
    expect(code).toContain('        run: pnpm install --frozen-lockfile');
    expect(code).toContain('          persist-credentials: false');
  });

  it('checks the host exactly, the branch and the secret before anything else', () => {
    const first = steps()[0]!;
    expect(first[0]).toContain('name: Check the host, the branch and the secret');
    const sh = shell(first);
    expect(sh).toContain('if [ "$HOST" != "rdkgouofytwfdpbxbzio.supabase.co" ]; then');
    expect(sh).toContain('if [ "$REF" != "refs/heads/main" ]; then');
    expect(sh).toContain('if [ -z "$SERVICE_KEY" ]; then');
    expect(sh.match(/exit 1/g)).toHaveLength(3);
  });

  it('no input, secret or context is written into a shell line: they reach it through env', () => {
    for (const s of steps()) expect(shell(s)).not.toContain('${{');
    const secrets = text.match(/secrets\.[A-Za-z_]+/g) ?? [];
    expect(new Set(secrets)).toEqual(new Set(['secrets.SUPABASE_SERVICE_ROLE_KEY']));
    // the secret only as the value of an env entry
    for (const l of code.filter((x) => x.includes('secrets.'))) expect(l).toMatch(/^ {10}[A-Z_]+: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}$/);
    expect(text).not.toMatch(/echo[^\n]*\$(SERVICE_KEY|CARDS_SERVICE_KEY|SUPABASE_SERVICE_ROLE_KEY)/);
  });

  it('publishes the card files in the non-interactive mode, keeps going over a failed photo, and is red at the end when one failed', () => {
    const pub = stepNamed('Publish the card files');
    expect(pub.join('\n')).toContain('CARDS_SUPABASE_URL: https://rdkgouofytwfdpbxbzio.supabase.co');
    expect(pub.join('\n')).toContain('CARDS_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(shell(pub)).toContain('node apps/quiz/scripts/cards/publish-card-files.mjs --publish --non-interactive --host "$HOST" --keep-going --cache-dir "$ORIGINALS" --report "$REPORT"');
    expect(shell(pub)).toContain('if [ "$code" -ne 0 ] && [ "$code" -ne 2 ]; then exit "$code"; fi');
    const red = stepNamed('Red when photos failed');
    expect(red.join('\n')).toContain("if: steps.cards.outputs.code == '2'");
    expect(shell(red)).toContain('exit 1');
  });

  it('then Kpopdle when the input says oui, then the summary of the job', () => {
    const k = stepNamed('Publish the Kpopdle idol photos');
    expect(k.join('\n')).toContain("if: inputs.kpopdle == 'oui'");
    expect(k.join('\n')).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(shell(k)).toBe('node apps/quiz/scripts/cards/kpopdle-photos/kpopdle-photos.mjs --publish');
    const sum = stepNamed('Summary');
    expect(sum.join('\n')).toContain("if: always() && steps.cards.outcome != 'skipped'");
    expect(shell(sum)).toContain('node apps/quiz/scripts/cards/publish-summary.mjs --cards "$REPORT" --kpopdle-csv apps/quiz/scripts/cards/kpopdle-photos/kpopdle-photos-report.csv --kpopdle "$KPOPDLE"');
    const names = steps().map((s) => (s.find((l) => l.includes('name: ')) ?? s[0]!).replace(/^.*name: /, '').trim());
    expect(names.indexOf('Publish the card files')).toBeLessThan(names.indexOf('Publish the Kpopdle idol photos'));
    expect(names.indexOf('Publish the Kpopdle idol photos')).toBeLessThan(names.indexOf('Summary'));
    expect(names.at(-1)).toBe('Red when photos failed');
  });

  it('restores the Commons originals and saves them even when photos failed', () => {
    const restore = stepNamed('Restore the Commons originals').join('\n');
    const save = stepNamed('Save the Commons originals').join('\n');
    expect(restore).toContain('uses: actions/cache/restore@v4');
    expect(save).toContain('uses: actions/cache/save@v4');
    expect(save).toContain("if: always() && steps.cards.outcome != 'skipped'");
    for (const t of [restore, save]) {
      expect(t).toContain('path: ${{ runner.temp }}/cards-originals');
      expect(t).toContain('key: cards-originals-${{ github.run_id }}-${{ github.run_attempt }}');
    }
    expect(restore).toContain('cards-originals-\n');
  });

  it('has no em or en dash', () => {
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
});
