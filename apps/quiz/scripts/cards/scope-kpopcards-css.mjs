#!/usr/bin/env node
// KpopCards (lots 3 to 5): lifts the CSS of the validated prototype docs/design/cards/kpopcards-prototype-v6.html into
// src/styles/cards/kpopcards.css, every rule scoped under .bvc (the Cards root) so no other page of the hub is touched.
// The prototype is the single reference: values are copied, never retyped. Run once; later fixes are made on the output by hand.
//   node scripts/cards/scope-kpopcards-css.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../../../docs/design/cards/kpopcards-prototype-v6.html');
const out = resolve(here, '../../src/styles/cards/kpopcards.css');
const html = readFileSync(src, 'utf8');
const a = html.indexOf('<style>\n/* Light only');
const b = html.indexOf('</style>', a);
let css = html.slice(a + 8, b);

// Tokenize into top-level blocks.
function* blocks(s) {
  let i = 0;
  while (i < s.length) {
    // skip whitespace and comments (kept as is)
    const m = /^\s*/.exec(s.slice(i));
    i += m[0].length;
    if (i >= s.length) return;
    if (s.startsWith('/*', i)) { const e = s.indexOf('*/', i) + 2; yield { comment: s.slice(i, e) }; i = e; continue; }
    // read prelude to '{' or ';'
    let j = i, depthP = 0, q = '';
    while (j < s.length) {
      const c = s[j];
      if (q) { if (c === q) q = ''; } else if (c === '"' || c === "'") q = c; else if (c === '(') depthP++; else if (c === ')') depthP--; else if ((c === '{' || c === ';') && depthP === 0) break;
      j++;
    }
    const prelude = s.slice(i, j).trim();
    if (s[j] === ';') { yield { prelude, body: null }; i = j + 1; continue; }
    // find matching }
    let d = 1, k = j + 1; q = '';
    while (k < s.length && d > 0) {
      const c = s[k];
      if (q) { if (c === q) q = ''; } else if (c === '"' || c === "'") q = c; else if (c === '/' && s[k + 1] === '*') { k = s.indexOf('*/', k) + 1; } else if (c === '{') d++; else if (c === '}') d--;
      k++;
    }
    yield { prelude, body: s.slice(j + 1, k - 1) };
    i = k;
  }
}

function splitList(sel) {
  const parts = []; let d = 0, cur = '', q = '';
  for (const c of sel) {
    if (q) { cur += c; if (c === q) q = ''; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(' || c === '[') d++; if (c === ')' || c === ']') d--;
    if (c === ',' && d === 0) { parts.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

const ROOT = '.bvc';
function scopeOne(s) {
  if (/^::view-transition/.test(s)) return null;
  if (s === ':root' || s === 'html' || s === 'body' || s === 'html,body') return ROOT;
  let m;
  // A state class of the page (html.rm: reduced motion; html.ovopen: an opening is up) stays on <html>, as agent C's opening sets it.
  if ((m = /^html((?:\.[\w-]+)+)(.*)$/.exec(s))) return `html${m[1]} ${ROOT}${m[2]}`.replace(/(\s)main(?![\w-])/g, '$1.kc-main');
  if ((m = /^html(\s.*)$/.exec(s))) return `${ROOT}${m[1]}`;
  if ((m = /^body(\s.*)$/.exec(s))) return `${ROOT}${m[1]}`;
  if (s === '*' || s === '*::before' || s === '*::after') return `${ROOT} ${s}`;
  return `${ROOT} ${s}`.replace(/(\s)main(?![\w-])/g, '$1.kc-main');
}
// The rules of the opening of a pack (the .ov overlay, the pack tearing, the pile, the fan, the 25-card grid, the stage effects) are agent C's: they live in
// src/styles/cards/cards-opening.css, so they are left out here and the two files never fight.
const OPENING = /(\.ov\b|\.ov-|#fx|\.tearzone|\.cutline|\.opening\b|\.burst|\.pile\b|\.rc\b|\.rc-|\.rlabel|\.rtag|\.pulled|\.fan\b|\.fc\b|\.fc-|\.totals|\.tot\b|\.flyer|\.stagefx|\.stamp|\.mpacks|\.mp\b|\.mgrid|\.mc\b|\.mc-|\.mc\.|\.finish|\.gainf|\.gainp|\.top-part|\.main-part|\.ovopen)/;
function scopeSelector(sel) {
  const l = splitList(sel).filter((x) => !OPENING.test(x)).map(scopeOne).filter(Boolean);
  return l.length ? l.join(',') : null;
}

const kf = new Set();
for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) kf.add(m[1]);
const PFX = 'kc-';
function renameAnim(decls) {
  return decls.replace(/(animation(?:-name)?\s*:)([^;}]*)/g, (all, p, v) => p + v.replace(/[A-Za-z_][\w-]*/g, (w) => (kf.has(w) ? PFX + w : w)));
}

function emit(s, indent = '') {
  let o = '';
  for (const blk of blocks(s)) {
    if (blk.comment) { o += indent + blk.comment + '\n'; continue; }
    const { prelude, body } = blk;
    if (body === null) { o += `${indent}${prelude};\n`; continue; }
    if (/^@keyframes/.test(prelude)) { o += `${indent}@keyframes ${PFX}${prelude.replace(/^@keyframes\s+/, '')}{${body.trim()}}\n`; continue; }
    if (/^@(property|font-face)/.test(prelude)) { o += `${indent}${prelude}{${body.trim()}}\n`; continue; }
    if (/^@(media|supports|container)/.test(prelude)) { o += `${indent}${prelude}{\n${emit(body, indent + '  ')}${indent}}\n`; continue; }
    if (/^@/.test(prelude)) { o += `${indent}${prelude}{${body}}\n`; continue; }
    const sel = scopeSelector(prelude);
    if (!sel) continue;
    o += `${indent}${sel}{${renameAnim(body.trim())}}\n`;
  }
  return o;
}

let body = emit(css);
// The prototype's own font stacks: the Cards layout loads the faces through next/font (variables on .bvc), so the token block keeps those.
body = body.replace(/\s*--f-ui:[^;]+;/, '').replace(/\s*--f-card:[^;]+;/, '').replace(/\s*--f-mono:[^;]+;/, '');
const head = `/* KpopCards: the CSS of the validated prototype v6 (docs/design/cards/kpopcards-prototype-v6.html), lifted by scripts/cards/scope-kpopcards-css.mjs with every
   rule scoped under .bvc and the keyframes named kc-*. Values are the prototype's: change one only to fix a measured gap, and say why in the commit.
   Fonts: the three faces come from the Cards layout (cards-tokens.css, next/font), not from the prototype's Google Fonts link. */
.bvc [hidden]:not([hidden=until-found i]){display:none!important}
.bvc img{max-width:100%}
`;
const text = head + body;
if (process.argv.includes('--check')) { console.log(text.length, 'bytes'); process.exit(0); }
writeFileSync(out, text);
console.log('wrote', out, text.length);
