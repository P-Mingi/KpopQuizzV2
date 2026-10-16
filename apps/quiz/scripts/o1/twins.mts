// Run O1, rule 18 (owner, 16 October 2026): OtakuQuiz and FanQuiz are kpopquiz.org re-skinned, not a new design.
// Every anime and FanQuiz page imports the shared components of its kpop twin and never forks, copies or rewrites them.
//
//   tsx apps/quiz/scripts/o1/twins.mts --root <worktree> --twins <twins.json> [--json <out.json>]
//
// Called by scripts/o1/check.sh on every gate (O1's merged copy of this file, so a lane cannot weaken its judge).
// twins.json is F0's contract (docs/o1/contracts/twins.json):
//   {version, differenceCodes, pages: [{id, site, route, file, twin, mustImport: ["@/components/..."], renders,
//    allowed, owner, body, notes}]}
// Read here: id, site, route, file, twin, mustImport (renders, allowed, owner, body and notes are for D0 and R; F0's
// contract.test.ts checks them). `file` and `twin` may also be arrays (a row that covers several routes). Paths are
// relative to apps/quiz/src (the forms "apps/quiz/src/...", "src/..." and "@/..." are accepted too). `file: null` is a
// row with no file under app/sites (a shared route such as the OG images, or technical routes served elsewhere): it
// lists nothing, so a screen file for it under app/sites is unlisted; a missing `file` key is a contract error. A row
// whose `twin` is null or empty is a technical row (rows 27b and 37 of TWINS.md): its file must render nothing visible.
//
// Fails (exit 1) on:
//   (a) unlisted-page: a screen file under apps/quiz/src/app/sites/ that no row lists (an invented screen). Screen
//       files are Next's UI files: page, layout, template, not-found, error, global-error, loading, default,
//       forbidden, unauthorized, opengraph-image, twitter-image, icon, apple-icon (any of tsx ts jsx js mdx), outside
//       private `_folders`. Route handlers (route.ts) and metadata routes (sitemap, robots, manifest) render no screen
//       and need no row; when a row lists one, it is checked like any other.
//   (b) missing-import: a listed file that exists but does not import a module of its row's mustImport. Counted: a
//       static import with at least one value binding used in the file, an `export ... from`, a dynamic import() or a
//       require(); not counted: `import type`, a type-only binding, an unused binding, a side-effect-only import.
//       Reached directly, or through a module of the page's own folder (its directory and below), or as a dependency
//       of another mustImport module of the same row that the page reaches that way (hub.tsx renders hub-quizzes.tsx).
//       A wrapper module outside the page's folder does not count. mustimport-unresolved: a mustImport module that
//       does not exist in the tree under test (renamed or deleted).
//       exempt-renders: a technical row's file that contains JSX.
//   (c) copy: a block of code of a protected file found in another file. Protected, test files excepted: every code
//       file of apps/quiz/src/components/** (rule 18: components/ux-v1/** and the components of each area; the
//       contract's mustImport lists name only the top module of a row, so what it renders is protected this way),
//       every module named in any mustImport, every kpop twin file of a row (a `local` twin's body is page markup
//       that rule 18 moves into a shared component, never into a copy; TWINS.md section 1, column body), and the
//       modules of app/ outside app/sites that those reach (a twin's own page modules). Scanned: every code file of
//       apps/quiz/src/** and packages/*/src/** (protected files included, each against the others; of two protected
//       files the one the contract names is the original, else the later path is reported).
//       Normalization, per source line: comments and whitespace dropped (the TypeScript parser's tokens), import
//       declarations, `export ... from` and 'use client' or 'use server' directives dropped, every use of a name the
//       file declares (variables, parameters, destructured names, functions, classes, interfaces, type aliases,
//       enums, type parameters) replaced by `_` (member names stay: properties, JSX attributes, keys), string quotes
//       unified, JSX text whitespace collapsed.
//       Meaningful line: a line that keeps at least one token of information after that: an identifier the file does
//       not declare (an import, a property, a JSX attribute, an HTML tag), a string, number, template or regex
//       literal, or JSX text. Lines of punctuation, keywords, declared names only and closing JSX tags are not
//       meaningful (`return (`, `) : null}`, `{children}`, `</div>`, `_,`).
//       Threshold: a shingle is SHINGLE (8) consecutive meaningful lines; one shingle shared with a protected file is
//       a copy. So a copied block of 8 meaningful lines (about 10 to 15 source lines of JSX or logic) fails, renamed
//       locals and reformatted comments included, while ordinary imports (never compared) and short JSX patterns
//       (under 8 meaningful lines) pass. Measured on the base, 16 October 2026 (report Q0a, "Twins check"): at 6 and
//       7 the base already matched generic patterns an honest page can write (a schema.org FAQPage JSON-LD literal,
//       a quiz props interface, a choice button); at 8 every match on the base is a real kpop copy lineage.
//       Limit: an edit inside every 8 meaningful lines of a copy evades the check; R's review covers that case.
//       Baseline (q0a/twins-baseline.json, next to this script, Q0a's): every copy pair between two code files of the
//       base outside app/sites (kpop's own copy lineages: pt pages, admin routes, v0 ancestors of ux-v1), measured
//       all against all so it holds for any mustImport list, keyed by the unordered pair. A recorded pair passes while
//       its matched meaningful lines stay at or under the recorded count; any other pair, or a recorded pair that
//       grows, fails. Files of fewer than SHINGLE meaningful lines are guarded by (b) only.
// Exit 0: no violation. Exit 1: at least one violation. Exit 2: usage error or a twins.json that cannot be read.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const SHINGLE = 8;
export const SRC = 'apps/quiz/src';
export const SITES_DIR = 'apps/quiz/src/app/sites';
export const UXV1_DIR = 'apps/quiz/src/components/ux-v1';
export const COMPONENTS_DIR = 'apps/quiz/src/components';
const CODE_EXT = ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs', '.cts', '.cjs'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'out']);
const SCREEN_RE = /^(page|layout|template|not-found|error|global-error|loading|default|forbidden|unauthorized|opengraph-image|twitter-image|icon|apple-icon)\.(tsx|ts|jsx|js|mdx)$/;
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_BASELINE = path.join(HERE, 'q0a', 'twins-baseline.json');

