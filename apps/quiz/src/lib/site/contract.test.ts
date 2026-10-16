// Run O1 contract o1-contract-v1: the rules of docs/o1/contracts/ that code can check. Each
// checker is proven on planted good and bad inputs, then run on every real file it governs
// (per-site sheets and copy files that later lanes add), so a Wave 2 lane learns at once when a
// file breaks the contract. Grows in F0's later slices (naming traps, lanes, schema coverage).

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { O1_FLAGS, O1_SECRET_NAMES, UNTOUCHED_FLAGS } from './registry';
import { SITE_IDS, UX_NEW_TOKEN_NAMES, UX_TOKEN_NAMES } from './types';

import type { SiteId } from './types';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const REPO = fileURLToPath(new URL('../../../../../', import.meta.url));
const CONTRACTS = `${REPO}docs/o1/contracts/`;
const read = (p: string): string => readFileSync(p, 'utf8');
const listCss = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.css')).sort() : [];

// The two dash characters rule 10 bans, built from code points so this file holds neither.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const EMOJI = /\p{Extended_Pictographic}/u;
const FROZEN = new Set<string>([...UX_TOKEN_NAMES, ...UX_NEW_TOKEN_NAMES]);
const SITE_ONLY = UX_NEW_TOKEN_NAMES.filter((n) => n !== 'on-accent');

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Names declared on a0.css token blocks (tokens.md 1.1), in file order. */
function tokenBlockNames(css: string): string[] {
  const names: string[] = [];
  const tokenSel = /^(html\.ux-v1(\.dark)?(:not\(\.light\))?|\.ux-theme-(light|dark))$/;
  for (const m of stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sels = m[1]!.split(',').map((s) => s.trim());
    if (!sels.every((s) => tokenSel.test(s))) continue;
    for (const d of m[2]!.matchAll(/--ux-([a-z0-9-]+)\s*:/g)) if (!names.includes(d[1]!)) names.push(d[1]!);
  }
  return names;
}

