// .github/workflows/cards-publish.yml, Part C of lot LAUNCH-PREP: the new input kpopdle_commons (off by default) and its step, after the card files
// and the older Kpopdle step, before the summary. The older test (cards-publish-workflow.test.ts) keeps proving the rest of the file.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const text = readFileSync(path.resolve(__dirname, '../../../../../.github/workflows/cards-publish.yml'), 'utf8');
const lines = text.split('\n');
const code = lines.filter((l) => !/^\s*#/.test(l));

describe('cards-publish.yml: the Kpopdle Commons faces', () => {
  it('has the input kpopdle_commons, non or oui, non by default', () => {
    expect(code.join('\n')).toMatch(/ {6}kpopdle_commons:\n(?: {8}[^\n]+\n)*? {8}type: choice\n {8}options:\n {10}- non\n {10}- oui\n {8}default: non/);
  });
  it('runs kpopdle-commons.mjs --publish only on oui, with the committed verdict file and the originals cache, the key through env only', () => {
    const i = code.findIndex((l) => l.includes('name: Publish the Kpopdle Commons faces'));
    expect(i).toBeGreaterThan(0);
    const step = code.slice(i, i + 8).join('\n');
    expect(step).toContain("if: inputs.kpopdle_commons == 'oui'");
    expect(step).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(step).toContain('ORIGINALS: ${{ runner.temp }}/cards-originals');
    const run = code.slice(i, i + 8).find((l) => /^\s+run:/.test(l))!;
    expect(run).toBe('        run: node apps/quiz/scripts/cards/kpopdle-photos/kpopdle-commons.mjs --verdicts docs/design/cards/data/kpopdle-faces/photocheck.csv --cache-dir "$ORIGINALS" --publish');
    expect(run).not.toContain('${{');
  });
  it('comes after the card files and the older Kpopdle step, and before the summary', () => {
    const names = code.filter((l) => /^ {6}- name: /.test(l)).map((l) => l.replace(/^ {6}- name: /, ''));
    const at = (n: string): number => names.indexOf(n);
    expect(at('Publish the card files')).toBeLessThan(at('Publish the Kpopdle idol photos'));
    expect(at('Publish the Kpopdle idol photos')).toBeLessThan(at('Publish the Kpopdle Commons faces'));
    expect(at('Publish the Kpopdle Commons faces')).toBeLessThan(at('Summary'));
  });
});
