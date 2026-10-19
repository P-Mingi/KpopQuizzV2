// Run O1, lane B2: the rules of check-site-scope.mts (pure functions, no file or git access).
//
// Rule unscoped-read: a Supabase read `.from('<scoped table>')...select(...)` whose chain is neither an argument of
// forSite(...) nor filtered with .eq/.in/.filter on 'site_id', and is not handed to forSite later through the variable
// it is assigned to. The scoped tables are those 002a gives a site_id column (schema.sql "@file 002a-site-columns").
// Rule kpopquiz-literal: the text "kpopquiz" in code (comments ignored); the registry (lib/site) holds the literals.
// A comment containing "site-scope:" with a reason, on the flagged line or the line above, marks a deliberate case
// (a cross-site read of the hub, for instance) and silences both rules there.

export type Rule = 'unscoped-read' | 'kpopquiz-literal';

export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly rule: Rule;
  readonly detail: string;
}

/** The tables that 002a gives a site_id column, read from the contract's "@file 002a-site-columns" section. */
export function scopedTables(schemaSql: string): string[] {
  const start = schemaSql.indexOf('-- @file 002a-site-columns');
  if (start < 0) throw new Error('schema.sql has no "@file 002a-site-columns" section');
  const next = schemaSql.indexOf('-- @file ', start + 10);
  const section = schemaSql.slice(start, next < 0 ? undefined : next);
  const tables = [...section.matchAll(/^alter table public\.([a-z_]+)\s+add column site_id\b/gm)].map((m) => m[1]!);
  if (tables.length === 0) throw new Error('no site_id column in the "@file 002a-site-columns" section');
  return tables;
}

/**
 * The source with every comment replaced by spaces (newlines kept, so offsets and line numbers stay). Strings and
 * template literals are kept as they are; a template's ${...} is scanned as code.
 */
export function stripComments(src: string): string {
  const out = src.split('');
  let i = 0;
  const templateDepth: number[] = [];
  let brace = 0;
  const blank = (from: number, to: number): void => {
    for (let k = from; k < to; k += 1) if (out[k] !== '\n') out[k] = ' ';
  };
  const skipString = (q: string): void => {
    i += 1;
    while (i < src.length && src[i] !== q && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
    i += 1;
  };
  const skipTemplate = (): void => {
    // i is just after the opening backtick or a closing brace of ${...}
    while (i < src.length) {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '`') { i += 1; return; }
      if (src[i] === '$' && src[i + 1] === '{') { i += 2; templateDepth.push(brace); brace += 1; return; }
      i += 1;
    }
  };
  while (i < src.length) {
    const c = src[i]!;
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      const end = src.indexOf('\n', i);
      const stop = end < 0 ? src.length : end;
      blank(i, stop);
      i = stop;
    } else if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      blank(i, stop);
      i = stop;
    } else if (c === '\'' || c === '"') {
      skipString(c);
    } else if (c === '`') {
      i += 1;
      skipTemplate();
    } else if (c === '{') {
      brace += 1;
      i += 1;
    } else if (c === '}') {
      brace -= 1;
      i += 1;
      if (templateDepth.length > 0 && templateDepth[templateDepth.length - 1] === brace) {
        templateDepth.pop();
        skipTemplate();
      }
    } else {
      i += 1;
    }
  }
  return out.join('');
}

function lineOf(text: string, offset: number): number {
  let n = 1;
  for (let k = 0; k < offset; k += 1) if (text.charCodeAt(k) === 10) n += 1;
  return n;
}

/** Skips a quoted string or template starting at `i` (forward), returns the index after it. */
function skipQuotedForward(code: string, i: number): number {
  const q = code[i]!;
  let k = i + 1;
  while (k < code.length && code[k] !== q) k += code[k] === '\\' ? 2 : 1;
  return k + 1;
}

/** The chain after `.from(...)`: up to `;` or `,` at depth 0, or the bracket that closes the enclosing one. */
function chainAfter(code: string, from: number): string {
  let depth = 0;
  let k = from;
  while (k < code.length) {
    const c = code[k]!;
    if (c === '\'' || c === '"' || c === '`') { k = skipQuotedForward(code, k); continue; }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break;
      depth -= 1;
    } else if ((c === ';' || c === ',') && depth === 0) break;
    k += 1;
  }
  return code.slice(from, k);
}

interface Before {
  /** The name of the call whose argument list holds the chain, nearest first (e.g. forSite, all). */
  readonly callers: string[];
  /** The text of the statement before the chain (for the variable it is assigned to). */
  readonly head: string;
}

