#!/usr/bin/env node
// C3: where does each /q/ (or any) link of a page sit in the server HTML, flag on vs flag off?
// For every href matching --match, counts its occurrences as a visible <a> (outside <noscript>,
// <template>, <script>) and inside <noscript>. Read only (GET).
//   node link-detail.mjs --on http://localhost:3021 --off http://localhost:4203 --match '^/q/' /blackpink-quiz ...
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const ON = opt('--on', 'http://localhost:3021');
const OFF = opt('--off', 'http://localhost:4203');
const MATCH = new RegExp(opt('--match', '^/q/'));
const pages = args;

function split(html) {
  const noscript = [...html.matchAll(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gi)].map((m) => m[1]).join(' ');
  const visible = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ').replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<template\b[\s\S]*?<\/template>/gi, ' ');
  const hrefs = (h) => [...h.matchAll(/<a\b[^>]*\shref="([^"]*)"/gi)].map((m) => m[1].replace(/&amp;/g, '&')).filter((x) => MATCH.test(x));
  return { visible: new Set(hrefs(visible)), noscript: new Set(hrefs(noscript)) };
}
for (const p of pages) {
  const [on, off] = await Promise.all([ON, OFF].map((b) => fetch(b + p, { headers: { 'user-agent': 'ux11-c3-link-detail' } }).then((r) => r.text())));
  const a = split(off); const b = split(on);
  const onlyNoscriptOn = [...a.visible].filter((h) => !b.visible.has(h));
  process.stdout.write(`${p}\n  flag off: ${a.visible.size} visible, ${a.noscript.size} in <noscript>\n  flag on:  ${b.visible.size} visible, ${b.noscript.size} in <noscript>\n`);
  process.stdout.write(`  visible with the flag off, not visible with the flag on (${onlyNoscriptOn.length}): ${onlyNoscriptOn.map((h) => `${h}${b.noscript.has(h) ? ' [noscript only]' : ' [absent]'}`).join(', ') || '-'}\n`);
}
