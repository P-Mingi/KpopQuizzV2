// Run O1, lane B1: the brand codemod. The core is proven on planted inputs (applied, re-run, stale, imports),
// and the rules table is checked against OWNERSHIP.json so a rule can never name a file the lane may not commit.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { applyRule, countBrandLiterals, globToRegExp, insertImports, ownedBy, parseHot } from './codemod-core';
import { ALLOWLIST, RULES } from './codemod-rules';

const REPO = fileURLToPath(new URL('../../../../../../', import.meta.url));
const IMPORT = "import { SITE } from '@/lib/site/registry';";

describe('applyRule', () => {
  const rule = { file: 'x.ts', imports: [IMPORT], edits: [{ from: "'https://kpopquiz.org'", to: 'SITE.url' }] };

  it('replaces every occurrence and adds the import once', () => {
    const src = "import a from 'a';\n\nconst x = 'https://kpopquiz.org';\nconst y = 'https://kpopquiz.org';\n";
    const r = applyRule(src, rule);
    expect(r.text).toBe(`import a from 'a';\n\n${IMPORT}\n\nconst x = SITE.url;\nconst y = SITE.url;\n`);
    expect(r.applied).toBe(1);
    expect(r.missing).toEqual([]);
  });

  it('is idempotent: a second run changes nothing', () => {
    const once = applyRule("import a from 'a';\nconst x = 'https://kpopquiz.org';\n", rule);
    const twice = applyRule(once.text, rule);
    expect(twice.text).toBe(once.text);
    expect(twice.applied).toBe(0);
    expect(twice.already).toBe(1);
    expect(twice.importsAdded).toBe(0);
  });

  it('reports a rule whose two sides are both gone', () => {
    const r = applyRule('const z = 1;\n', rule);
    expect(r.missing).toEqual(["'https://kpopquiz.org'"]);
    expect(r.text).toBe('const z = 1;\n');
  });

  it('a wrapping edit (the new text holds the old) is applied once', () => {
    const wrap = { file: 'x.ts', edits: [{ from: 'foo', to: '(foo)' }] };
    const once = applyRule('foo', wrap);
    expect(once.text).toBe('(foo)');
    expect(applyRule(once.text, wrap).text).toBe('(foo)');
  });
});

describe('insertImports', () => {
  it('goes after the last value import, apart from packages, and before the type imports', () => {
    const src = "import Link from 'next/link';\n\nimport { A } from '@/a';\n\nimport type { T } from 'next';\n";
    expect(insertImports(src, [IMPORT]).text).toBe(
      "import Link from 'next/link';\n\nimport { A } from '@/a';\n" + `${IMPORT}\n\nimport type { T } from 'next';\n`,
    );
    const pkg = "import Link from 'next/link';\n\nconst a = 1;\n";
    expect(insertImports(pkg, [IMPORT]).text).toBe(`import Link from 'next/link';\n\n${IMPORT}\n\nconst a = 1;\n`);
  });

  it('reads a multi-line import as one statement', () => {
    const src = "import {\n  a,\n  b,\n} from '@/x';\n\nconst c = 1;\n";
    expect(insertImports(src, [IMPORT]).text).toBe(`import {\n  a,\n  b,\n} from '@/x';\n${IMPORT}\n\nconst c = 1;\n`);
  });

  it('in a file with only type imports, the value import goes first', () => {
    const src = "import type { T } from 'next';\n\nexport const a = 1;\n";
    expect(insertImports(src, [IMPORT]).text).toBe(`${IMPORT}\n\nimport type { T } from 'next';\n\nexport const a = 1;\n`);
  });

  it('in a file with none, it goes under the header comment and after a use-client directive', () => {
    const header = "// What this file is.\n// Second line.\n\nexport const a = 1;\n";
    expect(insertImports(header, [IMPORT]).text).toBe(`// What this file is.\n// Second line.\n\n${IMPORT}\n\nexport const a = 1;\n`);
    const client = "'use client';\n\n// header\n\nexport const a = 1;\n";
    expect(insertImports(client, [IMPORT]).text).toBe(`'use client';\n\n// header\n\n${IMPORT}\n\nexport const a = 1;\n`);
    expect(insertImports('export const a = 1;\n', [IMPORT]).text).toBe(`${IMPORT}\n\nexport const a = 1;\n`);
  });

  it('skips an import that is already there', () => {
    const src = `${IMPORT}\n\nexport const a = 1;\n`;
    expect(insertImports(src, [IMPORT])).toEqual({ text: src, added: 0 });
  });
});