export interface Row {
  id: string; site: string; route: string; files: string[]; twins: string[]; mustImport: string[]; exempt: boolean;
}
export interface Violation { kind: string; file: string; row?: string; detail: string }
export interface CopyPair { candidate: string; protected: string; lines: number; blocks: Array<[number, number, number, number]> }
export interface Baseline { note?: string; shingle: number; pairs: Array<{ files: [string, string]; lines: number }> }
const pairKey = (a: string, b: string): string => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
export interface Result {
  violations: Violation[]; known: CopyPair[]; pending: string[]; checked: string[];
  counts: { rows: number; screens: number; protected: number; scanned: number };
}

const posix = path.posix;
const toArr = (v: unknown): string[] => (Array.isArray(v) ? v : v === null || v === undefined || v === '' ? [] : [v]).filter((x): x is string => typeof x === 'string' && x.trim() !== '');

/** A path of twins.json, relative to the repository root. */
export function repoPath(p: string): string {
  let s = p.trim().replace(/^\.\//, '').replace(/^\/+/, '');
  if (s.startsWith('@/')) s = `${SRC}/${s.slice(2)}`;
  else if (s.startsWith('src/')) s = `apps/quiz/${s}`;
  else if (!s.startsWith('apps/') && !s.startsWith('packages/')) s = `${SRC}/${s}`;
  return posix.normalize(s);
}

export function loadTwins(json: unknown): { rows: Row[]; problems: string[] } {
  const problems: string[] = [];
  const pages = (json as { pages?: unknown } | null)?.pages;
  if (!Array.isArray(pages)) return { rows: [], problems: ['twins.json has no "pages" array'] };
  const rows: Row[] = [];
  pages.forEach((p: Record<string, unknown>, i: number) => {
    const id = String(p?.id ?? `#${i + 1}`);
    const files = toArr(p?.file ?? p?.files).map(repoPath);
    // An explicit `file: null` declares a route with no file under app/sites; a row without the key is a typo.
    const declaredNone = p !== null && typeof p === 'object' && (('file' in p && p.file === null) || ('files' in p && p.files === null));
    if (!files.length && !declaredNone) problems.push(`row ${id}: no "file"`);
    if (p?.mustImport !== undefined && !Array.isArray(p.mustImport)) problems.push(`row ${id}: "mustImport" is not an array`);
    const mustImport = toArr(p?.mustImport);
    const twins = toArr(p?.twin).map(repoPath);
    rows.push({ id, site: String(p?.site ?? ''), route: String(p?.route ?? ''), files, twins, mustImport, exempt: twins.length === 0 });
  });
  return { rows, problems };
}

const isFile = (abs: string): boolean => { try { return fs.statSync(abs).isFile(); } catch { return false; } };
const isCode = (rel: string): boolean => CODE_EXT.some((e) => rel.endsWith(e)) && !rel.endsWith('.d.ts');
const isTest = (rel: string): boolean => /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel) || rel.includes('/__tests__/') || rel.includes('/__mocks__/');