/** Walks back from the `.from(` to the start of the statement, noting each call whose argument list we leave. */
function before(code: string, at: number): Before {
  let depth = 0;
  let k = at - 1;
  const callers: string[] = [];
  while (k >= 0) {
    const c = code[k]!;
    if (c === '\'' || c === '"' || c === '`') {
      // skip a string backwards
      let j = k - 1;
      while (j >= 0 && !(code[j] === c && code[j - 1] !== '\\')) j -= 1;
      k = j - 1;
      continue;
    }
    if (c === ')' || c === ']') depth += 1;
    else if (c === '(' || c === '[') {
      if (depth === 0) {
        if (c === '(') {
          const m = /([A-Za-z_$][\w$]*)\s*(<[^()]*>)?\s*$/.exec(code.slice(Math.max(0, k - 80), k));
          callers.push(m ? m[1]! : '');
        }
      } else depth -= 1;
    } else if ((c === ';' || c === '{' || c === '}') && depth === 0) break;
    k -= 1;
  }
  return { callers, head: code.slice(k + 1, at) };
}

const SITE_FILTER = /\.(eq|in|filter|neq)\(\s*['"`]site_id['"`]|\.match\(\s*\{[^}]*\bsite_id\b/;
const WRITE = /\.(insert|upsert|update|delete)\(/;
const SILENCE = /site-scope:\s*\S/;

function silenced(lines: readonly string[], line: number): boolean {
  return SILENCE.test(lines[line - 1] ?? '') || SILENCE.test(lines[line - 2] ?? '');
}

/**
 * The findings of one file. `added` is the set of line numbers that are new code (null: every line).
 * `rules` limits the rules checked (the caller excludes tests and lib/site from the literal rule).
 */
export function analyze(
  file: string,
  src: string,
  added: ReadonlySet<number> | null,
  tables: readonly string[],
  rules: ReadonlySet<Rule> = new Set<Rule>(['unscoped-read', 'kpopquiz-literal']),
): Finding[] {
  const code = stripComments(src);
  const lines = src.split('\n');
  const isNew = (line: number): boolean => added === null || added.has(line);
  const out: Finding[] = [];

  if (rules.has('unscoped-read')) {
    const scoped = new Set(tables);
    for (const m of code.matchAll(/\.from\(\s*(['"`])([A-Za-z_]+)\1\s*\)/g)) {
      const table = m[2]!;
      if (!scoped.has(table)) continue;
      const at = m.index;
      const line = lineOf(code, at);
      if (!isNew(line) || silenced(lines, line)) continue;
      const chain = chainAfter(code, at + m[0].length);
      if (!/\.select\(/.test(chain) || WRITE.test(chain)) continue; // not a read
      if (SITE_FILTER.test(chain)) continue;
      const b = before(code, at);
      if (b.callers.includes('forSite')) continue;
      const assigned = /(?:\b(?:const|let|var)\s+|^\s*)([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?[^=]*$/.exec(b.head);
      if (assigned) {
        const name = assigned[1]!;
        const rest = code.slice(at, at + 4000);
        const later = new RegExp(`forSite\\(\\s*${name}\\b|\\b${name}\\s*(\\.\\s*)?(eq|in|filter)\\(\\s*['"\`]site_id`);
        if (later.test(rest)) continue;
      }
      out.push({ file, line, rule: 'unscoped-read', detail: `read of scoped table ${table} without forSite or a site_id filter` });
    }
  }

  if (rules.has('kpopquiz-literal')) {
    const codeLines = code.split('\n');
    codeLines.forEach((text, idx) => {
      const line = idx + 1;
      if (!isNew(line) || !text.includes('kpopquiz') || silenced(lines, line)) return;
      out.push({ file, line, rule: 'kpopquiz-literal', detail: 'literal "kpopquiz" in code: take it from SITE (lib/site/registry.ts)' });
    });
  }

  return out.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
}

/** Added line numbers per file from `git diff --unified=0` output (paths as in the "+++ b/" lines). */
export function addedLines(diff: string): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  let current: Set<number> | null = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).trim();
      if (p === '/dev/null') { current = null; continue; }
      const path = p.startsWith('b/') ? p.slice(2) : p;
      current = out.get(path) ?? new Set<number>();
      out.set(path, current);
      continue;
    }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (h && current) {
      const start = Number(h[1]);
      const count = h[2] === undefined ? 1 : Number(h[2]);
      for (let k = 0; k < count; k += 1) current.add(start + k);
    }
  }
  return out;
}

/** Which rules apply to a repository path (null: the file is not checked at all). */
export function rulesFor(path: string): Set<Rule> | null {
  if (!/^apps\/quiz\/src\/.+\.(ts|tsx|js|jsx|mjs|mts)$/.test(path)) return null;
  if (/\.(test|spec)\.[a-z]+$/.test(path) || path.endsWith('.d.ts')) return null;
  const rules = new Set<Rule>(['unscoped-read']);
  if (!path.startsWith('apps/quiz/src/lib/site/') && !path.startsWith('apps/quiz/src/copy/kpop/')) rules.add('kpopquiz-literal');
  return rules;
}