/** Splits a selector list on commas outside parentheses and brackets. */
function splitSelectors(prelude: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of prelude) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** The problems of one per-site sheet (tokens.md 3.3, rules 1 to 4). Empty when it follows them. */
export function checkSiteSheet(site: SiteId, raw: string): string[] {
  const problems: string[] = [];
  if (DASHES.test(raw)) problems.push('dash character');
  if (EMOJI.test(raw)) problems.push('emoji');
  const css = stripComments(raw);
  const scopes = [`html.ux-v1[data-site="${site}"]`, `html.ux-v1.dark[data-site="${site}"]`];
  const scoped = (sel: string): boolean =>
    scopes.some((p) => sel.startsWith(p) && (sel.length === p.length || /[\s:.[>+~]/.test(sel[p.length]!)));

  const checkDecls = (body: string, where: string): void => {
    for (const d of body.matchAll(/(^|[;{\s])--([a-z0-9-]+)\s*:/g)) {
      const name = d[2]!;
      if (name.startsWith('ux-')) {
        if (!FROZEN.has(name.slice(3))) problems.push(`unknown token --${name} in ${where}`);
      } else if (!name.startsWith(`${site}-`)) {
        problems.push(`custom property --${name} in ${where} (use --${site}-*)`);
      }
    }
  };

  // Recursive walk over blocks: at-rules @media and @supports nest, @keyframes is skipped.
  const walk = (s: string): void => {
    let i = 0;
    let start = 0;
    while (i < s.length) {
      const ch = s[i]!;
      if (ch === ';') {
        const stmt = s.slice(start, i).trim();
        if (stmt.startsWith('@')) problems.push(`at-rule ${stmt.split(/\s/)[0]} not allowed`);
        start = i + 1;
      } else if (ch === '{') {
        const prelude = s.slice(start, i).trim();
        let depth = 1;
        let j = i + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === '{') depth++;
          if (s[j] === '}') depth--;
          j++;
        }
        const body = s.slice(i + 1, j - 1);
        if (prelude.startsWith('@')) {
          const name = prelude.split(/[\s(]/)[0]!;
          if (name === '@media' || name === '@supports') walk(body);
          else if (name !== '@keyframes') problems.push(`at-rule ${name} not allowed`);
        } else {
          if (body.includes('{')) problems.push(`nested rule inside "${prelude}"`);
          for (const sel of splitSelectors(prelude)) {
            if (!scoped(sel)) problems.push(`selector "${sel}" is not scoped to ${site}`);
          }
          checkDecls(body, prelude);
        }
        i = j;
        start = j;
        continue;
      }
      i++;
    }
    if (s.slice(start).trim()) problems.push(`stray text "${s.slice(start).trim().slice(0, 40)}"`);
  };
  walk(css);
  return problems;
}

/** Lanes that may own a copy file (copy-keys.md 1), in lower case. */
const COPY_LANES = [
  'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'e1b', 'h1', 'l1', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'p1', 'x1',
];
const COPY_KEY_RE = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

/** The problems of one copy file's text (copy-keys.md 1). */
export function checkCopyText(site: string, file: string, text: string): string[] {
  const problems: string[] = [];
  if (!(SITE_IDS as readonly string[]).includes(site)) problems.push(`unknown site folder ${site}`);
  const lane = file.replace(/\.ts$/, '');
  if (!file.endsWith('.ts') || !COPY_LANES.includes(lane)) problems.push(`file ${file} is not <lane>.ts`);
  if (DASHES.test(text)) problems.push('dash character');
  if (EMOJI.test(text)) problems.push('emoji');
  if (site === 'anime' && /k-?pop/i.test(text)) problems.push('K-pop word in an anime copy file');
  if (!/export const COPY = \{/.test(text)) problems.push('no `export const COPY = {`');
  return problems;
}

/** The problems of a loaded COPY object (keys and values). */
export function checkCopyObject(copy: unknown): string[] {
  if (typeof copy !== 'object' || copy === null) return ['COPY is not an object'];
  const problems: string[] = [];
  for (const [k, v] of Object.entries(copy)) {
    if (!COPY_KEY_RE.test(k)) problems.push(`key "${k}"`);
    if (typeof v !== 'string') problems.push(`value of "${k}" is not a string`);
  }
  return problems;
}

/** Backticked names in the first column of the table rows of one section of a contract file. */
function tableNames(md: string, heading: string): string[] {
  const start = md.indexOf(`${heading}\n`);
  expect(start, heading).toBeGreaterThan(-1);
  const rest = md.slice(start + heading.length + 1);
  const end = rest.search(/\n#{2,3} /);
  const section = end === -1 ? rest : rest.slice(0, end);
  return [...section.matchAll(/^\| `([A-Z0-9_]+)` \|/gm)].map((m) => m[1]!);
}

describe('theme token names (tokens.md 1)', () => {
  const a0 = read(`${SRC}styles/ux-v1/a0.css`);

  it('a0.css declares every frozen existing name, and nothing else but --ux-on-accent', () => {
    const declared = tokenBlockNames(a0);
    for (const n of UX_TOKEN_NAMES) expect(declared, n).toContain(n);
    expect(declared.filter((n) => !(UX_TOKEN_NAMES as readonly string[]).includes(n) && n !== 'on-accent')).toEqual([]);
    expect(UX_TOKEN_NAMES).toHaveLength(75);
  });

  it('kpop sheets never declare or read a site-only token', () => {
    const dirs = [`${SRC}styles/ux-v1/`, `${SRC}styles/ux-v12/`];
    for (const dir of dirs) {
      for (const f of listCss(dir)) {
        const css = read(`${dir}${f}`);
        for (const n of SITE_ONLY) expect(css.includes(`--ux-${n}`), `${f} --ux-${n}`).toBe(false);
      }
    }
  });

  it('new names are new and the registry key type excludes font-display', () => {
    for (const n of UX_NEW_TOKEN_NAMES) expect((UX_TOKEN_NAMES as readonly string[]).includes(n), n).toBe(false);
    expect(UX_NEW_TOKEN_NAMES).toEqual(['on-accent', 'on-no', 'accent2', 'font-display']);
  });
});

describe('per-site sheets (tokens.md 3.3)', () => {
  const good = `/* anime tokens */
html.ux-v1[data-site="anime"] { --ux-page: #F4F5F7; --ux-on-accent: #FFFFFF; --anime-gap: 8px; }
html.ux-v1.dark[data-site="anime"] { --ux-page: #11131A; }
@media (prefers-color-scheme: dark) {
  html.ux-v1[data-site="anime"]:not(.light) { --ux-page: #11131A; }
}
html.ux-v1[data-site="anime"] .ux-btn-primary, html.ux-v1[data-site="anime"] :is(.a, .b) > i { color: var(--ux-on-accent); }
@keyframes anime-pop { from { opacity: 0; } to { opacity: 1; } }
@supports (display: grid) { html.ux-v1[data-site="anime"] .x { display: grid; } }
`;

  it('accepts a sheet that follows the rules', () => {
    expect(checkSiteSheet('anime', good)).toEqual([]);
  });

  it('reports each planted break', () => {
    const cases: [string, RegExp][] = [
      ['.ux-btn-primary { color: red; }', /not scoped/],
      ['html.ux-v1 .x { color: red; }', /not scoped/],
      ['html.ux-v1[data-site="hub"] .x { color: red; }', /not scoped/],
      ['html.ux-v1[data-site="anime"]x { color: red; }', /not scoped/],
      ['html.ux-v1[data-site="anime"] { --ux-brand-new: red; }', /unknown token/],
      ['html.ux-v1[data-site="anime"] { --o2-gap: 4px; }', /custom property/],
      ['@import url("x.css");', /@import/],
      ['@font-face { font-family: X; }', /@font-face/],
      [`html.ux-v1[data-site="anime"] .x { content: "a${String.fromCharCode(0x2014)}b"; }`, /dash/],
    ];
    for (const [css, re] of cases) {
      const problems = checkSiteSheet('anime', css);
      expect(problems.join('; '), css).toMatch(re);
    }
  });

  it('every real sheet under styles/sites/anime and styles/sites/hub follows the rules', () => {
    for (const site of ['anime', 'hub'] as const) {
      const dir = `${SRC}styles/sites/${site}/`;
      for (const f of listCss(dir)) expect(checkSiteSheet(site, read(`${dir}${f}`)), `${site}/${f}`).toEqual([]);
    }
  });
});

describe('copy files (copy-keys.md 1)', () => {
  const good = "export const COPY = {\n  'nav.series': 'Series',\n  'welcome.title': 'Welcome to {brand}, {name}.',\n} as const;\n";

  it('accepts a file that follows the rules', () => {
    expect(checkCopyText('anime', 'o1.ts', good)).toEqual([]);
    expect(checkCopyObject({ 'nav.series': 'Series', 'u.alsoOn': 'Also on {brand}' })).toEqual([]);
  });

  it('reports each planted break', () => {
    expect(checkCopyText('anime', 'o1.ts', good.replace('Series', 'K-pop series')).join()).toMatch(/K-pop/);
    expect(checkCopyText('anime', 'o1.ts', good.replace('Series', 'KpopQuiz')).join()).toMatch(/K-pop/);
    expect(checkCopyText('kpop', 'b6.ts', good.replace('Series', `a${String.fromCharCode(0x2013)}b`)).join()).toMatch(/dash/);
    expect(checkCopyText('anime', 'o1.ts', good.replace('Series', 'Series \u{1F525}')).join()).toMatch(/emoji/);
    expect(checkCopyText('anime', 'O1.ts', good).join()).toMatch(/<lane>/);
    expect(checkCopyText('anime', 'f0.ts', good).join()).toMatch(/<lane>/);
    expect(checkCopyText('world', 'o1.ts', good).join()).toMatch(/unknown site/);
    expect(checkCopyText('anime', 'o1.ts', 'export default {};').join()).toMatch(/COPY/);
    expect(checkCopyObject({ 'Nav.series': 'x' }).join()).toMatch(/key/);
    expect(checkCopyObject({ nav: 'x' }).join()).toMatch(/key/);
    expect(checkCopyObject({ 'nav.series': 3 }).join()).toMatch(/not a string/);
  });

  it('every real copy file follows the rules', async () => {
    const root = `${SRC}copy/`;
    if (!existsSync(root)) return;
    for (const site of readdirSync(root)) {
      for (const file of readdirSync(`${root}${site}`)) {
        const path = `${root}${site}/${file}`;
        expect(checkCopyText(site, file, read(path)), `${site}/${file}`).toEqual([]);
        const mod = (await import(/* @vite-ignore */ path)) as { COPY?: unknown };
        expect(checkCopyObject(mod.COPY), `${site}/${file}`).toEqual([]);
      }
    }
  });
});

describe('flags, env and secrets (flags-env.md)', () => {
  const md = read(`${CONTRACTS}flags-env.md`);

  it('the flag table lists exactly O1_FLAGS, in order', () => {
    expect(tableNames(md, '## 3. Flags')).toEqual(O1_FLAGS.map((f) => f.name));
  });

  it('the untouched table lists exactly UNTOUCHED_FLAGS', () => {
    expect(tableNames(md, '### Untouched')).toEqual([...UNTOUCHED_FLAGS]);
  });

  it('the secret table lists exactly O1_SECRET_NAMES', () => {
    expect(tableNames(md, '## 5. Secret names')).toEqual([...O1_SECRET_NAMES]);
  });

  it('reserved flags are the P2 and P3a ones, and public flags carry the NEXT_PUBLIC_ prefix', () => {
    expect(O1_FLAGS.filter((f) => f.reserved).map((f) => f.name)).toEqual(['PASSPORT_CONTINUE', 'PASSPORT_SEED']);
    for (const f of O1_FLAGS) expect(f.name.startsWith('NEXT_PUBLIC_'), f.name).toBe(f.scope === 'public');
  });
});

describe('G0 defaults (defaults.md)', () => {
  const md = read(`${CONTRACTS}defaults.md`);
  const rows = [...md.matchAll(/^\| ([A-Z0-9]+-[A-Z0-9]+) \| (.+) \|$/gm)].map((m) => ({
    id: m[1]!, cells: m[2]!.split(' | '),
  }));

  it('lists the 21 decisions of the v2 plan and the 9 of the run plan', () => {
    expect(rows.filter((r) => r.id.startsWith('V2-')).map((r) => r.id)).toEqual(
      Array.from({ length: 21 }, (_, i) => `V2-${String(i + 1).padStart(2, '0')}`),
    );
    expect(rows.filter((r) => r.id.startsWith('RUN-')).map((r) => r.id)).toEqual(
      Array.from({ length: 9 }, (_, i) => `RUN-${i + 1}`),
    );
  });

  it('every row carries a status word', () => {
    expect(rows.length).toBeGreaterThan(30);
    for (const r of rows) {
      expect(r.cells.some((c) => /^(default, pending|accepted|confirmed \(G0, [0-9-]+\))$/.test(c.trim())), r.id).toBe(true);
    }
  });
});
