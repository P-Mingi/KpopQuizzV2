const fs = require('fs'), path = require('path'), zlib = require('zlib');
const postcss = require(path.resolve('node_modules/postcss'));
const SRC = path.resolve('src');
const file = path.join(SRC, 'styles/globals.css');
const css = fs.readFileSync(file, 'utf8');
// corpus: every text file of the app except globals.css, plus public/ html/js
const parts = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|mts|cts|jsx?|mjs|css|json|html|md|mdx|svg|txt)$/.test(e.name) && p !== file) parts.push(fs.readFileSync(p, 'utf8'));
  }
})(SRC);
(function walk(d) { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(html|js|svg)$/.test(e.name)) parts.push(fs.readFileSync(p, 'utf8')); } })(path.resolve('public'));
const corpus = parts.join('\n');
const isDead = (c) => {
  if (corpus.includes(c)) return false;
  // dynamic composition: `prefix-${...}` or 'prefix-' + x : keep when any prefix of the class (cut at a dash) is built dynamically
  for (let i = c.indexOf('-'); i !== -1; i = c.indexOf('-', i + 1)) {
    const pre = c.slice(0, i + 1);
    if (corpus.includes(pre + '${') || corpus.includes("'" + pre + "' +") || corpus.includes('"' + pre + '" +') || corpus.includes('`' + pre + '`')) return false;
  }
  return true;
};
const root = postcss.parse(css);
let removedRules = 0, removedBytes = 0;
const classRe = /\.(-?[_a-zA-Z][\w-]*)/g;
root.walkRules((rule) => {
  if (rule.parent && rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
  const keep = rule.selectors.filter((sel) => {
    const noStrings = sel.replace(/\[[^\]]*\]/g, '');
    const cls = [...noStrings.matchAll(classRe)].map((m) => m[1]);
    return !cls.some(isDead);
  });
  if (keep.length === rule.selectors.length) return;
  removedBytes += rule.toString().length;
  if (keep.length === 0) { rule.remove(); removedRules++; } else rule.selectors = keep;
});
root.walkAtRules((a) => { if (a.nodes && a.nodes.length === 0 && /media|supports|layer/.test(a.name)) a.remove(); });
const out = root.toString();
console.log('rules removed', removedRules, 'source bytes', css.length, '->', out.length, 'gzip', zlib.gzipSync(css).length, '->', zlib.gzipSync(out).length, 'brotli', zlib.brotliCompressSync(css).length, '->', zlib.brotliCompressSync(out).length);
fs.writeFileSync(process.argv[2], out);