function tryFile(root: string, base: string): string | null {
  if (isFile(path.join(root, base)) && isCode(base)) return base;
  for (const e of CODE_EXT) if (isFile(path.join(root, base + e))) return base + e;
  for (const e of CODE_EXT) if (isFile(path.join(root, `${base}/index${e}`))) return `${base}/index${e}`;
  return null;
}

/** Resolves an import specifier of `fromRel` to a repository-relative file, or null (a package, or nothing there). */
export function resolveSpec(root: string, fromRel: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = `${SRC}/${spec.slice(2)}`;
  else if (spec === '@kpopquiz/shared') base = 'packages/shared/src';
  else if (spec.startsWith('@kpopquiz/shared/')) base = `packages/shared/src/${spec.slice('@kpopquiz/shared/'.length)}`;
  else if (spec.startsWith('.')) base = posix.join(posix.dirname(fromRel), spec);
  else return null;
  return tryFile(root, posix.normalize(base));
}

/** A module named by the contract (a specifier such as "@/components/ux-v1/panel", or a path). */
export function resolveContract(root: string, spec: string): string | null {
  if (spec.startsWith('@/') || spec.startsWith('@kpopquiz/')) return resolveSpec(root, `${SRC}/x.ts`, spec);
  return tryFile(root, repoPath(spec));
}

interface Imp { spec: string; counts: boolean }
interface Parsed { sf: ts.SourceFile; imports: Imp[]; hasJsx: boolean }

function scriptKind(rel: string): ts.ScriptKind {
  if (rel.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (rel.endsWith('.jsx') || rel.endsWith('.js') || rel.endsWith('.mjs') || rel.endsWith('.cjs')) return ts.ScriptKind.JSX;
  return ts.ScriptKind.TS;
}

export function parseSource(rel: string, text: string): ts.SourceFile {
  return ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, scriptKind(rel));
}

const isImportBindingName = (n: ts.Identifier): boolean => {
  const p = n.parent;
  return ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || (ts.isImportEqualsDeclaration(p) && p.name === n);
};
/** A name of a member (property, JSX attribute, key), never a variable of the file. */
const isMemberName = (n: ts.Node): boolean => {
  const p = n.parent;
  if (!p) return false;
  return (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n)
    || (ts.isJsxAttribute(p) && p.name === n) || (ts.isQualifiedName(p) && p.right === n)
    || (ts.isPropertySignature(p) && p.name === n) || (ts.isMethodDeclaration(p) && p.name === n)
    || (ts.isMethodSignature(p) && p.name === n) || (ts.isPropertyDeclaration(p) && p.name === n)
    || (ts.isGetAccessorDeclaration(p) && p.name === n) || (ts.isSetAccessorDeclaration(p) && p.name === n)
    || (ts.isEnumMember(p) && p.name === n) || (ts.isBindingElement(p) && p.propertyName === n)
    || (ts.isExportSpecifier(p) && p.propertyName === n) || (ts.isImportTypeNode(p) && p.qualifier === n);
};

