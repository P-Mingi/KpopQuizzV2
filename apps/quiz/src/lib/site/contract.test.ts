// Run O1 contract o1-contract-v1: the rules of docs/o1/contracts/ that code can check. Each
// checker is proven on planted good and bad inputs, then run on every real file it governs
// (per-site sheets and copy files that later lanes add), so a Wave 2 lane learns at once when a
// file breaks the contract. Grows in F0's later slices (naming traps, lanes); slice 3 adds schema.sql and manifest.md;
// slice 5 adds the logic of gen-contract-types.mts and check-contract.mts and the freshness of contract.types.ts;
// slice 6 adds rpcs.md, apis.md and the agreement of lib/{network,passport,anime}/types.ts with schema.sql;
// slice 8 adds the content formats (schemas/ and their validator), the fixtures and the link allowlist.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  formatOfFile, unknownKeywords, unresolvedRefs, validate, validateEntries,
} from '../../../scripts/o1/contract/json-schema';
import {
  BASE_PUBLIC_MARKER, BASE_ROWS_MARKER, PROD_COPY_RESET, baseParts, checkUnion, compareContract, compareContracts,
  contractFrom, formatDelta, functionsNamed, renderTypes, splitSections, stampOf, tsType,
} from '../../../scripts/o1/contract/lib';
import {
  ANIME_BANK_CATEGORIES, ANIME_QUESTION_KINDS, ANIME_SPOILER_STORE_KEY, MIN_PLAYABLE_THEMES, SPOILER_SCOPES,
  SPOILER_SHOW_ALL,
} from '../anime/types';
import { NET_BEACON_STEPS, NET_LINK_IDS, NET_STEPS, VIA_RE } from '../network/types';
import {
  B64U_16_RE, B64U_32_RE, CODE_HASH_RE, HANDOFF_OUTCOMES, JOINED_VIA, MAC_LABELS, MEMBER_FILTER_COLUMNS,
  MEMBER_PRIVATE_COLUMNS, MEMBER_PUBLIC_COLUMNS, MEMBERSHIP_PATCH_KEYS_ANY_SITE, MEMBERSHIP_PATCH_KEYS_NON_KPOP,
  PASSPORT_LIMITS, PASSPORT_SECONDS, PROFILE_FROM_MEMBERSHIP, TX_COOKIE_NAMES,
} from '../passport/types';
import { AXIS_KEYS } from '../personality/engine';
import { O1_FLAGS, O1_SECRET_NAMES, REGISTRY, UNTOUCHED_FLAGS } from './registry';
import { SITE_IDS, UX_NEW_TOKEN_NAMES, UX_TOKEN_NAMES } from './types';

import type { JsonSchema, SchemaRegistry } from '../../../scripts/o1/contract/json-schema';
import type { SpoilerScope } from '../anime/types';
import type { ContractAddedColumns, ContractTables, FnReturns } from '../db/contract.types';
import type { QuizType } from '../db/types';
import type { NetCrossover, NetSitesMenuMode, NetStep } from '../network/types';
import type {
  HandoffOutcome, JoinedVia, MyPassportRow, PassportPrefsPatch, PublicPassportRow,
} from '../passport/types';
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

/**
 * The token swaps a site sheet may write on a shared class (tokens.md 3.3 rule 6): the selector
 * after the site scope, and the one property it may set, always to a token.
 */
const TOKEN_SWAPS: readonly { readonly tail: string; readonly prop: string }[] = [
  { tail: '.p4-ans.is-no .p4-k', prop: 'color' },
  { tail: '.p6-ans.is-no .p6-k', prop: 'color' },
  { tail: '.ux-app :focus-visible', prop: 'outline-color' },
];

/**
 * The problems of one per-site sheet (tokens.md 3.3, rules 1 to 4 and 6). Empty when it follows
 * them. `file` is the sheet's name in styles/sites/<site>/: `tokens.css` holds token blocks and
 * token swaps only; `<lane>.css` also styles the lane's own block classes, `<site>-<lane>-*`.
 */
