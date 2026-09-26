// SEO + link-set diff of the /quizzes URLs, A (flag off) vs B (flag on). Read only (GET).
//   node seo-diff.mjs <baseA> <baseB> [--links-out <dir>] <path> [<path> ...]
// Per path: status, <title>, meta description / robots / og / twitter, canonical,
// hreflang, H1, every JSON-LD block (parsed, order-free), the live intro sentence and
// the FAQ questions (verbatim in B), server rendering, and the LINK SET (COMMON.md
// done-when 5): every <a href> of A's served HTML (nav, page, noscript, footer) must
// be in B's served HTML. Prints one line per check; exit 1 on any difference.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const LINKS_OUT = opt('--links-out');
const [A, B, ...paths] = args;

const INTRO = 'Browse every K-pop quiz on the site, filter by group or type, and sort by trending, newest, or most played.';

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const text = (html) => decode(html.replace(/<!-- -->/g, '').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function headOf(html) { const i = html.indexOf('</head>'); return i > 0 ? html.slice(0, i) : html; }
function metas(html) {
  const out = {};
  for (const m of headOf(html).matchAll(/<meta\s+([^>]+?)\/?>(?!<\/)/g)) {
    const attrs = Object.fromEntries([...m[1].matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)].map((x) => [x[1], decode(x[2])]));
    const k = attrs.name || attrs.property;
    if (k && attrs.content !== undefined) out[k] = (out[k] ? `${out[k]} | ` : '') + attrs.content;
  }
  return out;
}
function links(html, rel) {
  return [...headOf(html).matchAll(/<link\s+([^>]+?)\/?>/g)]
    .map((m) => Object.fromEntries([...m[1].matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)].map((x) => [x[1], decode(x[2])])))
    .filter((a) => a.rel === rel)
    .map((a) => `${a.hrefLang ?? a.hreflang ?? ''} ${a.href}`.trim())
    .sort();
}
function jsonld(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => { try { return JSON.stringify(JSON.parse(m[1])); } catch { return m[1]; } })
    .sort();
}
// Every <a href> of the served document (nav, page, <noscript>, footer), decoded.
function anchorSet(html) {
  const body = html.replace(/<head>[\s\S]*?<\/head>/, '');
  return new Set([...body.matchAll(/<a\s[^>]*?href="([^"]*)"/g)].map((m) => decode(m[1])));
}
function h1(html) { return [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1])); }

let fails = 0;
const line = (ok, what, detail = '') => { if (!ok) fails++; process.stdout.write(`${ok ? 'SAME' : 'DIFF'}  ${what}${detail ? `  ${detail}` : ''}\n`); };
const get = (base, p) => fetch(base + p, { redirect: 'manual', headers: { 'user-agent': 'ux11-p2-seo-diff' } });

for (const p of paths) {
  const [ra, rb] = await Promise.all([get(A, p), get(B, p)]);
  const [ha, hb] = [await ra.text(), await rb.text()];
  process.stdout.write(`\n== ${p}\n`);
  line(ra.status === rb.status && ra.headers.get('location') === rb.headers.get('location'), 'status', `${ra.status}/${rb.status} ${ra.headers.get('location') ?? ''}`);
  if (ra.status !== 200) continue;
  const ta = (/<title>([\s\S]*?)<\/title>/.exec(ha) ?? [])[1]; const tb = (/<title>([\s\S]*?)<\/title>/.exec(hb) ?? [])[1];
  line(ta === tb, 'title', JSON.stringify(decode(ta ?? '')));
  const ma = metas(ha); const mb = metas(hb);
  const keys = [...new Set([...Object.keys(ma), ...Object.keys(mb)])].filter((k) => /description|robots|^og:|^twitter:/.test(k)).sort();
  for (const k of keys) line(ma[k] === mb[k], `meta ${k}`, ma[k] === mb[k] ? (k === 'robots' || k === 'description' ? JSON.stringify(ma[k]).slice(0, 90) : '') : `A=${JSON.stringify(ma[k])} B=${JSON.stringify(mb[k])}`);
  if (!keys.includes('robots')) line(true, 'meta robots', 'none on either side (indexable)');
  line(JSON.stringify(links(ha, 'canonical')) === JSON.stringify(links(hb, 'canonical')), 'canonical', links(ha, 'canonical').join(', '));
  line(JSON.stringify(links(ha, 'alternate')) === JSON.stringify(links(hb, 'alternate')), 'hreflang / alternate', links(ha, 'alternate').join(', ') || 'none');
  line(JSON.stringify(h1(ha)) === JSON.stringify(h1(hb)), 'H1', JSON.stringify(h1(hb)));
  const ja = jsonld(ha); const jb = jsonld(hb);
  line(JSON.stringify(ja) === JSON.stringify(jb), 'JSON-LD blocks (parsed)', `${ja.length}/${jb.length} (${ja.map((j) => (/"@type":"([^"]+)"/.exec(j) ?? [])[1]).join(', ')})`);
  const tA = text(ha); const tB = text(hb);
  if (tA.includes(INTRO)) line(tB.includes(INTRO), 'intro sentence (verbatim in B)');
  const faqA = ja.filter((j) => j.includes('"FAQPage"')).flatMap((j) => JSON.parse(j).mainEntity.map((q) => q.name));
  line(faqA.every((q) => tB.includes(q)), 'FAQ questions visible in B', `${faqA.length} questions`);
  const la = anchorSet(ha); const lb = anchorSet(hb);
  const lost = [...la].filter((h) => !lb.has(h)).sort();
  const added = [...lb].filter((h) => !la.has(h)).sort();
  line(lost.length === 0, 'LINK SET: every <a href> of A is in B', `A ${la.size}, B ${lb.size}, lost ${lost.length}, added ${added.length}${lost.length ? `  LOST: ${lost.join(' ')}` : ''}`);
  if (LINKS_OUT) {
    fs.mkdirSync(LINKS_OUT, { recursive: true });
    const slug = p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
    fs.writeFileSync(path.join(LINKS_OUT, `${slug}.A.txt`), [...la].sort().join('\n') + '\n');
    fs.writeFileSync(path.join(LINKS_OUT, `${slug}.B.txt`), [...lb].sort().join('\n') + '\n');
    fs.writeFileSync(path.join(LINKS_OUT, `${slug}.added.txt`), added.join('\n') + '\n');
  }
  line(/<h1[\s>]/.test(hb) && tB.length > 1000, 'server rendered (B HTML carries the content)', `${tB.length} chars of text, ${[...hb.matchAll(/href="\/q\//g)].length} quiz links`);
}
process.stdout.write(fails ? `\n${fails} difference(s)\n` : '\nno SEO difference\n');
process.exit(fails ? 1 : 0);