/** Names the file refers to (an import used only in its own declaration is not a use). */
function referencedNames(sf: ts.SourceFile): Set<string> {
  const s = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && !isImportBindingName(n) && !isMemberName(n)) s.add(n.text);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return s;
}

export function importsOf(sf: ts.SourceFile): Imp[] {
  const refs = referencedNames(sf);
  const out: Imp[] = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const c = st.importClause;
      if (!c || c.isTypeOnly) { out.push({ spec: st.moduleSpecifier.text, counts: false }); continue; }
      const names: string[] = [];
      if (c.name) names.push(c.name.text);
      if (c.namedBindings) {
        if (ts.isNamespaceImport(c.namedBindings)) names.push(c.namedBindings.name.text);
        else for (const el of c.namedBindings.elements) if (!el.isTypeOnly) names.push(el.name.text);
      }
      out.push({ spec: st.moduleSpecifier.text, counts: names.some((n) => refs.has(n)) });
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
      const typeOnly = st.isTypeOnly || (!!st.exportClause && ts.isNamedExports(st.exportClause)
        && st.exportClause.elements.length > 0 && st.exportClause.elements.every((e) => e.isTypeOnly));
      out.push({ spec: st.moduleSpecifier.text, counts: !typeOnly });
    } else if (ts.isImportEqualsDeclaration(st) && ts.isExternalModuleReference(st.moduleReference)
      && ts.isStringLiteral(st.moduleReference.expression)) {
      out.push({ spec: st.moduleReference.expression.text, counts: !st.isTypeOnly && refs.has(st.name.text) });
    }
  }
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && n.arguments.length > 0) {
      const a = n.arguments[0]!;
      const dyn = n.expression.kind === ts.SyntaxKind.ImportKeyword;
      const req = ts.isIdentifier(n.expression) && n.expression.text === 'require';
      if ((dyn || req) && ts.isStringLiteralLike(a)) out.push({ spec: a.text, counts: true });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function containsJsx(sf: ts.SourceFile): boolean {
  let found = false;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) { found = true; return; }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

class Tree {
  readonly root: string;
  private cache = new Map<string, Parsed>();
  constructor(root: string) { this.root = root; }
  read(rel: string): string { return fs.readFileSync(path.join(this.root, rel), 'utf8'); }
  parsed(rel: string): Parsed {
    let p = this.cache.get(rel);
    if (!p) {
      const sf = parseSource(rel, this.read(rel));
      p = { sf, imports: importsOf(sf), hasJsx: containsJsx(sf) };
      this.cache.set(rel, p);
    }
    return p;
  }
  /** Files reached from `start` by counted imports; follows a module only when `follow` accepts it. */
  reach(start: string, follow: (rel: string) => boolean): Set<string> {
    const reached = new Set<string>();
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const f = queue.shift()!;
      for (const im of this.parsed(f).imports) {
        if (!im.counts) continue;
        const r = resolveSpec(this.root, f, im.spec);
        if (!r) continue;
        reached.add(r);
        if (!seen.has(r) && follow(r)) { seen.add(r); queue.push(r); }
      }
    }
    return reached;
  }
}

function walk(root: string, rel: string, out: string[]): string[] {
  let ents: fs.Dirent[];
  try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return out; }
  for (const e of ents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const r = posix.join(rel, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.next')) walk(root, r, out); } else if (e.isFile()) out.push(r);
  }
  return out;
}

export function screenFiles(root: string): string[] {
  return walk(root, SITES_DIR, []).filter((f) => SCREEN_RE.test(posix.basename(f))
    && !posix.relative(SITES_DIR, f).split('/').slice(0, -1).some((seg) => seg.startsWith('_')));
}