describe('ownership dialect and HOT list', () => {
  it('matches the globs of OWNERSHIP.json the way scripts/o1-owner-guard.mjs does', () => {
    const globs = ['apps/quiz/src/components/layout/top-nav*.tsx', 'apps/quiz/src/app/(site)/layout.tsx', 'apps/quiz/src/app/llms.txt/**', 'a/{b,c}/d.ts', '!a/c/d.ts'];
    expect(ownedBy(globs, 'apps/quiz/src/components/layout/top-nav-bar.tsx')).toBe(true);
    expect(ownedBy(globs, 'apps/quiz/src/components/layout/top-nav/x.tsx')).toBe(false);
    expect(ownedBy(globs, 'apps/quiz/src/app/(site)/layout.tsx')).toBe(true);
    expect(ownedBy(globs, 'apps/quiz/src/app/llms.txt/route.ts')).toBe(true);
    expect(ownedBy(globs, 'a/b/d.ts')).toBe(true);
    expect(ownedBy(globs, 'a/c/d.ts')).toBe(false);
    expect(globToRegExp('x/**/y').test('x/y')).toBe(true);
  });

  it('reads the first column of HOT.txt and skips comments', () => {
    expect([...parseHot('# note\nA/b.ts\tseo/x\n\nC/d.ts\tseo/y,seo/z\n')]).toEqual(['A/b.ts', 'C/d.ts']);
  });

  it('counts the two brand literals', () => {
    expect(countBrandLiterals('KpopQuiz at kpopquiz.org, KpopQuiz')).toBe(3);
    expect(countBrandLiterals('OtakuQuiz')).toBe(0);
  });
});

// The en dash, the em dash and the emoji blocks, written by code point so this file holds none of them.
const cp = (n: number): string => String.fromCodePoint(n);
const BANNED = new RegExp(`[${cp(0x2013)}${cp(0x2014)}${cp(0x1f300)}-${cp(0x1faff)}${cp(0x2600)}-${cp(0x27bf)}]`, 'u');

describe('the rules table', () => {
  const ownership = JSON.parse(readFileSync(`${REPO}docs/o1/OWNERSHIP.json`, 'utf8')) as Record<string, string[]>;
  const globs = ownership.B1!;

  it('names only files B1 owns, once each, and they exist', () => {
    const files = RULES.map((r) => r.file);
    expect(new Set(files).size).toBe(files.length);
    for (const f of files) {
      expect(ownedBy(globs, f), f).toBe(true);
      expect(existsSync(`${REPO}${f}`), f).toBe(true);
    }
  });

  it('never rewrites a test, an email, shared code, content or the host security check', () => {
    for (const r of RULES) expect(r.file, r.file).not.toMatch(/\.test\.|\/emails?\/|packages\/shared|lib\/(articles|i18n)\/|return-to\.ts/);
  });

  it('every edit changes something and the new text has no dash or emoji', () => {
    for (const r of RULES) {
      for (const e of r.edits) {
        expect(e.from, r.file).not.toBe(e.to);
        expect(e.to, r.file).not.toMatch(BANNED);
      }
    }
  });

  it('allowlisted files are owned by B1 and carry a reason', () => {
    for (const a of ALLOWLIST) {
      expect(ownedBy(globs, a.file), a.file).toBe(true);
      expect(a.reason.length).toBeGreaterThan(20);
    }
  });
});
