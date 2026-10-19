#!/usr/bin/env node
// Run O1, lot (a) (owner, 2026-10-19): copy every kpop page of docs/o1/contracts/twins.json to its anime twin under
// apps/quiz/src/app/sites/[site]/, keep the kpop components (relative imports point back at the kpop modules: reuse,
// never a second copy), and apply the vocabulary table to visible text only (JSX text and string literals that read
// as copy or as a public path; never table names, API paths, class names, imports or identifiers).
//   node scripts/o1/twins-codemod.mjs [--dry-run] [--force]
// Targets that serve anime and hub from two different kpop pages (the site home) are listed, not written: they get a
// small hand-written dispatcher. A target already present is kept unless --force.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const O1 = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const require = createRequire(path.join(O1, 'apps/quiz/package.json'));
const ts = require('typescript');
const dry = process.argv.includes('--dry-run'); const force = process.argv.includes('--force');
const twins = JSON.parse(fs.readFileSync(path.join(O1, 'docs/o1/contracts/twins.json'), 'utf8'));

// Vocabulary (registry vocabulary of the anime entry, as plain text rules). Order matters: longest first.
const ANIME = [
  ['K-pop groups', 'anime series'], ['K-pop group', 'anime series'], ['K-pop idols', 'anime characters'],
  ['K-pop fans', 'anime fans'], ['K-pop', 'anime'], ['k-pop', 'anime'], ['KPOP', 'ANIME'],
  ['kpopquiz.org', 'otakuquiz.org'], ['KpopQuiz', 'OtakuQuiz'], ['Kpop', 'Anime'],
  ['groups', 'series'], ['Groups', 'Series'], ['group', 'series'], ['Group', 'Series'],
  ['members', 'characters'], ['Members', 'Characters'], ['member', 'character'], ['Member', 'Character'],
  ['idols', 'characters'], ['Idols', 'Characters'], ['idol', 'character'], ['Idol', 'Character'],
  ['biases', 'oshis'], ['Biases', 'Oshis'], ['bias', 'oshi'], ['Bias', 'Oshi'],
  ['comeback', 'new season'], ['Comeback', 'New season'],
];
const word = (s) => new RegExp(`(?<![A-Za-z0-9_-])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_])`, 'g');
const RULES = ANIME.map(([a, b]) => [word(a), b]);
const vocab = (text) => RULES.reduce((t, [re, b]) => t.replace(re, b), text);

const DATA_CALLS = new Set(['from', 'rpc', 'select', 'eq', 'neq', 'in', 'order', 'is', 'or', 'filter', 'match', 'ilike',
  'like', 'contains', 'gte', 'lte', 'gt', 'lt', 'not', 'upsert', 'insert', 'update', 'delete', 'channel', 'on', 'get',
  'set', 'has', 'getItem', 'setItem', 'cookies', 'header', 'headers', 'searchParams', 'startsWith', 'endsWith',
  'includes', 'split', 'replace', 'test', 'match', 'revalidateTag', 'revalidatePath', 'unstable_cache', 'cache']);
const SKIP_ATTRS = new Set(['className', 'key', 'id', 'name', 'type', 'role', 'rel', 'as', 'data-testid', 'precedence']);

function readsAsCopy(s) {
  if (!/[A-Za-z]/.test(s)) return false;
  if (s.startsWith('/api/') || s.startsWith('@/') || s.startsWith('./') || s.startsWith('../')) return false;
  if (s.startsWith('/')) return true;                              // a public path (/groups to /series)
  if (/^[a-z0-9_.:-]+$/.test(s)) return false;                     // identifier-like: table, slug, key, enum
  return /\s/.test(s) || /^[A-Z]/.test(s);                        // a phrase or a capitalised word
}
function skipNode(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isImportTypeNode?.(p)) return true;
    if (ts.isJsxAttribute(p)) return SKIP_ATTRS.has(p.name.getText());
    if (ts.isCallExpression(p)) {
      const e = p.expression;
      const name = ts.isPropertyAccessExpression(e) ? e.name.text : ts.isIdentifier(e) ? e.text : '';
      if (DATA_CALLS.has(name)) return true;
    }
    if (ts.isElementAccessExpression(p) || ts.isPropertyAssignment(p) && p.name === node) return true;
  }
  return false;
}

function transform(src, file, twinFile, applyVocab) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const twinDir = path.dirname(twinFile);
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const abs = path.resolve(twinDir, spec); const rel = path.relative(path.join(O1, 'apps/quiz/src'), abs);
        edits.push([node.moduleSpecifier.getStart(sf) + 1, node.moduleSpecifier.end - 1, '@/' + rel]);
      }
    } else if (applyVocab && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node)
      || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) && readsAsCopy(node.text) && !skipNode(node)) {
      const out = vocab(node.text);
      if (out !== node.text) {
        const raw = node.getText(sf); const q = raw[0];
        const head = ts.isTemplateHead(node) || ts.isTemplateMiddle(node) ? (ts.isTemplateHead(node) ? '`' : '}') : q;
        const tail = ts.isTemplateHead(node) || ts.isTemplateMiddle(node) ? '${' : (ts.isTemplateTail(node) ? '`' : q);
        edits.push([node.getStart(sf), node.end, head + raw.slice(head.length, raw.length - tail.length).split(node.text).join(out) + tail]);
      }
    } else if (applyVocab && ts.isJsxText(node) && /[A-Za-z]/.test(node.text)) {
      const out = vocab(node.text); if (out !== node.text) edits.push([node.getStart(sf), node.end, out]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  edits.sort((a, b) => b[0] - a[0]);
  let out = src; for (const [s, e, t] of edits) out = out.slice(0, s) + t + out.slice(e);
  return { out, edits: edits.length };
}

const PAGE_NAMES = new Set(['page.tsx', 'page.ts', 'route.ts', 'route.tsx', 'layout.tsx', 'not-found.tsx']);
const byTarget = new Map();
for (const r of twins.pages) {
  if (!r.file || !r.twin) continue;
  const twin = Array.isArray(r.twin) ? r.twin[0] : r.twin;
  const t = byTarget.get(r.file) || { sites: new Set(), twins: new Set(), rows: [] };
  t.sites.add(r.site); t.twins.add(PAGE_NAMES.has(path.basename(twin)) ? twin : path.join(path.dirname(twin), 'page.tsx')); t.rows.push(r.id);
  byTarget.set(r.file, t);
}
let written = 0; const listed = [];
for (const [file, t] of byTarget) {
  const twinsList = [...t.twins];
  const sameForBoth = t.sites.size === 2 && twinsList.length === 1;
  if (t.sites.size === 2 && !sameForBoth) { listed.push(`${file} (rows ${t.rows.join(', ')}): two twins, hand-written dispatcher`); continue; }
  const twin = twinsList[0];
  const target = path.join(O1, file);
  if (fs.existsSync(target) && !force) { listed.push(`${file}: kept (exists)`); continue; }
  const src = fs.readFileSync(path.join(O1, twin), 'utf8');
  // Vocabulary only on anime-only targets; a file shared by anime and hub stays neutral (registry copy keys later).
  const { out, edits } = transform(src, target, path.join(O1, twin), !sameForBoth && t.sites.has('anime'));
  const header = `// Run O1 twin (rule 18) of ${twin}, rows ${t.rows.join(', ')}: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.\n`;
  if (!dry) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, header + out); }
  written++; console.log(`${dry ? 'would write' : 'wrote'} ${file} <- ${twin} (${edits} edits)`);
}
for (const l of listed) console.log(`skipped ${l}`);
console.log(`twins-codemod: ${written} file(s), ${listed.length} skipped`);