// ---------- (c) copies ----------

export interface NLine { line: number; text: string }

function declaredNames(sf: ts.SourceFile): Set<string> {
  const s = new Set<string>();
  const bind = (b: ts.BindingName): void => {
    if (ts.isIdentifier(b)) s.add(b.text);
    else for (const el of b.elements) if (!ts.isOmittedExpression(el)) bind(el.name);
  };
  const visit = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) || ts.isParameter(n)) bind(n.name);
    else if ((ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isClassDeclaration(n) || ts.isClassExpression(n)) && n.name) s.add(n.name.text);
    else if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isEnumDeclaration(n) || ts.isTypeParameterDeclaration(n)) s.add(n.name.text);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return s;
}

function inClosingTag(n: ts.Node): boolean {
  let p: ts.Node | undefined = n.parent;
  while (p && (ts.isPropertyAccessExpression(p) || ts.isIdentifier(p))) p = p.parent;
  return !!p && ts.isJsxClosingElement(p);
}

const INFO_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NoSubstitutionTemplateLiteral, ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail, ts.SyntaxKind.NumericLiteral, ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.RegularExpressionLiteral,
]);

/** The meaningful normalized lines of a source file (header of this file). */
export function normalizedLines(sf: ts.SourceFile): NLine[] {
  const declared = declaredNames(sf);
  const skip = new Set<ts.Node>();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) || ts.isImportEqualsDeclaration(st) || (ts.isExportDeclaration(st) && st.moduleSpecifier)) skip.add(st);
    else if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression) && /^use (client|server)$/.test(st.expression.text)) skip.add(st);
  }
  const lines = new Map<number, { parts: string[]; info: boolean }>();
  const text = sf.text;
  const emit = (n: ts.Node): void => {
    const k = n.kind;
    if (k === ts.SyntaxKind.EndOfFileToken || k === ts.SyntaxKind.JsxTextAllWhiteSpaces || k === ts.SyntaxKind.SyntaxList || n.end <= n.pos) return;
    let start = n.getStart(sf);
    let t: string;
    let info = false;
    if (k === ts.SyntaxKind.Identifier || k === ts.SyntaxKind.PrivateIdentifier) {
      const name = (n as ts.Identifier).text;
      t = declared.has(name) && !isMemberName(n) ? '_' : name;
      info = t !== '_' && !inClosingTag(n);
    } else if (k === ts.SyntaxKind.JsxText) {
      const raw = text.slice(n.pos, n.end);
      t = raw.replace(/\s+/g, ' ').trim();
      if (!t) return;
      start = n.pos + (raw.length - raw.trimStart().length);
      info = true;
    } else if (k === ts.SyntaxKind.StringLiteral) {
      t = JSON.stringify((n as ts.StringLiteral).text);
      info = true;
    } else {
      t = n.getText(sf);
      info = INFO_KINDS.has(k);
    }
    const line = sf.getLineAndCharacterOfPosition(start).line + 1;
    let rec = lines.get(line);
    if (!rec) { rec = { parts: [], info: false }; lines.set(line, rec); }
    rec.parts.push(t);
    if (info) rec.info = true;
  };
  const visit = (n: ts.Node): void => {
    if (skip.has(n)) return;
    if (n.kind >= ts.SyntaxKind.FirstJSDocNode && n.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const kids = n.getChildren(sf);
    if (kids.length === 0) { emit(n); return; }
    for (const c of kids) visit(c);
  };
  visit(sf);
  return [...lines.entries()].sort((a, b) => a[0] - b[0]).filter(([, r]) => r.info).map(([line, r]) => ({ line, text: r.parts.join(' ') }));
}

function shingles(lines: NLine[], k: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + k <= lines.length; i++) {
    out.push(crypto.createHash('sha1').update(lines.slice(i, i + k).map((l) => l.text).join('\n')).digest('hex'));
  }
  return out;
}

