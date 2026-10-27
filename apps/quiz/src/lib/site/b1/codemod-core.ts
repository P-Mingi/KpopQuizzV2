// Run O1, lane B1. The pure part of the brand codemod (apps/quiz/scripts/o1/b1/codemod.mts): applying
// a literal-for-registry rule to a file's text, idempotently, and the helpers the runner and its test
// share. No fs, no git: the runner reads the files.

/** One literal replaced by a registry read. `from` and `to` are exact strings; every occurrence changes. */
export interface Edit {
  readonly from: string;
  readonly to: string;
}

/** The edits of one file, and the import lines they need (added once, after the last value import). */
export interface FileRule {
  /** Path from the repo root. */
  readonly file: string;
  readonly edits: readonly Edit[];
  readonly imports?: readonly string[];
  /** Why the rule exists or what it waits for; printed by the runner. */
  readonly note?: string;
}

export interface RuleResult {
  readonly text: string;
  /** Edits that changed the text. */
  readonly applied: number;
  /** Edits already in place (a re-run). */
  readonly already: number;
  /** Edits whose `from` and `to` are both absent: the file moved on, the rule is stale. */
  readonly missing: readonly string[];
  readonly importsAdded: number;
}

const IMPORT_RE = /^import\b[^;]*;[ \t]*$/gm;

/** True for a module specifier of the app itself ('@/...' or relative), false for a package. */
const isInternal = (statement: string): boolean => /from\s+['"](?:@\/|\.)/.test(statement);

/**
 * Where an import goes in a file that has none: after the directive and the opening comment block, so a
 * file header stays on top. Returns the offset and the text to put there.
 */
function firstImportSpot(text: string): number {
  let at = 0;
  const directive = /^\s*(['"]use (?:client|server)['"];?[ \t]*\n)/.exec(text);
  if (directive) at = directive[0].length;
  const rest = text.slice(at);
  const lead = /^\s*/.exec(rest)![0].length;
  let i = at + lead;
  if (text.startsWith('//', i)) {
    while (text.startsWith('//', i)) { const nl = text.indexOf('\n', i); if (nl < 0) { i = text.length; break; } i = nl + 1; }
    return i;
  }
  if (text.startsWith('/*', i)) {
    const end = text.indexOf('*/', i);
    if (end >= 0) { const nl = text.indexOf('\n', end); return nl < 0 ? text.length : nl + 1; }
  }
  return directive ? at + lead : 0;
}

/** Adds each import line that is not already present: after the last value import, apart from packages. */
export function insertImports(text: string, lines: readonly string[]): { text: string; added: number } {
  let out = text;
  let added = 0;
  for (const line of lines) {
    if (out.includes(line)) continue;
    const found = [...out.matchAll(IMPORT_RE)];
    const values = found.filter((m) => !/^import\s+type\b/.test(m[0]));
    const anchor = values.length > 0 ? values[values.length - 1]! : null;
    if (anchor) {
      const end = anchor.index! + anchor[0].length;
      // Packages first, then a blank line, then the app's own modules.
      const gap = isInternal(line) && !isInternal(anchor[0]) ? '\n\n' : '\n';
      out = `${out.slice(0, end)}${gap}${line}${out.slice(end)}`;
    } else if (found.length > 0) {
      // Only type imports: the value import goes first, a blank line apart from them.
      const start = found[0]!.index!;
      out = `${out.slice(0, start)}${line}\n\n${out.slice(start)}`;
    } else {
      const at = firstImportSpot(out);
      const before = out.slice(0, at);
      const sep = before.length === 0 || before.endsWith('\n\n') ? '' : '\n';
      out = `${before}${sep}${line}\n\n${out.slice(at).replace(/^\n+/, '')}`;
    }
    added++;
  }
  return { text: out, added };
}

/** Applies a rule. Re-running it on its own output changes nothing. */
export function applyRule(text: string, rule: FileRule): RuleResult {
  let out = text;
  let applied = 0;
  let already = 0;
  const missing: string[] = [];
  for (const e of rule.edits) {
    if (out.includes(e.from)) {
      // `to` may contain `from` (a wrap): the edit is in place when `to` is there.
      if (e.to.includes(e.from) && out.includes(e.to)) { already++; continue; }
      out = out.split(e.from).join(e.to);
      applied++;
    } else if (out.includes(e.to)) already++;
    else missing.push(e.from);
  }
  let importsAdded = 0;
  if (rule.imports && (applied > 0 || already > 0)) {
    const r = insertImports(out, rule.imports);
    out = r.text;
    importsAdded = r.added;
  }
  return { text: out, applied, already, missing, importsAdded };
}

/** Occurrences of the two brand literals in a text. */
export const BRAND_LITERAL_RE = /kpopquiz\.org|KpopQuiz/g;

export function countBrandLiterals(text: string): number {
  return (text.match(BRAND_LITERAL_RE) ?? []).length;
}

/** The files named by HOT.txt (first column, comment lines skipped). */
export function parseHot(text: string): Set<string> {
  const out = new Set<string>();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const file = line.split('\t')[0]!.trim();
    if (file) out.add(file);
  }
  return out;
}

/**
 * The glob dialect of scripts/o1-owner-guard.mjs: `**` any depth (zero directories too), `*` anything but a
 * slash, `?` one char but a slash, `{a,b}` alternatives; `[ ] ( )` are literal; a leading `!` excludes.
 */
export function globToRegExp(glob: string): RegExp {
  let s = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') { i++; s += '(?:.*/)?'; } else s += '.*';
      } else s += '[^/]*';
    } else if (c === '?') s += '[^/]';
    else if (c === '{') {
      const j = glob.indexOf('}', i);
      s += `(?:${glob.slice(i + 1, j).split(',').map(escape).join('|')})`;
      i = j;
    } else s += escape(c);
  }
  return new RegExp(`^${s}$`);
}

function escape(text: string): string {
  return text.replace(/[.+^$|\\()[\]]/g, '\\$&');
}

/** True when `file` matches a positive glob of `globs` and no `!` glob. */
export function ownedBy(globs: readonly string[], file: string): boolean {
  let yes = false;
  for (const g of globs) {
    if (g.startsWith('!')) { if (globToRegExp(g.slice(1)).test(file)) return false; } else if (globToRegExp(g).test(file)) yes = true;
  }
  return yes;
}
