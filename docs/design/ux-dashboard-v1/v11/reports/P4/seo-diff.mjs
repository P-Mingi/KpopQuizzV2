// SEO diff of /q/<slug> pages, A (flag off) vs B (flag on). Read only (GET).
//   node seo-diff.mjs <baseA> <baseB> <path> [<path> ...]
// Compares: status, <title>, meta description, robots, canonical, hreflang, og/twitter
// meta, H1, every JSON-LD block, the intro paragraph (flag-off .quiz-about-lead text
// must appear verbatim in B), the question review texts, and the internal links of
// <main> (every link A serves must still be served by B). Prints one line per check.

const [A, B, ...paths] = process.argv.slice(2);

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const text = (html) => decode(html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function headOf(html) { const i = html.indexOf('</head>'); return i > 0 ? html.slice(0, i) : html; }
function metas(html) {
  const head = headOf(html);
  const out = {};
  for (const m of head.matchAll(/<meta\s+([^>]+?)\/?>(?!<\/)/g)) {
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
// The page body streams (dev and ISR alike): its HTML can sit outside <main> in a hidden
// Suspense segment, so links are read from the whole document minus the shell's nav and
// footer (legacy: <nav>..</nav>, <footer>..</footer>; v11: .ux-nav, .ux-foot, .ux-tabbar).
function pageOnly(html) {
  return html
    .replace(/<head>[\s\S]*?<\/head>/, '')
    .replace(/<footer[\s\S]*?<\/footer>/g, '')
    .replace(/<header[\s\S]*?<\/header>/g, '')
    .replace(/<nav class="ux-tabbar[\s\S]*?<\/nav>/g, '')
    .replace(/<nav[^>]*aria-label="(Main|Primary|Site)[^"]*"[\s\S]*?<\/nav>/g, '');
}
function hrefs(html) { return [...new Set([...pageOnly(html).matchAll(/href="(\/[^"#]*)"/g)].map((m) => decode(m[1])))].sort(); }
function h1(html) { return [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1])); }
function intro(html) { const m = /<p class="quiz-about-lead[^"]*">([\s\S]*?)<\/p>/.exec(html); return m ? text(m[1]) : null; }
function reviewQs(html) { return [...html.matchAll(/<p class="quiz-review-q">([\s\S]*?)<\/p>/g)].map((m) => text(m[1])); }

let fails = 0;
const line = (ok, what, detail = '') => { if (!ok) fails++; process.stdout.write(`${ok ? 'SAME' : 'DIFF'}  ${what}${detail ? `  ${detail}` : ''}\n`); };

for (const p of paths) {
  const [ra, rb] = await Promise.all([fetch(A + p, { redirect: 'manual' }), fetch(B + p, { redirect: 'manual' })]);
  const [ha, hb] = [await ra.text(), await rb.text()];
  process.stdout.write(`\n== ${p}\n`);
  line(ra.status === rb.status && ra.headers.get('location') === rb.headers.get('location'), 'status', `${ra.status}/${rb.status} ${ra.headers.get('location') ?? ''}`);
  if (ra.status !== 200) continue;
  const ta = (/<title>([\s\S]*?)<\/title>/.exec(ha) ?? [])[1]; const tb = (/<title>([\s\S]*?)<\/title>/.exec(hb) ?? [])[1];
  line(ta === tb, 'title', JSON.stringify(ta));
  const ma = metas(ha); const mb = metas(hb);
  for (const k of [...new Set([...Object.keys(ma), ...Object.keys(mb)])].filter((k) => /description|robots|^og:|^twitter:/.test(k)).sort()) {
    line(ma[k] === mb[k], `meta ${k}`, ma[k] === mb[k] ? '' : `A=${JSON.stringify(ma[k])} B=${JSON.stringify(mb[k])}`);
  }
  line(JSON.stringify(links(ha, 'canonical')) === JSON.stringify(links(hb, 'canonical')), 'canonical', links(ha, 'canonical').join(', '));
  line(JSON.stringify(links(ha, 'alternate')) === JSON.stringify(links(hb, 'alternate')), 'hreflang / alternate', `${links(ha, 'alternate').length} links`);
  line(JSON.stringify(h1(ha)) === JSON.stringify(h1(hb)), 'H1', JSON.stringify(h1(hb)));
  const ja = jsonld(ha); const jb = jsonld(hb);
  line(JSON.stringify(ja) === JSON.stringify(jb), 'JSON-LD blocks', `${ja.length}/${jb.length} (${ja.map((j) => (/"@type":"([^"]+)"/.exec(j) ?? [])[1]).join(', ')})`);
  line(!ja.some((j) => j.includes('"FAQPage"')) && !jb.some((j) => j.includes('"FAQPage"')), 'FAQ (none on quiz pages)');
  const ia = intro(ha);
  line(ia !== null && text(hb).includes(ia), 'intro paragraph (verbatim in B)', ia ? JSON.stringify(ia.slice(0, 70) + '...') : 'not found in A');
  const qa = reviewQs(ha); const tbText = text(hb);
  const missingQ = qa.filter((q) => !tbText.includes(q));
  line(missingQ.length === 0, 'question review texts', `${qa.length - missingQ.length}/${qa.length} in B`);
  const la = hrefs(ha); const lb = new Set(hrefs(hb));
  const lost = la.filter((h) => !lb.has(h));
  line(lost.length === 0, 'internal links of the page kept', lost.length ? `lost: ${lost.join(' ')}` : `${la.length} in A, all in B (B has ${lb.size})`);
  line(/<h1[\s>]/.test(hb) && tbText.length > 1000, 'server rendered (B HTML carries the content)', `${tbText.length} chars of text`);
}
process.stdout.write(fails ? `\n${fails} difference(s)\n` : '\nno SEO difference\n');
process.exit(fails ? 1 : 0);