/** Copy pairs between protected files and scanned files: blocks [candStart, candEnd, protStart, protEnd] (source lines). */
export function findCopies(tree: Tree, protectedFiles: string[], scanned: string[], k: number, rank: (f: string) => number = () => 0): CopyPair[] {
  const norm = new Map<string, NLine[]>();
  const linesOf = (f: string): NLine[] => {
    let l = norm.get(f);
    if (!l) { l = normalizedLines(tree.parsed(f).sf); norm.set(f, l); }
    return l;
  };
  const index = new Map<string, Array<{ file: string; i: number }>>();
  for (const p of protectedFiles) {
    shingles(linesOf(p), k).forEach((h, i) => {
      let a = index.get(h);
      if (!a) { a = []; index.set(h, a); }
      a.push({ file: p, i });
    });
  }
  const isProt = new Set(protectedFiles);
  const pairs = new Map<string, { candidate: string; protected: string; hits: Array<[number, number]> }>();
  for (const f of scanned) {
    shingles(linesOf(f), k).forEach((h, j) => {
      for (const { file: p, i } of index.get(h) ?? []) {
        if (p === f) continue;
        // Two protected files: one pair; the candidate is the less protected one (higher rank), else the later path.
        if (isProt.has(f) && (rank(f) < rank(p) || (rank(f) === rank(p) && f < p))) continue;
        const key = `${f}\u0000${p}`;
        let rec = pairs.get(key);
        if (!rec) { rec = { candidate: f, protected: p, hits: [] }; pairs.set(key, rec); }
        rec.hits.push([j, i]);
      }
    });
  }
  const out: CopyPair[] = [];
  for (const rec of pairs.values()) {
    const cl = linesOf(rec.candidate);
    const pl = linesOf(rec.protected);
    const hits = rec.hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const blocks: Array<[number, number, number, number]> = [];
    const coveredC = new Set<number>();
    const coveredP = new Set<number>();
    let cur: [number, number, number, number] | null = null;
    for (const [j, i] of hits) {
      for (let x = 0; x < k; x++) { coveredC.add(j + x); coveredP.add(i + x); }
      if (cur && j <= cur[1] + 1 && i <= cur[3] + 1 && j - cur[0] === i - cur[2]) { cur[1] = j; cur[3] = i; continue; }
      if (cur) blocks.push(cur);
      cur = [j, j, i, i];
    }
    if (cur) blocks.push(cur);
    out.push({
      // The same size whichever file is the candidate (the baseline is keyed by the unordered pair).
      candidate: rec.candidate, protected: rec.protected, lines: Math.max(coveredC.size, coveredP.size),
      blocks: blocks.map(([j0, j1, i0, i1]) => [cl[j0]!.line, cl[j1 + k - 1]!.line, pl[i0]!.line, pl[i1 + k - 1]!.line]),
    });
  }
  return out.sort((a, b) => (a.candidate + a.protected < b.candidate + b.protected ? -1 : 1));
}

export function codeFiles(root: string): string[] {
  const out = walk(root, SRC, []);
  let pk: fs.Dirent[] = [];
  try { pk = fs.readdirSync(path.join(root, 'packages'), { withFileTypes: true }); } catch { /* no packages */ }
  for (const d of pk.filter((e) => e.isDirectory()).map((e) => e.name).sort()) walk(root, `packages/${d}/src`, out);
  return out.filter(isCode);
}