export function checkSiteSheet(site: SiteId, raw: string, file = 'tokens.css'): string[] {
  const problems: string[] = [];
  const lane = file.replace(/\.css$/, '');
  const blockPrefix = lane === 'tokens' ? null : `${site}-${lane}-`;
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

  // Rule 6: after the scope, a selector names only the lane's own block classes, or is one of the
  // token swaps; the bare scope (a token block) declares custom properties only.
  const checkTarget = (sel: string, body: string): void => {
    const p = scopes.find((x) => sel.startsWith(x))!;
    const tail = sel.slice(p.length).replace(/^:not\(\.light\)/, '').trim().replace(/\s+/g, ' ');
    const decls = body.split(';').map((d) => d.trim()).filter(Boolean);
    if (tail === '') {
      for (const d of decls) if (!d.startsWith('--')) problems.push(`token block "${sel}" sets ${d.split(':')[0]!.trim()}`);
      return;
    }
    const swap = TOKEN_SWAPS.find((t) => t.tail === tail);
    if (swap) {
      const ok = decls.length === 1 && new RegExp(`^${swap.prop}\\s*:\\s*var\\(--ux-[a-z0-9-]+\\)$`).test(decls[0]!);
      if (!ok) problems.push(`token swap "${tail}" may set only ${swap.prop} to one token`);
      return;
    }
    const classes = [...tail.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]!);
    if (!blockPrefix) {
      problems.push(`selector "${sel}" in ${file}: tokens.css holds token blocks and token swaps only`);
    } else if (classes.length === 0) {
      problems.push(`selector "${sel}" names no ${blockPrefix}* block class`);
    } else {
      for (const c of classes) if (!c.startsWith(blockPrefix)) problems.push(`selector "${sel}" targets the shared class .${c}`);
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
            else checkTarget(sel, body);
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

describe('per-site sheets (tokens.md 3.3, rules 1 to 4 and 6)', () => {
  const good = `/* anime tokens */
html.ux-v1[data-site="anime"] { --ux-page: #F4F5F7; --ux-on-accent: #FFFFFF; --anime-gap: 8px; }
html.ux-v1.dark[data-site="anime"] { --ux-page: #11131A; }
@media (prefers-color-scheme: dark) {
  html.ux-v1[data-site="anime"]:not(.light) { --ux-page: #11131A; }
}
html.ux-v1[data-site="anime"] .anime-o2-arcs, html.ux-v1[data-site="anime"] :is(.anime-o2-a, .anime-o2-b) > i { color: var(--ux-on-accent); }
@keyframes anime-pop { from { opacity: 0; } to { opacity: 1; } }
@supports (display: grid) { html.ux-v1[data-site="anime"] .anime-o2-facts { display: grid; } }
`;
  const goodTokens = `html.ux-v1[data-site="anime"] { --ux-page: #F4F5F7; --ux-on-accent: #FFFFFF; }
html.ux-v1.dark[data-site="anime"] { --ux-page: #11131A; }
@media (prefers-color-scheme: dark) { html.ux-v1[data-site="anime"]:not(.light) { --ux-page: #11131A; } }
html.ux-v1[data-site="anime"] .p4-ans.is-no .p4-k, html.ux-v1[data-site="anime"] .p6-ans.is-no .p6-k { color: var(--ux-on-no); }
html.ux-v1[data-site="anime"] .ux-app :focus-visible { outline-color: var(--ux-pink-fill); }
`;

  it('accepts a sheet that follows the rules', () => {
    expect(checkSiteSheet('anime', good, 'o2.css')).toEqual([]);
    expect(checkSiteSheet('anime', goodTokens, 'tokens.css')).toEqual([]);
  });

  it('rule 6: refuses a sheet that restyles or re-lays-out the shared kit (R audit attack 4)', () => {
    const fork = [
      'html.ux-v1[data-site="anime"] .ux-panel { display: grid; grid-template-columns: 1fr 1fr; padding: 40px; border-radius: 0; }',
      'html.ux-v1[data-site="anime"] .p3-h1 { font-size: 64px; text-align: center; }',
      'html.ux-v1[data-site="anime"] .ux-tabbar { flex-direction: column; }',
      'html.ux-v1[data-site="anime"] .p1-home > * { order: -1; }',
      'html.ux-v1[data-site="anime"] .ux-btn-primary { background: var(--ux-accent2); }',
      'html.ux-v1[data-site="anime"] .ux-sec:nth-of-type(3) { display: none; }',
    ];
    for (const rule of fork) {
      expect(checkSiteSheet('anime', rule, 'o1.css').join('; '), rule).toMatch(/shared class/);
      expect(checkSiteSheet('anime', rule, 'tokens.css').join('; '), rule).toMatch(/token blocks and token swaps only/);
    }
    const others: [string, string, RegExp][] = [
      ['html.ux-v1[data-site="anime"] h1 { color: red; }', 'o1.css', /names no anime-o1-\* block class/],
      ['html.ux-v1[data-site="anime"] .anime-o3-x { color: red; }', 'o2.css', /shared class \.anime-o3-x/],
      ['html.ux-v1[data-site="anime"] .anime-o2-x .ux-panel { color: red; }', 'o2.css', /shared class \.ux-panel/],
      ['html.ux-v1[data-site="anime"] { color: red; }', 'tokens.css', /token block .* sets color/],
      ['html.ux-v1[data-site="anime"] .p4-ans.is-no .p4-k { color: red; }', 'tokens.css', /token swap/],
      ['html.ux-v1[data-site="anime"] .p4-ans.is-no .p4-k { color: var(--ux-on-no); font-size: 2px; }', 'o1.css', /token swap/],
      ['html.ux-v1[data-site="anime"] .ux-app :focus-visible { outline: 4px solid var(--ux-pink); }', 'tokens.css', /token swap/],
    ];
    for (const [css, f, re] of others) expect(checkSiteSheet('anime', css, f).join('; '), css).toMatch(re);
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
      for (const f of listCss(dir)) expect(checkSiteSheet(site, read(`${dir}${f}`), f), `${site}/${f}`).toEqual([]);
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

  // G0 was answered on 2026-10-16 (LEDGER D-021): every default is confirmed, so the pending
  // status word of slices 2 to 4 no longer passes (stricter than before, never looser).
  it('every row carries a status word: confirmed by the owner (G0) or accepted before G0', () => {
    expect(rows.length).toBeGreaterThan(30);
    for (const r of rows) {
      expect(r.cells.some((c) => /^(accepted|confirmed by the owner \(G0, 2026-10-16\))$/.test(c.trim())), r.id).toBe(true);
      expect(r.cells.some((c) => /^default, pending$/.test(c.trim())), r.id).toBe(false);
    }
  });

  it('no contract file still marks a G0 default as pending', () => {
    const offenders = readdirSync(CONTRACTS)
      .filter((f) => f.endsWith('.md') || f.endsWith('.sql') || f.endsWith('.json'))
      .filter((f) => /default, pending|G0 default\b/.test(read(`${CONTRACTS}${f}`)));
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// schema.sql and manifest.md (F0 slice 3)

export interface ManifestRow {
  n: number;
  file: string;
  id: string;
  rollback: string;
  owner: string;
  rows: number[];
  tx: string;
  phase: string;
  needs: string[];
}

const MANIFEST_DIR = 'docs/pending-migrations/multisite/';
const MANIFEST_PHASES = new Set(['pre', 'pre-T14', 'pre-T14 (window)', 'pre-after-V0', 'pre-after-V0 (dormant)', 'launch', 'launch (last)']);
const MANIFEST_EXTERNAL = new Set(['Mission U deletion file']);
/** BACKLOG 4.1 rows that have no SQL file (manifest.md 4). */
const ROWS_WITHOUT_FILE = [19, 31, 32, 33];

/** Rows of the table of manifest.md section 1. */
export function parseManifest(md: string): ManifestRow[] {
  const out: ManifestRow[] = [];
  for (const m of md.matchAll(/^\| (\d+) \| `([^`]+)` \| `([^`]+)` \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm)) {
    const file = m[2]!;
    const base = file.split('/').pop()!.replace(/\.sql$/, '');
    out.push({
      n: Number(m[1]),
      file,
      id: base.split('-')[0]!,
      rollback: m[3]!,
      owner: m[4]!.trim(),
      rows: [...m[5]!.matchAll(/\b(\d{1,2})\b/g)].map((r) => Number(r[1])),
      tx: m[6]!.trim(),
      phase: m[7]!.trim(),
      needs: m[8]!.trim() === 'none' ? [] : m[8]!.split(',').map((s) => s.trim()),
    });
  }
  return out;
}

/** The problems of the manifest rows (names, rollbacks, modes, phases, prerequisites). */
export function checkManifest(rows: ManifestRow[]): string[] {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  rows.forEach((r, i) => {
    if (r.n !== i + 1) problems.push(`row ${r.n} out of sequence`);
    const launch = r.file.startsWith(`${MANIFEST_DIR}launch/`);
    const re = launch
      ? /^docs\/pending-migrations\/multisite\/launch\/L\d{2}-[A-Z][A-Z0-9]*-[a-z0-9-]+\.sql$/
      : /^docs\/pending-migrations\/multisite\/\d{3}[a-z]?-[a-z0-9-]+\.sql$/;
    if (!re.test(r.file)) problems.push(`${r.file}: name does not follow manifest.md`);
    if (r.rollback !== r.file.replace(/\.sql$/, '.rollback.sql')) problems.push(`${r.file}: rollback ${r.rollback}`);
    if (r.tx !== 'single' && r.tx !== 'none') problems.push(`${r.file}: tx ${r.tx}`);
    if (!MANIFEST_PHASES.has(r.phase)) problems.push(`${r.file}: phase ${r.phase}`);
    if (launch !== r.phase.startsWith('launch')) problems.push(`${r.file}: launch folder and phase disagree`);
    if (seen.has(r.id)) problems.push(`${r.file}: id ${r.id} used twice`);
    for (const need of r.needs) {
      if (MANIFEST_EXTERNAL.has(need)) continue;
      const range = /^L(\d{2}) to L(\d{2})$/.exec(need);
      const ids = range
        ? Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, k) => `L${String(Number(range[1]) + k).padStart(2, '0')}`)
        : [need];
      for (const id of ids) if (!seen.has(id)) problems.push(`${r.file}: needs ${id}, which is not listed above it`);
    }
    seen.set(r.id, r.n);
  });
  return problems;
}

/** The `-- @file <name>` sections of schema.sql, in order. */
export function schemaSections(sql: string): { name: string; body: string }[] {
  const parts = sql.split(/^-- @file (\S+)$/m);
  const out: { name: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) out.push({ name: parts[i]!, body: parts[i + 1]! });
  return out;
}

/** naming.md traps, assembled from fragments so this file never spells one. */
const NAMING_TRAPS = new RegExp([
  `\\bW${'orld'}`, `BRI${'DGE'}_`, ['show', 'on', 'other', 'worlds'].join('_'), ['site', 'preferences'].join('_'),
  ['network', 'settings'].join('_'),
].join('|'));

/** Functions that 008 and 010 replace in place (today's ACL kept, BACKLOG 5.3). */
const REPLACED_FUNCTIONS = [
  'award_xp', 'record_play', 'handle_new_quiz', 'increment_like_count', 'decrement_like_count', 'notify_badge_earned',
  'notify_group_quiz_alerts', 'cast_duel_vote', 'passport_on_battle_result', 'record_bt_play', 'ensure_daily_quiz',
];

/** The problems of schema.sql against its own conventions (header of schema.sql, naming.md). */
export function checkSchema(sql: string): string[] {
  const problems: string[] = [];
  if (DASHES.test(sql)) problems.push('dash character');
  if (EMOJI.test(sql)) problems.push('emoji');
  if (NAMING_TRAPS.test(sql)) problems.push('naming trap');
  if (/^\s*(begin|commit|rollback)\s*;/im.test(sql)) problems.push('transaction statement (the loader owns the transaction)');
  const code = sql.replace(/--[^\n]*/g, '');
  for (const m of code.matchAll(/create table ((?:public|passport)\.[a-z_]+)/g)) {
    if (!code.includes(`alter table ${m[1]} enable row level security;`)) problems.push(`${m[1]}: RLS not enabled`);
  }
  for (const m of code.matchAll(/create (or replace )?function public\.([a-z0-9_]+)\(([^)]*)\)/g)) {
    const name = m[2]!;
    if (m[1]) {
      if (!REPLACED_FUNCTIONS.includes(name)) problems.push(`${name}: create or replace of a function the contract does not replace`);
      continue;
    }
    if (!new RegExp(`revoke (all|execute) on function public\\.${name}\\(`).test(code)) problems.push(`${name}: no revoke`);
  }
  for (const m of code.matchAll(/security definer(?! set search_path = public)/g)) {
    const before = code.slice(0, m.index);
    const fn = /function public\.([a-z0-9_]+)\([^]*$/.exec(before.slice(before.lastIndexOf('function public.')))?.[1];
    if (fn && !REPLACED_FUNCTIONS.includes(fn) && fn !== 'merge_anon_passport') problems.push(`${fn}: security definer without search_path`);
  }
  const lines = sql.split('\n');
  lines.forEach((line, i) => {
    if (!line.startsWith('create policy ')) return;
    let j = i - 1;
    while (j >= 0 && (lines[j]!.startsWith('create policy ') || /^\s/.test(lines[j]!))) j--;
    let intent = false;
    while (j >= 0 && lines[j]!.startsWith('-- ')) intent ||= lines[j--]!.startsWith('-- policy: ');
    if (!intent) problems.push(`policy without intent: ${line.slice(14, 60)}`);
  });
  return problems;
}

describe('SQL manifest (manifest.md)', () => {
  const md = read(`${CONTRACTS}manifest.md`);
  const rows = parseManifest(md);

  it('accepts a manifest that follows the rules', () => {
    const good = parseManifest([
      '| 1 | `docs/pending-migrations/multisite/001-sites.sql` | `docs/pending-migrations/multisite/001-sites.rollback.sql` | B2 | 1 | single | pre | none | R-SQL |',
      '| 2 | `docs/pending-migrations/multisite/launch/L01-B2-sites.sql` | `docs/pending-migrations/multisite/launch/L01-B2-sites.rollback.sql` | B2 | 1 | single | launch | 001 | R-SQL |',
    ].join('\n'));
    expect(good).toHaveLength(2);
    expect(checkManifest(good)).toEqual([]);
  });

  it('reports each planted break', () => {
    const bad = parseManifest([
      '| 1 | `docs/pending-migrations/multisite/001-sites.sql` | `docs/pending-migrations/multisite/001-sites.down.sql` | B2 | 1 | maybe | soon | 002a | R-SQL |',
      '| 3 | `docs/pending-migrations/multisite/Sites.sql` | `docs/pending-migrations/multisite/Sites.rollback.sql` | B2 | 1 | single | launch | none | R-SQL |',
    ].join('\n'));
    const p = checkManifest(bad);
    expect(p.some((x) => x.includes('rollback'))).toBe(true);
    expect(p.some((x) => x.includes('tx maybe'))).toBe(true);
    expect(p.some((x) => x.includes('phase soon'))).toBe(true);
    expect(p.some((x) => x.includes('needs 002a'))).toBe(true);
    expect(p.some((x) => x.includes('out of sequence'))).toBe(true);
    expect(p.some((x) => x.includes('name does not follow'))).toBe(true);
    expect(p.some((x) => x.includes('launch folder and phase disagree'))).toBe(true);
  });

  it('the real manifest follows the rules and every path is in section 1', () => {
    expect(rows.length).toBe(31);
    expect(checkManifest(rows)).toEqual([]);
    // migrate-dev.sh reads every path of the document in order: section 1 must be the first place each appears.
    const all = [...md.matchAll(/docs\/pending-migrations\/multisite\/[A-Za-z0-9_./-]+\.sql/g)].map((m) => m[0]);
    const first = all.filter((p, i) => all.indexOf(p) === i && !p.endsWith('.rollback.sql'));
    expect(first).toEqual(rows.map((r) => r.file));
  });

  it('accounts for every row of BACKLOG 4.1 (1 to 40)', () => {
    const covered = new Set([...rows.flatMap((r) => r.rows), ...ROWS_WITHOUT_FILE]);
    expect([...covered].filter((n) => n >= 1 && n <= 40).sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    for (const n of ROWS_WITHOUT_FILE) expect(md, `row ${n}`).toMatch(new RegExp(`^\\| ${n} \\|`, 'm'));
  });

  it('modes none are the files with CONCURRENTLY or VALIDATE (002b, 002c, 009)', () => {
    expect(rows.filter((r) => r.tx === 'none').map((r) => r.id)).toEqual(['002b', '002c', '009']);
  });
});

describe('schema.sql', () => {
  const sql = read(`${CONTRACTS}schema.sql`);
  const sections = schemaSections(sql);
  const rows = parseManifest(read(`${CONTRACTS}manifest.md`));

  it('accepts a section that follows the conventions', () => {
    const good = [
      'create table public.t (id int);',
      'alter table public.t enable row level security;',
      '-- policy: everyone reads.',
      'create policy t_read on public.t for select using (true);',
      'create function public.f() returns void language plpgsql security definer set search_path = public as $$ begin end $$;',
      'revoke all on function public.f() from public, anon, authenticated;',
    ].join('\n');
    expect(checkSchema(good)).toEqual([]);
  });

  it('reports each planted break', () => {
    const bad = [
      'begin;',
      'create table public.t (id int);',
      'create policy t_read on public.t for select using (true);',
      'create function public.f() returns void language plpgsql security definer as $$ begin end $$;',
      'create or replace function public.g() returns void language sql as $$ select 1 $$;',
      `create table public.${['site', 'preferences'].join('_')} (id int);`,
    ].join('\n');
    const p = checkSchema(bad);
    expect(p).toContain('transaction statement (the loader owns the transaction)');
    expect(p).toContain('public.t: RLS not enabled');
    expect(p).toContain('f: no revoke');
    expect(p).toContain('f: security definer without search_path');
    expect(p).toContain('g: create or replace of a function the contract does not replace');
    expect(p).toContain('naming trap');
    expect(p.some((x) => x.startsWith('policy without intent'))).toBe(true);
  });

  it('the real schema.sql follows its conventions', () => {
    expect(checkSchema(sql)).toEqual([]);
  });

  it('has one section per manifest file that declares objects, in manifest order', () => {
    const declaring = rows.filter((r) => !r.file.includes('/launch/') || r.id === 'L01');
    expect(sections.map((s) => s.name)).toEqual(declaring.map((r) => r.file.split('/').pop()!.replace(/\.sql$/, '')));
  });

  it('replaces exactly the locked functions, and merge_anon_passport by drop and create', () => {
    const replaced = [...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map((m) => m[1]);
    expect([...new Set(replaced)].sort()).toEqual([...REPLACED_FUNCTIONS].sort());
    expect(sql).toMatch(/^drop function public\.merge_anon_passport\(uuid, integer, integer, integer, integer, jsonb\);$/m);
    expect(sql).toMatch(/merge_anon_passport\([^)]*p_site text default 'kpop'\)/);
  });

  it('the sites rows mirror the registry (id, domain, brand, kind) and use only SiteId values', () => {
    const vals = [...sql.matchAll(/\('([a-z]+)', +'([a-z.]+)', +'([A-Za-z]+)', +'(world|hub)', +'(building|live)', (\d)\)/g)];
    expect(vals.map((v) => v[1])).toEqual([...SITE_IDS]);
    for (const v of vals) {
      const r = REGISTRY[v[1] as SiteId];
      expect([v[2], v[3], v[4]]).toEqual([r.domain, r.brand.name, r.kind]);
    }
    expect(vals.map((v) => Number(v[6]))).toEqual([1, 2, 3]);
  });

  it('every scoped table gets site_id text not null default kpop with its <table>_site_id_fkey', () => {
    const adds = [...sql.matchAll(/^alter table public\.([a-z_]+) +add column site_id (.+)$/gm)];
    expect(adds.length).toBe(24);
    for (const a of adds) {
      expect(a[2]).toBe(`text not null default 'kpop' constraint ${a[1]}_site_id_fkey references public.sites(id);`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Twins (TWINS.md and twins.json, rule 18): the table and the JSON agree, every path exists, every
// code is closed and fits the row's site, and every mustImport is what the twin really imports.

interface TwinRow {
  readonly id: string;
  readonly site: SiteId;
  readonly route: string;
  readonly file: string | null;
  readonly twin: string | null;
  readonly mustImport: readonly string[];
  readonly renders: readonly string[];
  readonly allowed: readonly string[];
  readonly owner: string;
  readonly body: string;
  readonly notes: string;
}

interface TwinsDoc {
  readonly version: string;
  readonly differenceCodes: Readonly<Record<string, { readonly sites: readonly SiteId[]; readonly text: string }>>;
  readonly pages: readonly TwinRow[];
}

/** One table row of TWINS.md, as its cells (an escaped `\|` stays inside a cell). */
type TwinCells = { readonly site: SiteId; readonly cells: readonly string[] };

/** The rows of the TWINS.md tables: section 3 is anime, section 4 is hub. */
export function twinsTableRows(md: string): TwinCells[] {
  const out: TwinCells[] = [];
  let site: SiteId | null = null;
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) site = line.startsWith('## 3. ') ? 'anime' : line.startsWith('## 4. ') ? 'hub' : null;
    if (!site || !line.startsWith('| ') || line.startsWith('| id |') || line.startsWith('|---')) continue;
    const cells = line.slice(2, -2).split(/ (?<!\\)\| /).map((c) => c.replace(/\\\|/g, '|'));
    out.push({ site, cells });
  }
  return out;
}

const unpath = (cell: string): string | null => (cell === '(none)' ? null : `apps/quiz/src/${cell.replace(/^`|`$/g, '')}`);
const unlist = (cell: string): string[] =>
  cell === '(none)' ? [] : cell.split(', ').map((s) => s.replace(/^`|`$/g, ''));

/** The problems between the TWINS.md table and twins.json (same rows, same order, same cells). */
export function compareTwins(md: string, doc: TwinsDoc): string[] {
  const problems: string[] = [];
  const table = twinsTableRows(md);
  if (table.length !== doc.pages.length) problems.push(`table has ${table.length} rows, twins.json ${doc.pages.length}`);
  table.forEach((t, i) => {
    const r = doc.pages[i];
    if (!r) return;
    const c = t.cells;
    if (c.length !== 10) { problems.push(`row ${c[0]}: ${c.length} cells`); return; }
    const same: [string, unknown, unknown][] = [
      ['site', t.site, r.site], ['id', c[0], r.id], ['route', c[1], r.route], ['file', unpath(c[2]!), r.file],
      ['twin', unpath(c[3]!), r.twin], ['mustImport', unlist(c[4]!), r.mustImport], ['renders', c[5], r.renders.join(', ')],
      ['allowed', c[6] === 'none' ? [] : c[6]!.split(' '), r.allowed], ['owner', c[7], r.owner], ['body', c[8], r.body],
      ['notes', c[9], r.notes],
    ];
    for (const [name, a, b] of same) {
      if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(`row ${r.id}: ${name} differs (table ${JSON.stringify(a)}, json ${JSON.stringify(b)})`);
    }
  });
  return problems;
}

/** Module specifiers a file imports, static and dynamic; relative ones resolved to the `@/` form. */
export function importsOf(text: string, fileUnderSrc: string): string[] {
  const dir = fileUnderSrc.split('/').slice(0, -1);
  const specs = [
    ...[...text.matchAll(/^import\s+(?!type\s)[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]!),
    ...[...text.matchAll(/import\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]!),
  ];
  return specs.map((s) => {
    if (!s.startsWith('.')) return s;
    const parts = [...dir];
    for (const seg of s.split('/')) {
      if (seg === '..') parts.pop();
      else if (seg !== '.') parts.push(seg);
    }
    return `@/${parts.join('/')}`;
  });
}

/** The problems of twins.json on its own; `fileText(repoPath)` is null for a missing file. */
export function checkTwins(doc: TwinsDoc, fileText: (repoPath: string) => string | null, folderFiles: (repoDir: string) => string[]): string[] {
  const problems: string[] = [];
  if (doc.version !== 'o1-contract-v1') problems.push(`version ${doc.version}`);
  const ids = new Set<string>();
  const resolve = (spec: string): string | null => {
    if (!spec.startsWith('@/')) return null;
    for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
      const p = `apps/quiz/src/${spec.slice(2)}${ext}`;
      if (fileText(p) !== null) return p;
    }
    return null;
  };
  for (const r of doc.pages) {
    if (ids.has(r.id)) problems.push(`duplicate id ${r.id}`);
    ids.add(r.id);
    if (!(SITE_IDS as readonly string[]).includes(r.site) || r.site === 'kpop') problems.push(`row ${r.id}: site ${r.site}`);
    if (!['shared', 'local', 'none'].includes(r.body)) problems.push(`row ${r.id}: body ${r.body}`);
    if (r.file !== null && !r.file.startsWith('apps/quiz/src/app/sites/[site]/')) problems.push(`row ${r.id}: file outside app/sites/[site]`);
    if (r.file === null && r.body !== 'none') problems.push(`row ${r.id}: a screen without a file`);
    if (r.body === 'none' && r.mustImport.length > 0) problems.push(`row ${r.id}: no screen but a mustImport`);
    for (const code of r.allowed) {
      const def = doc.differenceCodes[code];
      if (!def) problems.push(`row ${r.id}: unknown code ${code}`);
      else if (!def.sites.includes(r.site)) problems.push(`row ${r.id}: code ${code} is not a ${r.site} code`);
    }
    if (r.twin === null) {
      if (r.body !== 'none') problems.push(`row ${r.id}: a screen without a twin`);
      continue;
    }
    if (r.twin.includes('/app/sites/')) problems.push(`row ${r.id}: the twin is a site page`);
    if (fileText(r.twin) === null) { problems.push(`row ${r.id}: twin ${r.twin} does not exist`); continue; }
    const dir = r.twin.split('/').slice(0, -1).join('/');
    const imported = new Set<string>();
    for (const f of folderFiles(dir)) {
      const text = fileText(`${dir}/${f}`);
      if (text !== null) for (const s of importsOf(text, `${dir}/${f}`.replace(/^apps\/quiz\/src\//, ''))) imported.add(s);
    }
    for (const spec of r.mustImport) {
      if (resolve(spec) === null) problems.push(`row ${r.id}: ${spec} does not resolve`);
      if (!imported.has(spec)) problems.push(`row ${r.id}: the twin does not import ${spec}`);
    }
  }
  return problems;
}

describe('twins (TWINS.md, twins.json, rule 18)', () => {
  const md = read(`${CONTRACTS}TWINS.md`);
  const doc = JSON.parse(read(`${CONTRACTS}twins.json`)) as TwinsDoc;
  const fileText = (p: string): string | null => (existsSync(`${REPO}${p}`) ? read(`${REPO}${p}`) : null);
  const folderFiles = (d: string): string[] =>
    existsSync(`${REPO}${d}`) ? readdirSync(`${REPO}${d}`).filter((f) => /\.tsx?$/.test(f)) : [];

  it('the table and twins.json say the same thing, row by row', () => {
    expect(compareTwins(md, doc)).toEqual([]);
  });

  it('every path exists, every code is closed and fits its site, every mustImport is imported by the twin', () => {
    expect(checkTwins(doc, fileText, folderFiles)).toEqual([]);
  });

  it('covers the draft: rows 1 to 37 and H-0 to H-8, each with a closed list', () => {
    const base = new Set(doc.pages.map((r) => r.id.replace(/[a-d]$/, '')));
    for (let i = 1; i <= 37; i++) expect(base.has(String(i)), `row ${i}`).toBe(true);
    for (let i = 0; i <= 8; i++) expect(base.has(`H-${i}`), `row H-${i}`).toBe(true);
    for (const r of doc.pages) expect(Array.isArray(r.allowed), r.id).toBe(true);
    expect(Object.keys(doc.differenceCodes).sort()).toEqual(
      ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'B', 'Bf', 'C', 'F', 'H1', 'H2', 'H3', 'H4', 'N', 'T', 'Tn', 'V'].sort(),
    );
  });

  it('every anime route pattern of the registry is the route of a row (no screen without a twin)', () => {
    const allow = REGISTRY.anime.routes.allow;
    expect(Array.isArray(allow)).toBe(true);
    const routes = doc.pages.filter((r) => r.site === 'anime').map((r) => r.route).join(' ');
    for (const p of allow as readonly string[]) {
      const head = p.replace(/\/\*\*$/, '');
      expect(routes.includes(head), p).toBe(true);
    }
  });

  it('reports each planted break', () => {
    const one = (patch: Partial<TwinRow>): TwinsDoc => ({ ...doc, pages: [{ ...doc.pages[0]!, ...patch }] });
    const planted: [TwinsDoc, RegExp][] = [
      [one({ allowed: ['T', 'X9'] }), /unknown code X9/],
      [one({ allowed: ['H3'] }), /not a anime code/],
      [one({ twin: 'apps/quiz/src/app/(site)/nope/page.tsx' }), /does not exist/],
      [one({ mustImport: ['@/components/ux-v1/panel'] }), /does not import @\/components\/ux-v1\/panel/],
      [one({ mustImport: ['@/components/ux-v1/no-such'] }), /does not resolve/],
      [one({ file: 'apps/quiz/src/app/(site)/page.tsx' }), /outside app\/sites/],
      [one({ body: 'none' }), /no screen but a mustImport/],
      [{ ...doc, pages: [doc.pages[0]!, doc.pages[0]!] }, /duplicate id/],
    ];
    for (const [d, re] of planted) expect(checkTwins(d, fileText, folderFiles).join('; ')).toMatch(re);
    const edited = md.replace('| 1 | / |', '| 1 | /home |');
    expect(compareTwins(edited, doc).join('; ')).toMatch(/row 1: route differs/);
    expect(compareTwins(md, { ...doc, pages: doc.pages.slice(1) }).join('; ')).toMatch(/rows/);
  });

  it('importsOf resolves relative, dynamic and skips type-only imports', () => {
    const text = "import { A } from './ux-page';\nimport type { B } from '@/x/b';\nconst m = import('@/components/c');\nimport D from '../d';\n";
    expect(importsOf(text, 'app/(site)/q/[slug]/page.tsx')).toEqual(['@/app/(site)/q/[slug]/ux-page', '@/app/(site)/q/d', '@/components/c']);
  });
});

// ---------------------------------------------------------------------------------------------
// The contract database tools (F0 slice 5): scripts/o1/contract/lib.ts, lib/db/contract.types.ts.
// The Postgres runs themselves (a database built from schema.sql gives zero diffs, every planted
// difference is reported) are `check-contract.mts --self-test`, run by the gate; these tests prove
// the logic on synthetic catalogs and keep the generated file in step with schema.sql.

type Snap = Record<string, { v: Record<string, unknown>; m: Record<string, unknown> | null }>;

describe('contract database tools (scripts/o1/contract/lib.ts)', () => {
  const col = (type: string, notNull: boolean, def: string | null = null, ord = 1) => ({
    v: { type, notNull, default: def, identity: '', generated: '' }, m: { ord, typeName: type },
  });
  const fn = (security: string, acl: string[], params: unknown[] = [], retType = 'integer', nDefaults = 0) => ({
    v: { kind: 'f', args: '', result: retType, security, config: ['search_path=public'], acl },
    m: { name: 'f', retType, retSet: false, nDefaults, params },
  });
  const base: Snap = {
    'rel:public.t': { v: { kind: 'r', rls: false, forceRls: false, options: [], acl: [] }, m: null },
    'col:public.t.id': col('integer', true),
    'con:public.t.t_old_key': { v: { type: 'u', def: 'UNIQUE (id)' }, m: null },
    'fn:public.f()': fn('definer', ['service_role:EXECUTE']),
  };
  const s1: Snap = {
    ...base,
    'rel:public.n': { v: { kind: 'r', rls: true, forceRls: false, options: [], acl: [] }, m: null },
    'col:public.n.id': col('bigint', true, "nextval('n_id_seq'::regclass)", 1),
    'col:public.n.kind': col('text', true, null, 2),
    'con:public.n.n_kind_check': { v: { type: 'c', def: "CHECK ((kind = ANY (ARRAY['a'::text, 'b'::text])))" }, m: null },
    'col:public.t.site_id': col('text', true, "'kpop'::text", 2),
  };
  const { 'con:public.t.t_old_key': _dropped, ...s2 } = s1;
  const sections = [
    { file: '001-a', sql: 'create table public.n (id bigserial, kind text);\nalter table public.t add column site_id text;' },
    { file: '002-b', sql: 'create or replace function public.f() returns integer as $$ select 1 $$ language sql;\nalter table public.t drop constraint t_old_key;' },
  ];
  const contract = contractFrom([base, s1, s2], sections);

  it('splits schema.sql into its @file sections, the header with the first', () => {
    const sql = read(`${CONTRACTS}schema.sql`);
    const secs = splitSections(sql);
    expect(secs.map((x) => x.file)).toEqual(schemaSections(sql).map((x) => x.name));
    expect(secs[0]!.sql.startsWith('-- Run O1 contract')).toBe(true);
    expect(secs.map((x) => x.sql).join('\n')).toBe(sql);
    expect(() => splitSections('select 1;')).toThrow(/no "-- @file" marker/);
  });

  it('names the functions a section creates or replaces', () => {
    expect(functionsNamed('create function public.a(x int)\n  create or replace function passport.b ()\ncreate table public.c (')).toEqual(['public.a', 'passport.b']);
  });

  it('builds the contract from consecutive catalogs: owner section, new or existing, dropped objects', () => {
    const byKey = new Map(contract.items.map((i) => [i.key, i]));
    expect(byKey.get('rel:public.n')).toMatchObject({ file: '001-a', isNew: true });
    expect(byKey.get('col:public.t.site_id')).toMatchObject({ file: '001-a', isNew: true });
    expect(byKey.get('fn:public.f()')).toMatchObject({ file: '002-b', isNew: false });
    expect(byKey.get('con:public.t.t_old_key')).toMatchObject({ file: '002-b', v: null });
    expect(byKey.has('col:public.t.id')).toBe(false);
    expect(byKey.has('rel:public.t')).toBe(false);
  });

  it('reports zero diffs on an equal catalog and each planted difference', () => {
    expect(compareContract(contract, s2).diffs).toEqual([]);
    const planted: [Snap, string, string, string?][] = [
      [{ ...s2, 'col:public.n.kind': col('character varying', true, null, 2) }, 'col:public.n.kind', 'changed', 'type'],
      [{ ...s2, 'col:public.n.kind': col('text', false, null, 2) }, 'col:public.n.kind', 'changed', 'notNull'],
      [{ ...s2, 'col:public.t.site_id': col('text', true, "'anime'::text", 2) }, 'col:public.t.site_id', 'changed', 'default'],
      [{ ...s2, 'fn:public.f()': fn('invoker', ['service_role:EXECUTE']) }, 'fn:public.f()', 'changed', 'security'],
      [{ ...s2, 'fn:public.f()': fn('definer', ['anon:EXECUTE', 'service_role:EXECUTE']) }, 'fn:public.f()', 'changed', 'acl'],
      [{ ...s1 }, 'con:public.t.t_old_key', 'present'],
      [(({ 'rel:public.n': _r, ...rest }) => rest)(s2), 'rel:public.n', 'missing'],
    ];
    for (const [snap, key, kind, field] of planted) {
      const diffs = compareContract(contract, snap).diffs;
      expect(diffs.some((d) => d.key === key && d.kind === kind && (field === undefined || d.field === field)), `${key} ${kind} ${field ?? ''}`).toBe(true);
    }
  });

  it('applied-only skips a section none of whose new objects exist, never a partial one', () => {
    const none = compareContract(contract, base, true);
    expect(none.notApplied).toEqual(['001-a']);
    expect(none.diffs.map((d) => `${d.kind} ${d.key}`)).toEqual(['present con:public.t.t_old_key']);
    const partial = (({ 'col:public.n.kind': _k, ...rest }) => rest)(s2);
    const c = compareContract(contract, partial, true);
    expect(c.notApplied).toEqual([]);
    expect(c.diffs.map((d) => `${d.kind} ${d.key}`)).toEqual(['missing col:public.n.kind']);
  });

  it('reads literal unions from text checks and maps Postgres types', () => {
    expect(checkUnion("CHECK ((kind = ANY (ARRAY['world'::text, 'hub'::text])))")).toEqual({ column: 'kind', values: ['world', 'hub'] });
    expect(checkUnion("CHECK ((id ~ '^[a-z]{2,12}$'::text))")).toBeNull();
    expect(checkUnion("CHECK (((kind = ANY (ARRAY['a'::text])) OR (x IS NULL)))")).toBeNull();
    expect(tsType('timestamp with time zone')).toBe('string');
    expect(tsType('character varying(40)')).toBe('string');
    expect(tsType('smallint')).toBe('number');
    expect(tsType('jsonb')).toBe('Json');
    expect(tsType('text[]')).toBe('string[]');
    expect(tsType('mood', { 'public.mood': ['up', 'down'] })).toBe("'up' | 'down'");
    expect(() => tsType('tsrange')).toThrow(/no TypeScript type/);
  });

  it('renders Supabase-shaped maps keyed by the SQL names', () => {
    const text = renderTypes({ contract, snapshot: s2, header: ['schema.sql sha256 0123456789abcdef'] });
    expect(stampOf(text)).toBe('0123456789abcdef');
    expect(text).toContain("  'public.n': {\n    Row: {\n      id: number;\n      kind: 'a' | 'b';\n    };\n    Insert: {\n      id?: number;\n      kind: 'a' | 'b';");
    expect(text).toContain("  'public.t': {\n    site_id: string;\n  };");
    expect(text).toContain('  f: {\n    Args: Record<string, never>;\n    Returns: number | null;');
    expect(text).toContain("export type TableRow<K extends keyof ContractTables> = ContractTables[K]['Row'];");
  });

  it('splits schema.base.sql into the platform part, the public stand-ins and the rows (--prod-copy, G3)', () => {
    const sql = read(`${CONTRACTS}schema.base.sql`);
    const parts = baseParts(sql);
    expect(parts.platform + parts.publicStandIn + parts.rows).toBe(sql);
    expect(parts.publicStandIn.startsWith(BASE_PUBLIC_MARKER)).toBe(true);
    expect(parts.rows.startsWith(BASE_ROWS_MARKER)).toBe(true);
    expect(parts.platform).toContain('create table if not exists auth.users');
    expect(parts.platform).not.toMatch(/create (table|function) public\./);
    expect(parts.rows).not.toMatch(/create (table|function)/);
    expect(() => baseParts(sql.replace(BASE_ROWS_MARKER, '-- rows'))).toThrow(/markers/);
    expect(() => baseParts(`${BASE_ROWS_MARKER}\n${BASE_PUBLIC_MARKER}\n`)).toThrow(/markers/);
    expect(PROD_COPY_RESET).toMatch(/reset check_function_bodies;\nreset search_path;/);
  });

  it('compares two contracts object by object: only in one, another section, novelty or value', () => {
    const other = contractFrom([base, s1, s2], sections);
    expect(compareContracts(contract, other)).toEqual([]);
    const items = contract.items.map((i) => (i.key === 'fn:public.f()' ? { ...i, v: { ...i.v!, acl: ['PUBLIC:EXECUTE', 'service_role:EXECUTE'] } } : i));
    const moved = items.map((i) => (i.key === 'rel:public.n' ? { ...i, isNew: false } : i)).filter((i) => i.key !== 'col:public.n.kind');
    const deltas = compareContracts(contract, { items: moved, files: contract.files });
    expect(deltas.map((d) => `${d.kind} ${d.key}`)).toEqual(['onlyA col:public.n.kind', 'differs fn:public.f()', 'differs rel:public.n']);
    const text = deltas.map((d) => formatDelta(d, ['stand-in', 'prod-copy']));
    expect(text[1]).toBe('differs  fn:public.f()  acl: stand-in ["service_role:EXECUTE"], prod-copy ["PUBLIC:EXECUTE","service_role:EXECUTE"]');
    expect(text[2]).toBe('differs  rel:public.n  isNew: stand-in true, prod-copy false');
    expect(compareContracts({ items: [], files: [] }, contract).every((d) => d.kind === 'onlyB')).toBe(true);
  });
});

describe('lib/db/contract.types.ts (generated)', () => {
  const sql = read(`${CONTRACTS}schema.sql`);
  const types = read(`${SRC}lib/db/contract.types.ts`);
  const code = sql.replace(/--[^\n]*/g, '');
  const block = (name: string): string => {
    const start = types.indexOf(`export interface ${name} {`);
    return start < 0 ? '' : types.slice(start, types.indexOf('\n}\n', start));
  };

  it('was generated from the current schema.sql (else run gen-contract-types.mts)', () => {
    const sha = createHash('sha256').update(readFileSync(`${CONTRACTS}schema.sql`)).digest('hex').slice(0, 16);
    expect(stampOf(types)).toBe(sha);
  });

  it('has every table, view and callable function that schema.sql creates', () => {
    const tables = [...code.matchAll(/create table ((?:public|passport)\.[a-z_]+)/g)].map((m) => m[1]!);
    const views = [...code.matchAll(/create view ((?:public|passport)\.[a-z_]+)/g)].map((m) => m[1]!);
    expect(tables.length).toBeGreaterThan(15);
    for (const t of tables) expect(block('ContractTables'), t).toContain(`  '${t}': {`);
    for (const v of views) expect(block('ContractViews'), v).toContain(`  '${v}': {`);
    const callable = [...code.matchAll(/create (?:or replace )?function public\.([a-z0-9_]+)\s*\(/g)]
      .filter((m) => !/^[^;]*?\breturns trigger\b/.test(code.slice(m.index)))
      .map((m) => m[1]!);
    expect(callable.length).toBeGreaterThan(25);
    for (const f of callable) expect(block('ContractFunctions'), f).toContain(`  ${f}: {`);
  });

  it('carries no dash, emoji or naming trap', () => {
    expect(DASHES.test(types)).toBe(false);
    expect(EMOJI.test(types)).toBe(false);
    expect(NAMING_TRAPS.test(types)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// rpcs.md, apis.md and the type modules of lib/network, lib/passport and lib/anime (F0 slice 6)

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Row<K extends keyof ContractTables> = ContractTables[K]['Row'];

/** Compile-time agreement of the hand-written types with the generated contract types (tsc fails on a false). */
const TYPE_AGREEMENT: [
  Equal<JoinedVia, Row<'public.world_memberships'>['joined_via']>,
  Equal<HandoffOutcome, Row<'passport.handoff_events'>['outcome']>,
  Equal<NetStep, Row<'public.bridge_daily'>['step']>,
  Equal<SpoilerScope, NonNullable<ContractAddedColumns['public.quizzes']['spoiler_scope']>>,
  Equal<keyof MyPassportRow, keyof FnReturns<'my_passport'>[number]>,
  Equal<keyof PublicPassportRow, keyof FnReturns<'public_passport'>[number]>,
  Equal<keyof PassportPrefsPatch, Exclude<keyof Row<'public.passport_prefs'>, 'user_id' | 'updated_at'>>,
  Equal<NetSitesMenuMode, Row<'public.passport_prefs'>['your_sites_menu']>,
] = [true, true, true, true, true, true, true, true];

/** The text of one `## ` or `### ` section of a contract file (up to the next heading of level 2 or 3). */
function sectionText(md: string, heading: string): string {
  const start = md.indexOf(`${heading}\n`);
  expect(start, heading).toBeGreaterThan(-1);
  const rest = md.slice(start + heading.length + 1);
  const end = rest.search(/\n#{2,3} /);
  return end === -1 ? rest : rest.slice(0, end);
}

/** The cells of every body row of the markdown tables in `text` (header and rule rows skipped). */
function tableRows(text: string): string[][] {
  const rows: string[][] = [];
  for (const block of text.split(/\n(?!\|)/)) {
    const lines = block.split('\n').filter((l) => l.startsWith('|'));
    for (const line of lines.slice(2)) {
      rows.push(line.slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim()));
    }
  }
  return rows;
}

/** The values of a single-column `check (col in (...))` constraint of schema.sql. */
function checkValues(sql: string, constraint: string): string[] {
  const m = new RegExp(`constraint ${constraint} check \\(\\w+ in \\(([^)]*)\\)\\)`).exec(sql);
  expect(m, constraint).not.toBeNull();
  return [...m![1]!.matchAll(/'([^']+)'/g)].map((v) => v[1]!);
}

/** The callable functions of schema.sql: name, parameter names, SECURITY mode, EXECUTE roles, replaced or new. */
function schemaFunctions(sql: string): { name: string; params: string[]; definer: boolean; roles: string[]; replaced: boolean }[] {
  const code = sql.replace(/--[^\n]*/g, '');
  const out: { name: string; params: string[]; definer: boolean; roles: string[]; replaced: boolean }[] = [];
  for (const m of code.matchAll(/create (or replace )?function public\.([a-z0-9_]+)\(([^)]*)\)/g)) {
    const tail = code.slice(m.index + m[0].length, code.indexOf('$$', m.index));
    if (/\breturns trigger\b/.test(tail)) continue;
    const name = m[2]!;
    const params = m[3]!.split(',').map((p) => p.trim().split(/\s+/)[0]!).filter(Boolean);
    const grant = new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to ([a-z_, ]+);`).exec(code);
    out.push({
      name, params, definer: /security definer/.test(tail), replaced: Boolean(m[1]),
      roles: grant ? grant[1]!.split(',').map((r) => r.trim()) : [],
    });
  }
  return out;
}

/** Columns of one `create table` of schema.sql, in order. */
function tableColumns(sql: string, table: string): string[] {
  const start = sql.indexOf(`create table ${table} (`);
  expect(start, table).toBeGreaterThan(-1);
  const body = sql.slice(start, sql.indexOf('\n);', start));
  return [...body.matchAll(/^\s+([a-z_]+)\s+(uuid|text|timestamptz|integer|smallint|date|boolean|jsonb|bigint)\b/gm)]
    .map((m) => m[1]!);
}

describe('rpcs.md (functions and server modules)', () => {
  const md = read(`${CONTRACTS}rpcs.md`);
  const sql = read(`${CONTRACTS}schema.sql`);
  const fns = schemaFunctions(sql);
  const rowsOf = (heading: string): string[][] => tableRows(sectionText(md, heading));
  const signature = (cell: string): { name: string; params: string[] } => {
    const m = /^`([a-z0-9_]+)\(([^)]*)\)`$/.exec(cell);
    expect(m, cell).not.toBeNull();
    return { name: m![1]!, params: m![2]!.split(',').map((p) => p.trim()).filter(Boolean) };
  };

  it('2.1 lists every new callable function of schema.sql once, with its parameters, SECURITY and EXECUTE roles', () => {
    const rows = rowsOf('### 2.1 New callable functions');
    const fresh = fns.filter((f) => !f.replaced && f.name !== 'merge_anon_passport');
    expect(rows.map((r) => signature(r[0]!).name).sort()).toEqual(fresh.map((f) => f.name).sort());
    for (const r of rows) {
      const { name, params } = signature(r[0]!);
      const f = fresh.find((x) => x.name === name)!;
      expect(params, name).toEqual(f.params);
      expect(r[2]!.startsWith('definer'), name).toBe(f.definer);
      expect(r[3]!.split(',').map((x) => x.trim()).sort(), name).toEqual([...f.roles].sort());
      expect(r[4]!.length, `${name}: callers`).toBeGreaterThan(10);
    }
  });

  it('2.2 lists exactly the replaced functions, ACL as today', () => {
    const rows = rowsOf('### 2.2 Replaced functions (008, 010): signature, return type and ACL as today');
    const replaced = fns.filter((f) => f.replaced || f.name === 'merge_anon_passport');
    expect(rows.map((r) => signature(r[0]!).name).sort()).toEqual(replaced.map((f) => f.name).sort());
    for (const r of rows) {
      const { name, params } = signature(r[0]!);
      expect(params, name).toEqual(replaced.find((f) => f.name === name)!.params);
      expect(r[3]!.startsWith('as today'), name).toBe(true);
    }
  });

  it('2.3 names the trigger of every new trigger function as schema.sql creates it', () => {
    const rows = rowsOf('### 2.3 Trigger functions (no EXECUTE grant; the trigger names are frozen)');
    for (const fn of ['quizzes_site_guard', 'profiles_membership', 'world_follows_counts']) {
      const row = rows.find((r) => r[0] === `\`${fn}()\``);
      expect(row, fn).toBeDefined();
      const trigger = /^`([a-z_]+)`/.exec(row![1]!)![1]!;
      expect(sql).toContain(`create trigger ${trigger} `);
      expect(sql).toContain(`execute function public.${fn}();`);
    }
  });

  it('3 gives every server module and component of BACKLOG 5.1 a signature type that declares it', () => {
    const rows = rowsOf('## 3. Server modules and component props (BACKLOG 5.1)');
    const sources: Record<string, string> = {
      SiteServerFns: read(`${SRC}lib/site/types.ts`),
      PassportServerFns: read(`${SRC}lib/passport/types.ts`),
      PersonNameTagProps: read(`${SRC}lib/passport/types.ts`),
      NetLinkFns: read(`${SRC}lib/network/types.ts`),
      NetEligibilityFns: read(`${SRC}lib/network/types.ts`),
      NetLinkProps: read(`${SRC}lib/network/types.ts`),
      CrossoverFactProps: read(`${SRC}lib/network/types.ts`),
      AnimeSpoilerFns: read(`${SRC}lib/anime/types.ts`),
      SpoilerShieldProps: read(`${SRC}lib/anime/types.ts`),
    };
    const backlog = [
      'forSite', 'withSite', 'profileForSite', 'awardXpForSite', 'getQuizOfTheDay', 'levelTitlesFor', 'getLevelInfo',
      'safeReturnTo', 'bridgeHref', 'editorialHref', 'eligibleFor', 'canShow', 'computeSpoilerLevel', 'cronForSite',
      'PersonName', 'NetLink', 'CrossoverFact', 'SpoilerShield',
    ];
    for (const name of backlog) {
      const row = rows.find((r) => r[0]!.startsWith(`\`${name}`));
      expect(row, name).toBeDefined();
      const type = /^`([A-Za-z]+)`$/.exec(row![1]!)?.[1];
      expect(type && sources[type], `${name}: ${row![1]}`).toBeTruthy();
      const src = sources[type!]!;
      const block = src.slice(src.indexOf(`export interface ${type}`), src.indexOf('\n}\n', src.indexOf(`export interface ${type}`)));
      expect(block.length, type).toBeGreaterThan(20);
      if (type!.endsWith('Fns')) expect(block, `${type} declares ${name}`).toMatch(new RegExp(`\\n  ${name}(<[^\\n]*>)?\\(`));
      expect(row![2], `${name}: module`).toMatch(/^`(lib|components)\/[a-z0-9/.-]+`$/);
      expect(row![3], `${name}: owner`).toMatch(/^(B[1-7]|O[1-6]|X1|no owner yet)/);
    }
  });

  it('section 4: the member projection lists cover world_memberships exactly once', () => {
    const cols = tableColumns(sql, 'public.world_memberships');
    expect(cols.length).toBeGreaterThan(30);
    const all = [...MEMBER_PUBLIC_COLUMNS, ...MEMBER_FILTER_COLUMNS, ...MEMBER_PRIVATE_COLUMNS];
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...cols].sort());
    for (const k of [...MEMBERSHIP_PATCH_KEYS_ANY_SITE, ...MEMBERSHIP_PATCH_KEYS_NON_KPOP]) expect(cols).toContain(k);
    for (const v of Object.values(PROFILE_FROM_MEMBERSHIP)) expect(MEMBER_PUBLIC_COLUMNS as readonly string[]).toContain(v);
    expect(md).toContain('`MEMBER_PUBLIC_COLUMNS`');
  });
});

describe('the type modules agree with schema.sql and cookies.md', () => {
  const sql = read(`${CONTRACTS}schema.sql`);
  const cookies = read(`${CONTRACTS}cookies.md`);

  it('the enumerations equal the SQL checks', () => {
    expect(TYPE_AGREEMENT.every(Boolean)).toBe(true);
    expect([...HANDOFF_OUTCOMES]).toEqual(checkValues(sql, 'handoff_events_outcome_check'));
    expect([...JOINED_VIA]).toEqual(checkValues(sql, 'world_memberships_joined_via_check'));
    expect([...NET_STEPS]).toEqual(checkValues(sql, 'bridge_daily_step_check'));
    expect([...SPOILER_SCOPES]).toEqual(checkValues(sql, 'quizzes_spoiler_scope_check'));
    const bank = checkValues(sql, 'quiz_bank_category_check');
    expect([...ANIME_BANK_CATEGORIES]).toEqual(bank.slice(bank.indexOf('series_specific')));
    expect(bank.slice(0, bank.indexOf('series_specific'))).toEqual(['group_specific', 'knowledge', 'true_false', 'fun', 'era']);
  });

  it('every outcome of cookies.md 5 is in HANDOFF_OUTCOMES, and back', () => {
    const table = tableRows(sectionText(cookies, '## 5. Outcomes (`passport.handoff_events.outcome`)'));
    expect(table.map((r) => r[0]!.replace(/`/g, ''))).toEqual([...HANDOFF_OUTCOMES]);
  });

  it('link ids, steps and via codes follow the bridge_daily and via checks', () => {
    expect(NET_LINK_IDS.length).toBe(25);
    expect(new Set(NET_LINK_IDS).size).toBe(NET_LINK_IDS.length);
    for (const id of NET_LINK_IDS) {
      expect(id).toMatch(/^[a-z]{2,8}$/);
      for (const letter of ['k', 'a', 'f']) expect(VIA_RE.test(`${letter}.${id}`)).toBe(true);
    }
    expect(VIA_RE.test('x.menu')).toBe(false);
    expect(VIA_RE.test('k.m')).toBe(false);
    expect(sql).toContain(`via_code ~ '${VIA_RE.source}'`);
    expect(NET_BEACON_STEPS.every((s) => (NET_STEPS as readonly string[]).includes(s))).toBe(true);
    expect(NET_BEACON_STEPS).not.toContain('join');
    expect(NET_BEACON_STEPS).not.toContain('first_play');
    for (const id of SITE_IDS) expect(VIA_RE.test(`${REGISTRY[id].letter}.menu`), id).toBe(true);
  });

  it('the handoff constants are the ones cookies.md freezes', () => {
    expect(PASSPORT_SECONDS).toEqual({ ticket: 600, txCookie: 300, code: 60, freshSignIn: 600 });
    expect(PASSPORT_LIMITS).toEqual({ nextMaxLength: 2048, codesPerUserHour: 30, codesPerIpHashHour: 60 });
    expect(cookies).toContain(`| name | \`${TX_COOKIE_NAMES.https}\` | \`${TX_COOKIE_NAMES.devHttp}\` |`);
    expect(cookies).toContain(`"${MAC_LABELS.ticket}" + p`);
    expect(cookies).toContain(`"${MAC_LABELS.tx}" + p`);
    expect(B64U_32_RE.test('A'.repeat(43))).toBe(true);
    expect(B64U_32_RE.test('A'.repeat(42))).toBe(false);
    expect(B64U_16_RE.test('a_-'.repeat(7) + 'b')).toBe(true);
    expect(CODE_HASH_RE.test('0'.repeat(64))).toBe(true);
    expect(CODE_HASH_RE.test('A'.repeat(64))).toBe(false);
    expect(sql).toContain(`code_hash ~ '${CODE_HASH_RE.source}'`);
    expect(sql).toContain(`code_challenge ~ '${B64U_32_RE.source}'`);
    expect(ANIME_SPOILER_STORE_KEY).toBe('anime.spoiler.v1');
    expect(cookies).toContain(`\`${ANIME_SPOILER_STORE_KEY}\``);
    expect(SPOILER_SHOW_ALL).toBe(32767);
  });

  it('the new type modules carry no dash, emoji or naming trap', () => {
    for (const f of ['lib/network/types.ts', 'lib/passport/types.ts', 'lib/anime/types.ts']) {
      const text = read(`${SRC}${f}`);
      expect(DASHES.test(text), f).toBe(false);
      expect(EMOJI.test(text), f).toBe(false);
      expect(NAMING_TRAPS.test(text), f).toBe(false);
      // The word survives only inside the frozen names of naming.md: remove them, then nothing may be left.
      const rest = text
        .replace(/`bridge`|\bbridge: NetBridgeId|\{dst, bridge, step\}/g, '')
        .replace(/NetBridgeId|bridgeHref|bridge_daily(\.bridge)?|net_bridge_bump/g, '');
      expect(new RegExp(`b${'ridge'}`, 'i').test(rest), f).toBe(false);
    }
  });

  it('lib/passport never gets an index.ts: @/lib/passport stays the kpop module', async () => {
    expect(existsSync(`${SRC}lib/passport/index.ts`)).toBe(false);
    expect(existsSync(`${SRC}lib/passport.ts`)).toBe(true);
    const kpop = await import('@/lib/passport');
    expect(kpop.MASTERY).toBeDefined();
  });
});

describe('apis.md (HTTP routes)', () => {
  const md = read(`${CONTRACTS}apis.md`);
  const routes = read(`${CONTRACTS}routes.md`);
  const manifest = read(`${CONTRACTS}manifest.md`);
  const index = tableRows(sectionText(md, '## 1. Index'));
  const paths = index.map((r) => r[0]!.replace(/`/g, ''));

  it('lists every route of BACKLOG 5.1 once, each with a method, sites, owner and section', () => {
    const backlog = [
      '/auth/passport/out', '/auth/arrive', '/auth/authorize', '/auth/land', '/api/passport/redeem',
      '/api/passport/after-signin', '/auth/confirm', '/api/passport/revalidate', '/api/passport/delete',
      '/api/passport/cancel', '/api/passport/leave', '/api/n/me', '/api/n/b',
    ];
    for (const p of backlog) expect(paths, p).toContain(p);
    expect(new Set(paths).size).toBe(paths.length);
    for (const r of index) {
      expect(r).toHaveLength(6);
      expect(r[1], r[0]).toMatch(/^(GET|POST)( \(page\))?$/);
      for (const s of r[2]!.split(',').map((x) => x.trim())) expect(SITE_IDS as readonly string[], r[0]).toContain(s);
      expect(r[3], r[0]).toMatch(/^(B[1-7]|O[1-6]|L1|E1b|H1|P1|X1)$/);
      const section = r[5]!;
      if (section !== '7') expect(md, `${r[0]} section ${section}`).toMatch(new RegExp(`\\n#{2,3} ${section.replace('.', '\\.')}[ .]`));
    }
  });

  it('agrees with routes.md (the new kpop routes) and manifest.md (the crons)', () => {
    const para = routes.slice(routes.indexOf('New kpop routes in the run'), routes.indexOf('No other kpop route may be added'));
    const kpopNew = [...para.matchAll(/`(\/[a-z/-]+)`/g)].map((m) => m[1]!)
      .filter((p) => !p.endsWith('/') && !['/admin', '/auth/callback', '/auth/confirm'].includes(p));
    expect(kpopNew.length).toBe(9);
    const servedOnKpop = index.filter((r) => r[2]!.includes('kpop')).map((r) => r[0]!.replace(/`/g, ''));
    for (const p of kpopNew) expect(servedOnKpop, p).toContain(p);
    for (const p of servedOnKpop) {
      if (p.startsWith('/api/cron/')) continue;
      expect(kpopNew, p).toContain(p);
    }
    for (const p of paths.filter((x) => x.startsWith('/api/cron/'))) expect(manifest, p).toContain(`| \`${p}\` |`);
    const confirm = index.find((r) => r[0] === '`/auth/confirm`')!;
    expect(confirm[2]).not.toContain('kpop');
  });

  it('every body type it names exists in lib/passport/types.ts or lib/network/types.ts', () => {
    const passport = read(`${SRC}lib/passport/types.ts`);
    const network = read(`${SRC}lib/network/types.ts`);
    const named = new Set([...md.matchAll(/`([A-Z][A-Za-z]+(Request|Response|Failure|Error))\b/g)].map((m) => m[1]!));
    expect(named.size).toBeGreaterThan(8);
    for (const t of named) expect(passport.includes(`export interface ${t}`) || passport.includes(`export type ${t}`) || network.includes(`export interface ${t}`), t).toBe(true);
    for (const t of ['NetMe', 'NetBeacon']) expect(network).toContain(`export interface ${t} `);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Slice 8: content formats (formats.md, schemas/), fixtures (fixtures.md, fixtures/) and the link allowlist
// ---------------------------------------------------------------------------------------------------------------

/** Every schema of schemas/ and fixtures/, keyed by file name (their $id). */
function loadRegistry(): Record<string, JsonSchema> {
  const reg: Record<string, JsonSchema> = {};
  for (const dir of ['schemas/', 'fixtures/']) {
    for (const f of readdirSync(`${CONTRACTS}${dir}`).filter((x) => x.endsWith('.schema.json')).sort()) {
      reg[f] = JSON.parse(read(`${CONTRACTS}${dir}${f}`)) as JsonSchema;
    }
  }
  return reg;
}

/** The content formats of formats.md, in its order (the brief's ten, the Which character set in two files). */
const FORMATS = [
  'fact', 'quiz-draft', 'daily-bank-row', 'creator-profile', 'playlist', 'which-character-questions',
  'which-character-set', 'name-all-set', 'this-or-that-bracket', 'crossover-entry', 'review-packet',
] as const;

/** A schema node by JSON pointer (`#/$defs/x/properties/y`), for reading enums out of the files. */
function node(reg: SchemaRegistry, file: string, pointer: string): Record<string, unknown> {
  let n: unknown = reg[file];
  for (const part of pointer.replace(/^#\/?/, '').split('/').filter(Boolean)) n = (n as Record<string, unknown>)[part];
  expect(n, `${file}${pointer}`).toBeTypeOf('object');
  return n as Record<string, unknown>;
}

/** Columns of a table of schema.sql or schema.base.sql, every column of a line (`episode_from integer, episode_to integer`). */
function allColumns(sql: string, table: string): string[] {
  const start = sql.indexOf(`create table ${table} (`);
  expect(start, table).toBeGreaterThan(-1);
  const body = sql.slice(start + `create table ${table} (`.length, sql.indexOf('\n);', start));
  return [...body.matchAll(/(?:^|,)\s*([a-z_]+)\s+(?:uuid|text|timestamptz|integer|smallint|date|boolean|jsonb|bigint|serial)\b/gm)]
    .map((m) => m[1]!);
}

/** The values of a single-column `check (col in (...))` constraint, the list possibly on the next line. */
function checkList(sql: string, constraint: string): string[] {
  const m = new RegExp(`constraint ${constraint} check \\(\\w+ in\\s+\\(([^)]*)\\)\\)`).exec(sql);
  expect(m, constraint).not.toBeNull();
  return [...m![1]!.matchAll(/'([^']+)'/g)].map((v) => v[1]!);
}

/** computeSpoilerLevel as rpcs.md 3 and AnimeSpoilerFns state it (the fixtures' expected_level follows it). */
function spoilerLevelOf(questions: readonly { spoiler: { arc: number; scope: SpoilerScope } }[]): { arc_ord: number; scope: SpoilerScope | null } {
  const tagged = questions.filter((q) => q.spoiler.arc > 0);
  if (tagged.length === 0) return { arc_ord: 0, scope: null };
  const arc = Math.max(...tagged.map((q) => q.spoiler.arc));
  const scope: SpoilerScope = tagged.some((q) => q.spoiler.scope === 'manga') ? 'manga'
    : tagged.every((q) => q.spoiler.scope === 'anime') ? 'anime' : 'both';
  return { arc_ord: arc, scope };
}

describe('JSON Schema validator (scripts/o1/contract/json-schema.ts)', () => {
  const reg: SchemaRegistry = {
    'a.schema.json': {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'n'],
      properties: {
        name: { $ref: 'b.schema.json#/$defs/word', maxLength: 5 },
        n: { type: 'integer', minimum: 1, maximum: 3 },
        tags: { type: 'array', minItems: 1, maxItems: 2, uniqueItems: true, items: { enum: ['x', 'y', 'z'] }, contains: { const: 'x' } },
        kind: { oneOf: [{ const: 'p' }, { type: 'string', pattern: '^p|q$' }] },
        any: { anyOf: [{ type: 'null' }, { type: 'boolean' }] },
        no: { not: { const: 0 } },
        map: { type: 'object', minProperties: 1, additionalProperties: { type: 'number' } },
      },
      if: { properties: { n: { const: 3 } } },
      then: { required: ['tags'] },
      else: { not: { required: ['tags'] } },
    },
    'b.schema.json': { $defs: { word: { type: 'string', pattern: '^\\p{L}+$' } } },
  };
  const ok = { name: 'Ab', n: 3, tags: ['x', 'y'], kind: 'q', any: null, no: 1, map: { a: 1 } };
  const errs = (d: unknown): string[] => validate('a.schema.json', d, reg).map((e) => `${e.path} ${e.message}`);

  it('accepts a value that meets every supported keyword', () => {
    expect(errs(ok)).toEqual([]);
    expect(errs({ name: 'ü', n: 1 })).toEqual([]);
  });

  it('reports each planted break with its path', () => {
    const cases: [unknown, RegExp][] = [
      [{ ...ok, name: 'abcdef' }, /^\/name longer than 5/],
      [{ ...ok, name: 'a1' }, /^\/name does not match/],
      [{ ...ok, n: 4 }, /^\/n above 3/],
      [{ ...ok, n: 1.5 }, /^\/n must be integer/],
      [{ ...ok, tags: ['y'] }, /no item matches the contains rule/],
      [{ ...ok, tags: ['x', 'x'] }, /^\/tags\/1 duplicate item/],
      [{ ...ok, tags: ['x', 'w'] }, /^\/tags\/1 must be one of/],
      [{ ...ok, kind: 'p' }, /^\/kind matches 2 of oneOf/],
      [{ ...ok, any: 1 }, /^\/any matches none of anyOf/],
      [{ ...ok, no: 0 }, /^\/no matches the not rule/],
      [{ ...ok, map: {} }, /^\/map fewer than 1 properties/],
      [{ ...ok, map: { a: 'x' } }, /^\/map\/a must be number/],
      [{ ...ok, extra: 1 }, /^\/extra unknown property/],
      [{ name: 'a' }, /^ missing n/],
      [{ name: 'a', n: 3 }, /^ missing tags/],
      [{ name: 'a', n: 1, tags: ['x'] }, /^ matches the not rule/],
    ];
    for (const [d, re] of cases) expect(errs(d).some((e) => re.test(e)), `${JSON.stringify(d)}: ${errs(d).join('; ')}`).toBe(true);
  });

  it('refuses keywords outside the subset, bad types, broken patterns and unresolved references', () => {
    expect(unknownKeywords({ format: 'date', properties: { a: { patternProperties: {} } } })).toEqual(['#/format', '#/properties/a/patternProperties']);
    expect(unknownKeywords({ type: 'text' })).toEqual(['#/type (bad value)']);
    expect(unknownKeywords({ pattern: '(' })).toEqual(['#/pattern (does not compile)']);
    expect(unknownKeywords(reg['a.schema.json']!)).toEqual([]);
    expect(unresolvedRefs('a.schema.json', reg)).toEqual([]);
    expect(unresolvedRefs('c.schema.json', { 'c.schema.json': { $ref: 'd.schema.json' } })).toHaveLength(1);
    expect(unresolvedRefs('c.schema.json', { 'c.schema.json': { $ref: '#/$defs/missing' } })).toHaveLength(1);
  });

  it('reads the file name convention and validates every entry of an array file', () => {
    expect(formatOfFile('death-note.quiz-draft.json', FORMATS)).toBe('quiz-draft');
    expect(formatOfFile('death-note.json', FORMATS)).toBeNull();
    expect(formatOfFile('x.unknown-format.json', FORMATS)).toBeNull();
    const r: SchemaRegistry = { 'w.schema.json': { type: 'string' } };
    expect(validateEntries('w', ['a', 1], r)).toEqual([{ path: '/1', message: 'must be string, got integer' }]);
    expect(validateEntries('w', 'a', r)).toEqual([]);
  });
});

describe('content formats (formats.md, schemas/)', () => {
  const reg = loadRegistry();
  const md = read(`${CONTRACTS}formats.md`);
  const sql = read(`${CONTRACTS}schema.sql`);
  const v = (format: string, d: unknown): string[] => validate(`${format}.schema.json`, d, reg).map((e) => `${e.path} ${e.message}`);

  it('every schema uses only the supported keywords, resolves every $ref and is named by its $id', () => {
    expect(Object.keys(reg).length).toBe(FORMATS.length + 3);
    for (const [f, s] of Object.entries(reg)) {
      expect(unknownKeywords(s), f).toEqual([]);
      expect(unresolvedRefs(f, reg), f).toEqual([]);
      expect((s as { $id?: string }).$id, f).toBe(f);
    }
    for (const f of FORMATS) {
      expect(reg[`${f}.schema.json`], f).toBeDefined();
      expect(md, f).toContain(`\`${f}.schema.json\``);
    }
  });

  it('the enumerations equal the code and schema.sql', () => {
    expect(node(reg, 'anime-question.schema.json', '#/$defs/kind').enum).toEqual([...ANIME_QUESTION_KINDS]);
    const quizTypes = ['multiple_choice', 'true_false', 'guess_from_clues', 'intruder'] as const satisfies readonly Exclude<QuizType, 'image'>[];
    const allTypes: Record<Exclude<QuizType, 'image'>, true> = { multiple_choice: true, true_false: true, guess_from_clues: true, intruder: true };
    expect(node(reg, 'anime-question.schema.json', '#/$defs/quizType').enum).toEqual([...quizTypes]);
    expect(Object.keys(allTypes)).toEqual([...quizTypes]);
    const category = node(reg, 'daily-bank-row.schema.json', '#/properties/category').enum as string[];
    expect([...category].sort()).toEqual([...ANIME_BANK_CATEGORIES, 'true_false'].sort());
    for (const c of category) expect(checkValues(sql, 'quiz_bank_category_check')).toContain(c);
    const spoiler = node(reg, 'common.schema.json', '#/$defs/spoiler/properties');
    expect((spoiler.scope as { enum: string[] }).enum).toEqual([...SPOILER_SCOPES]);
    expect((spoiler.arc as { maximum: number }).maximum).toBe(SPOILER_SHOW_ALL - 1);
    expect(node(reg, 'common.schema.json', '#/$defs/themeKind').enum).toEqual(checkValues(sql, 'series_themes_kind_check'));
    expect(node(reg, 'common.schema.json', '#/$defs/axis').enum).toEqual([...AXIS_KEYS]);
    expect(node(reg, 'fact.schema.json', '#/properties/sources/items/properties/source').enum).toEqual(checkList(sql, 'entity_sources_source_check'));
    const kinds = node(reg, 'fact.schema.json', '#/properties/entity/properties/kind').enum as string[];
    for (const k of kinds.filter((x) => x !== 'episode')) expect(checkList(sql, 'trivia_entity_kind_check')).toContain(k);
    expect(checkList(sql, 'entity_sources_entity_type_check')).toEqual(expect.arrayContaining(['series', 'character', 'arc', 'episode', 'series_theme']));
    expect(node(reg, 'playlist.schema.json', '#/properties/themes').minItems).toBe(MIN_PLAYABLE_THEMES);
    expect(checkList(sql, 'games_game_type_check')).toEqual(expect.arrayContaining(['this_or_that', 'name_all_characters']));
    const fx = 'series-fixture.schema.json';
    expect(node(reg, fx, '#/properties/series/properties/type').enum).toEqual(checkValues(sql, 'series_type_check'));
    expect(node(reg, fx, '#/properties/series/properties/status').enum).toEqual(checkValues(sql, 'series_status_check'));
    expect(node(reg, fx, '#/properties/series/properties/tier').enum).toEqual(checkValues(sql, 'series_tier_check'));
    expect(node(reg, fx, '#/properties/arcs/items/properties/kind').enum).toEqual(checkValues(sql, 'arcs_kind_check'));
    expect(node(reg, fx, '#/properties/characters/items/properties/role').enum).toEqual(checkValues(sql, 'characters_role_check'));
    expect(node(reg, fx, '#/properties/characters/items/properties/debut_medium').enum).toEqual(checkValues(sql, 'characters_debut_medium_check'));
    const packet = node(reg, 'review-packet.schema.json', '#/properties/format').enum as string[];
    expect(packet).toHaveLength(FORMATS.length);
    expect(new Set(packet)).toEqual(new Set([...FORMATS.filter((f) => f !== 'review-packet'), 'series-data']));
  });

  it('the crossover entry schema is NetCrossover, field by field', () => {
    const top = { id: true, kind: true, kpop: true, anime: true, canonical: true, fact: true, source: true, checkedOn: true, status: true } satisfies Record<keyof NetCrossover, true>;
    const kpop = { groupSlug: true, deezerId: true, mbid: true } satisfies Record<keyof NetCrossover['kpop'], true>;
    const anime = { seriesSlug: true, role: true, season: true, cour: true, year: true } satisfies Record<keyof NetCrossover['anime'], true>;
    const fact = { kpop: true, anime: true } satisfies Record<keyof NetCrossover['fact'], true>;
    const s = 'crossover-entry.schema.json';
    const keys = (p: string): string[] => Object.keys(node(reg, s, p).properties as object).sort();
    expect(keys('#')).toEqual(Object.keys(top).sort());
    expect(keys('#/properties/kpop')).toEqual(Object.keys(kpop).sort());
    expect(keys('#/properties/anime')).toEqual(Object.keys(anime).sort());
    expect(keys('#/properties/fact')).toEqual(Object.keys(fact).sort());
    expect(node(reg, s, '#').required).toEqual(Object.keys(top));
    expect(node(reg, s, '#/properties/anime').required).toEqual(['seriesSlug', 'year']);
    const kind: NetCrossover['kind'][] = ['song_in_series', 'webtoon_origin', 'animated_crossover'];
    expect(node(reg, s, '#/properties/kind').enum).toEqual(kind);
    const role: NonNullable<NetCrossover['anime']['role']>[] = ['op', 'ed', 'insert'];
    expect(node(reg, 'common.schema.json', '#/$defs/themeKind').enum).toEqual(role);
  });

  // One good entry per format, then planted breaks. Test values only: none of this is content.
  const src = 'https://en.wikipedia.org/wiki/Example';
  const at = '2026-10-17T12:00:00Z';
  const tq = (i: number, arc = 0): Record<string, unknown> => ({
    question: `Test question ${i}?`, options: [`A${i}`, `B${i}`, `C${i}`, `D${i}`], correct: 0, kind: 'production',
    spoiler: { arc, scope: 'both' }, fact_ids: [`test-fact-${String(i).padStart(3, '0')}`], source_url: src,
  });
  const sources = [{ id: 'S1', title: 'Wikipedia, Example', url: src }];
  const themes = Array.from({ length: 15 }, (_, i) => ({ group_slug: 'test-series', kind: 'op', number: i + 1, deezer_track_id: 1000 + i }));
  const axes = { energy: 10, chaos: 20, care: 30, craft: 40, heart: 50, spotlight: 60 };
  const good: Record<(typeof FORMATS)[number], unknown> = {
    fact: {
      id: 'test-series-studio-001', site: 'anime', entity: { kind: 'series', group_slug: 'test-series' }, field: 'studios',
      value: ['Test Studio'], category: 'history', load_bearing: true, spoiler: { arc: 0, scope: 'both' },
      sources: [{ source: 'wikidata', url: 'https://www.wikidata.org/wiki/Q1', ref: 'Q1', fetched_at: at }, { source: 'wikipedia', url: src, ref: '123456', fetched_at: at }],
      status: 'verified', verified_at: at,
    },
    'quiz-draft': {
      site: 'anime', account: 'oq_creator_01', group_slug: 'test-series', title: 'Test Series Basics', slug: 'test-series-basics',
      quiz_type: 'multiple_choice', difficulty: 'easy', language: 'en', title_gives_nothing_away: true,
      questions: [tq(1), tq(2), tq(3, 2)], sources,
    },
    'daily-bank-row': {
      site: 'anime', title: 'Test Daily Quiz', group_slug: null, quiz_type: 'multiple_choice', difficulty: 'medium',
      category: 'creators_studios', questions: Array.from({ length: 8 }, (_, i) => tq(i + 1)), sources,
    },
    'creator-profile': {
      site: 'anime', kind: 'series', username: 'oq_creator_01', display_name: 'Test Desk', bio: 'A test account.', beat: 'Test series',
      groups: ['test-series'], style: { voice: 'Plain and short.', do: ['Short sentences'], dont: ['Superlatives'] },
      avatar: 'public/brand/anime/creators/oq_creator_01-avatar.svg', header: 'public/brand/anime/creators/oq_creator_01-header.svg',
    },
    playlist: { site: 'anime', id: 'series-test-series', kind: 'series', group_slug: 'test-series', title: 'Test openings', description: 'A test playlist.', title_only: false, themes, checked_on: '2026-10-17' },
    'which-character-questions': {
      site: 'anime',
      questions: Array.from({ length: 8 }, (_, i) => ({ ord: i + 1, question: `Test question ${i + 1}?`, options: [{ text: 'Yes', weights: { energy: 5 } }, { text: 'No', weights: { energy: 0, care: 3 } }] })),
    },
    'which-character-set': {
      site: 'anime', group_slug: 'test-series',
      profiles: Array.from({ length: 6 }, (_, i) => ({ character_slug: `test-${i}`, name: `Test ${i}`, axes, trait_lines: [], ord: i })),
    },
    'name-all-set': {
      site: 'anime', group_slug: 'test-series', set: 'test-crew', title: 'Name All the Test Crew',
      members: [1, 2, 3].map((i) => ({ character_slug: `test-${i}`, name: `Test ${i}`, spellings: [] })), timer_seconds: 120,
      difficulty: 'easy', spoiler: { arc: 0, scope: 'both' },
    },
    'this-or-that-bracket': {
      site: 'anime', slug: 'test-bracket', title: 'Test bracket', spoiler: { arc: 0, scope: 'both' },
      entries: [{ label: 'One' }, { label: 'Two', group_slug: 'test-series', character_slug: 'test-1' }, { label: 'Three', group_slug: 'test-series', theme: { kind: 'op', number: 1 } }, { label: 'Four' }],
    },
    'crossover-entry': {
      id: 'test-entry-2020', kind: 'song_in_series', kpop: { groupSlug: 'test-group', deezerId: 1 },
      anime: { seriesSlug: 'test-series', role: 'op', year: 2020 }, canonical: 'kpop',
      fact: { kpop: 'Test line for the kpop side.', anime: 'Test line for the anime side.' }, source: src, checkedOn: '2026-10-17', status: 'hold',
    },
    'review-packet': {
      site: 'anime', lane: 'K2', label: 'Test batch 1', format: 'quiz-draft', created_at: at,
      items: [{ ref: 'test-series-basics', title: 'Test Series Basics', file: 'docs/anime/test.quiz-draft.json', fact_ids: ['test-fact-001'], checks: [{ code: 'C1', pass: true }] }],
      facts: [], sample: { fraction: 0.25, seed: 'test', refs: ['test-series-basics#1'] }, flagged: [],
      review: { status: 'approved', reviewer: 'o1_admin_reviewer', reviewed_at: at, errors: 1 },
    },
  };

  it('each format accepts its good entry', () => {
    for (const f of FORMATS) expect(v(f, good[f]), f).toEqual([]);
  });

  it('each format refuses its planted breaks (C1, C10, C11, C14 and the rules of formats.md)', () => {
    const g = <T>(f: (typeof FORMATS)[number]): T => structuredClone(good[f]) as T;
    type O = Record<string, unknown> & { questions: Record<string, unknown>[] };
    const plants: [string, (typeof FORMATS)[number], (d: Record<string, unknown>) => void, RegExp][] = [
      ['one source on a verified load-bearing fact', 'fact', (d) => { (d.sources as unknown[]).pop(); }, /fewer than 2 items/],
      ['a Wikipedia source without its revision', 'fact', (d) => { delete (d.sources as Record<string, unknown>[])[1]!.ref; }, /missing ref/],
      ['a fact on a banned host', 'fact', (d) => { (d.sources as Record<string, unknown>[])[1]!.url = 'https://naruto.fandom.com/wiki/X'; }, /does not match/],
      ['a ref on a series fact', 'fact', (d) => { (d.entity as Record<string, unknown>).ref = 'x'; }, /matches the not rule/],
      ['an image question on anime', 'quiz-draft', (d) => { (d as O).questions[0]!.image_url = src; }, /matches 0 of oneOf/],
      ['an image_url on an intruder label', 'quiz-draft', (d) => { d.quiz_type = 'intruder'; (d as O).questions = [1, 2, 3].map((i) => ({ ...tq(i), options: [{ label: 'a', image_url: src }, { label: 'b' }, { label: 'c' }, { label: 'd' }] })); }, /unknown property/],
      ['a question without fact_ids in a Team draft', 'quiz-draft', (d) => { delete (d as O).questions[1]!.fact_ids; }, /missing fact_ids/],
      ['a dash in a title', 'quiz-draft', (d) => { d.title = `Test ${String.fromCharCode(0x2014)} basics`; }, /^\/title does not match/],
      ['a spoiler level in the draft', 'quiz-draft', (d) => { d.spoiler_arc_ord = 2; }, /unknown property/],
      ['a question of another type than the quiz', 'quiz-draft', (d) => { d.quiz_type = 'true_false'; }, /must be boolean/],
      ['an unticked title box', 'quiz-draft', (d) => { d.title_gives_nothing_away = false; }, /must equal true/],
      ['a tagged question in the daily bank', 'daily-bank-row', (d) => { (d as O).questions[3] = tq(4, 1); }, /^\/questions\/3\/spoiler\/arc must equal 0/],
      ['seven questions in a bank row', 'daily-bank-row', (d) => { (d as O).questions.pop(); }, /fewer than 8 items/],
      ['a category outside S 4.4', 'daily-bank-row', (d) => { d.category = 'group_specific'; }, /must be one of/],
      ['a series creator with no series', 'creator-profile', (d) => { d.groups = []; }, /fewer than 1 items/],
      ['the system account with a series', 'creator-profile', (d) => { d.kind = 'system'; d.username = 'otakuquiz_team'; d.avatar = 'public/brand/anime/creators/otakuquiz_team-avatar.svg'; d.header = 'public/brand/anime/creators/otakuquiz_team-header.svg'; }, /more than 0 items/],
      ['a bio over 160', 'creator-profile', (d) => { d.bio = 'x'.repeat(161); }, /longer than 160/],
      ['a creator asset outside public/brand/anime', 'creator-profile', (d) => { d.avatar = 'public/sites/x-avatar.svg'; }, /does not match/],
      ['14 playable themes', 'playlist', (d) => { (d.themes as unknown[]).pop(); }, /fewer than 15 items/],
      ['a series playlist without the series- id', 'playlist', (d) => { d.id = 'test-openings'; }, /does not match \^series-/],
      ['a cover on a playlist theme', 'playlist', (d) => { (d.themes as Record<string, unknown>[])[0]!.cover = src; }, /unknown property/],
      ['seven personality questions', 'which-character-questions', (d) => { (d.questions as unknown[]).pop(); }, /fewer than 8 items/],
      ['a weight above 5', 'which-character-questions', (d) => { ((d.questions as O[])[0]!.options as Record<string, unknown>[])[0]!.weights = { energy: 6 }; }, /above 5/],
      ['five profiles', 'which-character-set', (d) => { (d.profiles as unknown[]).pop(); }, /fewer than 6 items/],
      ['a profile without an axis', 'which-character-set', (d) => { delete ((d.profiles as Record<string, unknown>[])[0]!.axes as Record<string, unknown>).care; }, /missing care/],
      ['a photo on a profile', 'which-character-set', (d) => { (d.profiles as Record<string, unknown>[])[0]!.photo_url = src; }, /unknown property/],
      ['a name-all set without its spoiler tag', 'name-all-set', (d) => { delete d.spoiler; }, /missing spoiler/],
      ['a photo on a name-all member', 'name-all-set', (d) => { (d.members as Record<string, unknown>[])[0]!.photo_url = src; }, /unknown property/],
      ['five bracket entries', 'this-or-that-bracket', (d) => { (d.entries as unknown[]).push({ label: 'Five' }); }, /matches none of anyOf/],
      ['a character entry without its series', 'this-or-that-bracket', (d) => { delete (d.entries as Record<string, unknown>[])[1]!.group_slug; }, /missing group_slug/],
      ['a song without its Deezer id', 'crossover-entry', (d) => { delete (d.kpop as Record<string, unknown>).deezerId; }, /missing deezerId/],
      ['a crossover fact over 140', 'crossover-entry', (d) => { (d.fact as Record<string, unknown>).kpop = 'x'.repeat(141); }, /longer than 140/],
      ['an http source', 'crossover-entry', (d) => { d.source = 'http://example.org/'; }, /does not match/],
      ['an approved batch with two errors', 'review-packet', (d) => { (d.review as Record<string, unknown>).errors = 2; }, /must equal "rejected"/],
      ['a batch of 51', 'review-packet', (d) => { const it0 = (d.items as unknown[])[0]; d.items = Array.from({ length: 51 }, (_, i) => ({ ...(it0 as object), ref: `r${i}` })); }, /more than 50 items/],
    ];
    for (const [why, f, plant, re] of plants) {
      const d = g<Record<string, unknown>>(f);
      plant(d);
      const e = v(f, d);
      expect(e.some((x) => re.test(x)), `${why}: ${e.join('; ')}`).toBe(true);
    }
  });

  it('every data file of a lane named <name>.<format>.json follows its format', () => {
    const files: string[] = [];
    const skip = new Set(['node_modules', '.next', '.git', 'graphify-out', 'public', 'test-results', 'playwright-report']);
    const walk = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        if (skip.has(f)) continue;
        const p = `${dir}${f}`;
        if (statSync(p).isDirectory()) walk(`${p}/`);
        else if (formatOfFile(f, FORMATS)) files.push(p);
      }
    };
    for (const d of ['docs/', 'apps/quiz/scripts/', 'apps/quiz/src/', 'scripts/']) if (existsSync(`${REPO}${d}`)) walk(`${REPO}${d}`);
    for (const p of files) {
      const f = formatOfFile(p.slice(p.lastIndexOf('/') + 1), FORMATS)!;
      expect(validateEntries(f, JSON.parse(read(p)), reg), p).toEqual([]);
    }
  });
});

describe('fixtures (fixtures.md, fixtures/)', () => {
  const reg = loadRegistry();
  const sql = read(`${CONTRACTS}schema.sql`);
  const base = read(`${CONTRACTS}schema.base.sql`);
  const runMts = read(`${REPO}apps/quiz/scripts/o1/fixtures/run.mts`);
  type User = { key: string; username: string | null; display_name: string; kind: string; confirmed: boolean; profile: Record<string, unknown> | null; sites: string[]; purpose: string };
  const users = (JSON.parse(read(`${CONTRACTS}fixtures/users.json`)) as { email: string; users: User[] }).users;
  type Q = { question: string; options?: (string | { label: string })[]; clues?: string[]; fun_fact?: string; spoiler: { arc: number; scope: SpoilerScope }; source_url?: string };
  type Series = {
    group: Record<string, unknown>; series: Record<string, unknown>; arcs: { ord: number }[];
    characters: { slug: string; name: string; debut_arc_ord: number; spoiler_level: number }[];
    themes: { kind: string; number: number }[];
    quizzes: { slug: string; account: string; quiz_type: string; questions: Q[]; expected_level: { arc_ord: number; scope: SpoilerScope | null } }[];
  };
  const seriesFiles = readdirSync(`${CONTRACTS}fixtures/series/`).filter((f) => f.endsWith('.json')).sort();
  const series = seriesFiles.map((f) => [f, JSON.parse(read(`${CONTRACTS}fixtures/series/${f}`)) as Series] as const);

  it('users.json is the list run.mts creates, in its order, with the same values', () => {
    const people = [...runMts.matchAll(/F\('([a-z_]+)', '([^']+)', '[^']*'(?:,\s*(\{[^}]*\}))?(?:, (false))?\)/g)];
    const mine = users.filter((u) => u.kind === 'user');
    expect(people.map((m) => m[1])).toEqual(mine.map((u) => u.key));
    people.forEach((m, i) => {
      const u = mine[i]!;
      expect(u.username).toBe(`o1_${u.key}`);
      expect(u.display_name).toBe(m[2]);
      expect(u.confirmed, u.key).toBe(m[4] !== 'false');
      if (!u.confirmed) { expect(u.profile).toBeNull(); return; }
      const lit = m[3] ?? '{}';
      for (const [k, val] of Object.entries(u.profile ?? {})) {
        if (k === 'banned_at') {
          const d = /banned_at: new Date\('([^']+)'\)\.toISOString\(\)/.exec(lit);
          expect(d && new Date(d[1]!).toISOString(), k).toBe(val);
        } else expect(lit, `${u.key}.${k}`).toContain(typeof val === 'string' ? `${k}: '${val}'` : `${k}: ${String(val)}`);
      }
      expect(Object.keys(u.profile ?? {}).length, u.key).toBe([...lit.matchAll(/(\w+): /g)].length);
    });
    const creators = users.filter((u) => u.kind === 'editorial');
    expect(creators.map((u) => u.key)).toEqual(Array.from({ length: 30 }, (_, i) => `creator_${String(i + 1).padStart(2, '0')}`));
    for (const u of creators) {
      expect(u.username).toBe(`oq_${u.key}`);
      expect(u.display_name).toBe(`OtakuQuiz Creator ${u.key.slice(-2)}`);
      expect(runMts).toContain(`bio: '${String(u.profile?.bio)}'`);
    }
    expect(runMts).toMatch(/for \(let i = 1; i <= 30; i\+\+\)/);
    expect(runMts).toContain("key: `creator_${n}`, username: `oq_creator_${n}`, display: `OtakuQuiz Creator ${n}`, kind: 'editorial'");
    const team = users.filter((u) => u.kind === 'system');
    expect(team.map((u) => [u.key, u.username, u.display_name])).toEqual([['otakuquiz_team', 'otakuquiz_team', 'OtakuQuiz Team']]);
    expect(runMts).toContain(`key: 'otakuquiz_team', username: 'otakuquiz_team', display: 'OtakuQuiz Team', kind: 'system'`);
    expect(runMts).toContain(`bio: '${String(team[0]!.profile?.bio)}'`);
    expect(users.map((u) => u.key)).toEqual([...mine, ...creators, ...team].map((u) => u.key));
    expect(runMts).toContain('`o1-fixture-${f.key.replace(/_/g, \'-\')}@example.com`');
  });

  it('every user is closed: kinds, sites, usernames, the BACKLOG 5.1 list', () => {
    const keys = users.map((u) => u.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(users.map((u) => u.username)).size).toBe(users.length);
    for (const k of ['kpop_only', 'kpop_heavy', 'dual', 'anime_new', 'banned', 'unconfirmed', 'admin_reviewer', 'creator_01', 'otakuquiz_team']) expect(keys).toContain(k);
    for (const u of users) {
      expect(['user', 'editorial', 'system'], u.key).toContain(u.kind);
      expect(u.username, u.key).toMatch(/^[a-z0-9_]{3,20}$/);
      for (const s of u.sites) expect(['kpop', 'anime'], u.key).toContain(s);
      if (u.kind !== 'user') expect(u.sites, u.key).toEqual(['anime']);
      expect(DASHES.test(JSON.stringify(u)) || EMOJI.test(JSON.stringify(u)), u.key).toBe(false);
    }
    const sitesOf = (k: string): string[] => users.find((u) => u.key === k)!.sites;
    expect(sitesOf('kpop_only')).toEqual(['kpop']);
    expect(sitesOf('dual')).toEqual(['kpop', 'anime']);
    expect(sitesOf('anime_new')).toEqual(['anime']);
    expect(sitesOf('unconfirmed')).toEqual([]);
  });

  it('the three series of BACKLOG 5.1 validate, and every key is a column of schema.sql', () => {
    expect(seriesFiles).toEqual(['death-note.json', 'one-piece.json', 'spy-x-family.json']);
    const cols = {
      series: allColumns(sql, 'public.series'), arcs: allColumns(sql, 'public.arcs'), characters: allColumns(sql, 'public.characters'),
      themes: allColumns(sql, 'public.series_themes'), group: allColumns(base, 'public.groups'),
    };
    expect(cols.arcs).toEqual(expect.arrayContaining(['episode_to', 'chapter_to', 'volume_to']));
    for (const [f, d] of series) {
      expect(validate('series-fixture.schema.json', d, reg), f).toEqual([]);
      expect(`${String(d.group.slug)}.json`).toBe(f);
      for (const k of Object.keys(d.group)) expect(cols.group, `${f} group.${k}`).toContain(k);
      for (const k of Object.keys(d.series)) expect(cols.series, `${f} series.${k}`).toContain(k);
      for (const [part, rows] of [['arcs', d.arcs], ['characters', d.characters], ['themes', d.themes]] as const) {
        for (const r of rows) for (const k of Object.keys(r)) expect(cols[part], `${f} ${part}.${k}`).toContain(k);
      }
      const raw = read(`${CONTRACTS}fixtures/series/${f}`);
      expect(DASHES.test(raw) || EMOJI.test(raw) || NAMING_TRAPS.test(raw), f).toBe(false);
    }
  });

  it('the series rows hold together: keys, arcs, accounts, Team sources, spoiler tags and expected levels', () => {
    const slugs = new Set<string>();
    const anime = new Set(users.filter((u) => u.sites.includes('anime') && u.username).map((u) => u.username!));
    const team = new Set(users.filter((u) => u.kind !== 'user').map((u) => u.username!));
    for (const [f, d] of series) {
      const ords = d.arcs.map((a) => a.ord);
      expect(ords, f).toEqual(ords.map((_, i) => i + 1));
      expect(new Set(d.characters.map((c) => c.slug)).size, f).toBe(d.characters.length);
      expect(new Set(d.themes.map((t) => `${t.kind}-${t.number}`)).size, f).toBe(d.themes.length);
      for (const c of d.characters) {
        expect(ords, `${f} ${c.slug}`).toContain(c.debut_arc_ord);
        expect(c.spoiler_level === 0 || ords.includes(c.spoiler_level), `${f} ${c.slug}`).toBe(true);
      }
      expect(new Set(d.quizzes.map((q) => q.quiz_type))).toEqual(new Set(['multiple_choice', 'true_false', 'guess_from_clues', 'intruder']));
      for (const q of d.quizzes) {
        expect(slugs.has(q.slug), q.slug).toBe(false);
        slugs.add(q.slug);
        expect(anime.has(q.account), `${q.slug} account`).toBe(true);
        expect(q.expected_level, q.slug).toEqual(spoilerLevelOf(q.questions));
        for (const [i, qq] of q.questions.entries()) {
          const where = `${q.slug} #${i + 1}`;
          expect(qq.spoiler.arc === 0 || ords.includes(qq.spoiler.arc), where).toBe(true);
          if (team.has(q.account)) expect(qq.source_url, where).toBeDefined();
          const text = [qq.question, qq.fun_fact ?? '', ...(qq.clues ?? []), ...(qq.options ?? []).map((o) => (typeof o === 'string' ? o : o.label))].join(' | ');
          for (const c of d.characters.filter((x) => x.spoiler_level > 0)) {
            if (new RegExp(`\\b${c.name}\\b`).test(text)) expect(qq.spoiler.arc, `${where} names ${c.name}`).toBeGreaterThanOrEqual(c.spoiler_level);
          }
        }
      }
    }
    expect(slugs.size).toBe(15);
  });

  it('a planted inconsistency is caught by the same rules', () => {
    const [, dn] = series[0]!;
    const q = structuredClone(dn.quizzes[3]!);
    q.questions[0]!.spoiler = { arc: 0, scope: 'both' };
    expect(spoilerLevelOf(q.questions)).toEqual({ arc_ord: 2, scope: 'both' });
    q.questions[1]!.spoiler = { arc: 0, scope: 'both' };
    expect(spoilerLevelOf(q.questions)).not.toEqual(q.expected_level);
    expect(spoilerLevelOf([{ spoiler: { arc: 1, scope: 'anime' } }, { spoiler: { arc: 3, scope: 'manga' } }])).toEqual({ arc_ord: 3, scope: 'manga' });
    const bad = structuredClone(dn) as unknown as Record<string, unknown>;
    (bad.characters as Record<string, unknown>[])[0]!.photo_url = 'https://example.org/x.png';
    expect(validate('series-fixture.schema.json', bad, reg).map((e) => e.message)).toContain('unknown property');
  });
});

describe('link allowlist (link-allowlist.md, link-allowlist.json)', () => {
  const md = read(`${CONTRACTS}link-allowlist.md`);
  type Row = { id: string; source: string; from: string[]; page: string | null; to: string[]; href: string; rel: string; query: boolean; maxPerPage?: number };
  const json = JSON.parse(read(`${CONTRACTS}link-allowlist.json`)) as { version: number; links: Row[]; domainText: Record<string, string[]> };
  const rows = tableRows(sectionText(md, '## 2. Rows'));

  it('the table and the JSON say the same thing, row by row', () => {
    expect(json.version).toBe(1);
    expect(rows.map((r) => r[0])).toEqual(json.links.map((l) => l.id));
    json.links.forEach((l, i) => {
      const r = rows[i]!;
      expect(r).toHaveLength(9);
      expect(r[1]!.split(', '), l.id).toEqual(l.from);
      expect(r[2], l.id).toBe(l.page ?? '(none yet)');
      expect(r[3]!.split(', '), l.id).toEqual(l.to);
      expect(r[4], l.id).toBe(l.href);
      expect(r[5], l.id).toBe(l.rel);
      expect(r[6], l.id).toBe(l.query ? 'yes' : 'no');
      expect(r[7], l.id).toBe(l.maxPerPage === undefined ? '(none)' : String(l.maxPerPage));
      expect(r[8], l.id).toBe(l.source);
    });
    expect(json.domainText).toEqual({ anime: ['kpop'], kpop: ['anime'] });
  });

  it('every row is closed: sites, cross-site targets, rel, no query, patterns', () => {
    for (const l of json.links) {
      for (const s of [...l.from, ...l.to]) expect(SITE_IDS as readonly string[], l.id).toContain(s);
      for (const s of l.to) expect(l.from, l.id).not.toContain(s);
      expect(['followed', 'nofollow'], l.id).toContain(l.rel);
      expect(l.query, l.id).toBe(false);
      expect(l.page === null || l.page === '*' || /^\/[a-z0-9/-]*(\/\*\*)?$/.test(l.page), l.id).toBe(true);
      expect(l.href, l.id).toMatch(/^\/([a-z0-9/-]*)(\/?\*\*)?$/);
    }
    const ids = json.links.map((l) => l.id);
    for (const id of ['footer', 'about-kpop', 'about-anime', 'team-article', 'network-page']) expect(ids).toContain(id);
    expect(json.links.find((l) => l.id === 'footer')).toMatchObject({ from: ['kpop', 'anime'], page: '*', to: ['hub'], maxPerPage: 1 });
    for (const f of ['link-allowlist.md', 'link-allowlist.json', 'formats.md', 'fixtures.md']) {
      const t = read(`${CONTRACTS}${f}`);
      expect(DASHES.test(t) || EMOJI.test(t) || NAMING_TRAPS.test(t), f).toBe(false);
    }
    for (const f of readdirSync(`${CONTRACTS}schemas/`)) {
      const t = read(`${CONTRACTS}schemas/${f}`);
      expect(DASHES.test(t) || EMOJI.test(t) || NAMING_TRAPS.test(t), f).toBe(false);
    }
  });
});