export function check(root: string, rows: Row[], opts: { shingle?: number; baseline?: Baseline | null } = {}): Result {
  const k = opts.shingle ?? SHINGLE;
  const tree = new Tree(root);
  const violations: Violation[] = [];
  const pending: string[] = [];
  const checked: string[] = [];

  // (a) every screen file under app/sites is listed.
  const listed = new Set(rows.flatMap((r) => r.files));
  const screens = screenFiles(root);
  for (const f of screens) {
    if (!listed.has(f)) violations.push({ kind: 'unlisted-page', file: f, detail: 'no row of twins.json lists this screen (rule 18: a screen without a kpop twin needs a CR approved in LEDGER.md)' });
  }

  // (b) imports of every listed file that exists.
  const mustTargets = new Set<string>();
  for (const r of rows) {
    const targets = r.mustImport.map((s) => ({ spec: s, file: resolveContract(root, s) }));
    for (const t of targets) if (t.file) mustTargets.add(t.file);
    for (const f of r.files) {
      if (!isFile(path.join(root, f))) { pending.push(`${r.id} ${f}`); continue; }
      if (!isCode(f)) continue;
      checked.push(`${r.id} ${f}`);
      if (r.exempt) {
        if (tree.parsed(f).hasJsx) violations.push({ kind: 'exempt-renders', file: f, row: r.id, detail: 'a technical row (no kpop twin) whose file renders JSX: a visible screen needs its twin row' });
        continue;
      }
      const own = `${posix.dirname(f)}/`;
      const direct = tree.reach(f, (x) => x.startsWith(own) && isCode(x));
      direct.add(f);
      const via = new Set<string>();
      for (const t of targets) {
        if (t.file && direct.has(t.file)) for (const x of tree.reach(t.file, isCode)) via.add(x);
      }
      for (const t of targets) {
        if (!t.file) { violations.push({ kind: 'mustimport-unresolved', file: f, row: r.id, detail: `${t.spec} does not resolve to a file in this tree` }); continue; }
        if (!direct.has(t.file) && !via.has(t.file)) {
          violations.push({ kind: 'missing-import', file: f, row: r.id, detail: `does not import ${t.spec} (directly or through a module of its own folder)` });
        }
      }
    }
  }

  // (c) copies of protected files. Rank 0: the ux-v1 kit, every mustImport module, every kpop twin file (the files
  // the contract names). Rank 1: the rest of components/** (rule 18: "the components of each area") and the modules
  // of app/ outside app/sites that a rank 0 file reaches (a twin's own page modules, such as group-quiz-page.tsx).
  // Test files are scanned, never protected.
  const all = codeFiles(root);
  const twinFiles = rows.flatMap((r) => r.twins).filter((t) => isFile(path.join(root, t)) && isCode(t) && !t.startsWith(`${SITES_DIR}/`));
  const named = new Set([...all.filter((f) => f.startsWith(`${UXV1_DIR}/`)), ...mustTargets, ...twinFiles].filter((f) => isCode(f) && !isTest(f)));
  const inApp = (f: string): boolean => f.startsWith(`${SRC}/app/`) && !f.startsWith(`${SITES_DIR}/`) && isCode(f);
  const wider = new Set(all.filter((f) => f.startsWith(`${COMPONENTS_DIR}/`) && !isTest(f)));
  for (const f of named) if (inApp(f)) for (const x of tree.reach(f, inApp)) if (inApp(x) && !isTest(x)) wider.add(x);
  for (const f of named) wider.delete(f);
  const prot = [...named, ...wider].sort();
  const rank = (f: string): number => (named.has(f) ? 0 : wider.has(f) ? 1 : 2);
  const base = new Map((opts.baseline?.shingle === k ? opts.baseline.pairs : []).map((p) => [pairKey(p.files[0], p.files[1]), p.lines]));
  const known: CopyPair[] = [];
  for (const c of findCopies(tree, prot, all, k, rank)) {
    const allowed = base.get(pairKey(c.candidate, c.protected));
    if (allowed !== undefined && c.lines <= allowed) { known.push(c); continue; }
    const where = c.blocks.map(([a, b, x, y]) => `${a}-${b} (from ${x}-${y})`).join(', ');
    // Two components of the same rank: which one is the original is not known from the tree alone.
    const verb = rank(c.candidate) === rank(c.protected) ? 'shares a block with' : 'copies';
    violations.push({
      kind: 'copy', file: c.candidate,
      detail: `${verb} ${c.protected}: ${c.lines} meaningful lines at ${where}${allowed !== undefined ? ` (base had ${allowed})` : ''}; import the shared component, or ask its owner for a prop`,
    });
  }

  const order = (v: Violation): string => `${v.kind}\u0000${v.file}\u0000${v.row ?? ''}\u0000${v.detail}`;
  violations.sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0));
  return { violations, known, pending: pending.sort(), checked: checked.sort(), counts: { rows: rows.length, screens: screens.length, protected: prot.length, scanned: all.length } };
}

/** Q0a only, from a base tree: every copy pair between two code files outside app/sites (a superset of what any
 *  twins.json can protect, so the baseline does not depend on F0's mustImport lists). The gate never runs this. */
export function measureBaseline(root: string, k: number, note: string): Baseline {
  const all = codeFiles(root).filter((f) => !f.startsWith(`${SITES_DIR}/`));
  const pairs = findCopies(new Tree(root), all, all, k)
    .map((c) => ({ files: [c.candidate, c.protected].sort() as [string, string], lines: c.lines }))
    .sort((a, b) => (pairKey(...a.files) < pairKey(...b.files) ? -1 : 1));
  return { note, shingle: k, pairs };
}

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

export function main(argv: string[]): number {
  const root = arg(argv, '--root');
  const twinsPath = arg(argv, '--twins');
  if (!root || !twinsPath) { console.error('usage: twins.mts --root <worktree> --twins <twins.json> [--json <out.json>] [--baseline <file>] [--shingle <n>] [--write-baseline <out> --note <text>]'); return 2; }
  if (!fs.existsSync(path.join(root, SRC))) { console.error(`twins: ${root} has no ${SRC}`); return 2; }
  let json: unknown;
  try { json = JSON.parse(fs.readFileSync(twinsPath, 'utf8')); } catch (e) { console.error(`twins: cannot read ${twinsPath}: ${(e as Error).message}`); return 2; }
  const { rows, problems } = loadTwins(json);
  if (problems.length) { for (const p of problems) console.error(`twins: contract: ${p}`); return 2; }
  const blPath = arg(argv, '--baseline') ?? DEFAULT_BASELINE;
  let baseline: Baseline | null = null;
  if (fs.existsSync(blPath)) {
    try { baseline = JSON.parse(fs.readFileSync(blPath, 'utf8')) as Baseline; } catch (e) { console.error(`twins: cannot read baseline ${blPath}: ${(e as Error).message}`); return 2; }
  }
  const sh = arg(argv, '--shingle');
  const k = sh ? Number(sh) : SHINGLE;
  if (!Number.isInteger(k) || k < 2) { console.error('twins: --shingle must be an integer of at least 2'); return 2; }
  const wb = arg(argv, '--write-baseline');
  if (wb) {
    const b = measureBaseline(root, k, arg(argv, '--note') ?? '');
    fs.writeFileSync(wb, `${JSON.stringify(b, null, 2)}\n`);
    console.log(`twins: baseline of ${b.pairs.length} pairs at shingle ${k} written to ${wb}`);
    return 0;
  }
  const res = check(root, rows, { shingle: k, baseline });
  const out = arg(argv, '--json');
  if (out) fs.writeFileSync(out, `${JSON.stringify({ shingle: k, ...res }, null, 2)}\n`);
  console.log(`twins: ${res.counts.rows} rows, ${res.counts.screens} screen files under app/sites, ${res.checked.length} listed files checked, ${res.pending.length} not built yet; copies: ${res.counts.protected} protected files against ${res.counts.scanned} files, shingle ${k} meaningful lines, ${res.known.length} base pairs within their recorded size`);
  for (const v of res.violations) console.log(`FAIL ${v.kind} ${v.file}${v.row ? ` (row ${v.row})` : ''}: ${v.detail}`);
  console.log(res.violations.length ? `twins: FAIL (${res.violations.length} violation${res.violations.length > 1 ? 's' : ''})` : 'twins: ok');
  return res.violations.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
