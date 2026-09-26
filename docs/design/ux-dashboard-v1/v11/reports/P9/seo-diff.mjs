#!/usr/bin/env node
// P9 SEO + link-set diff (COMMON done-when 5), server HTML (no JavaScript), fetched
// back to back from two production builds: A = flag OFF (the live site), B = flag ON.
// SEO items: title, meta description, robots, canonical, hreflang, og / twitter, H1,
// intro, JSON-LD. Link set: every <a href> of A must be in B (additions are fine).
// Read only (GET).
//
//   node seo-diff.mjs --a http://localhost:4391 --b http://localhost:4393 /leaderboard /pt/leaderboard

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const A = opt('--a', 'http://localhost:4391');
const B = opt('--b', 'http://localhost:4393');
const pages = args.length ? args : ['/leaderboard'];

const get = async (base, p) => (await fetch(base + p, { headers: { 'user-agent': 'ux11-p9-seo-diff' } })).text();

function seo(html) {
  const head = (html.match(/<head>([\s\S]*?)<\/head>/) || [])[1] || '';
  const all = (re) => [...head.matchAll(re)].map((m) => m[0]).sort();
  return {
    title: (head.match(/<title>([^<]*)<\/title>/) || [])[1] ?? null,
    description: (head.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? null,
    robots: all(/<meta name="robots"[^>]*>/g),
    canonical: all(/<link rel="canonical"[^>]*>/g),
    hreflang: all(/<link rel="alternate"[^>]*hrefLang[^>]*>/gi),
    og: all(/<meta property="og:[^"]*" content="[^"]*"\/?>/g),
    twitter: all(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g),
    h1: [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim()),
    intro: ((html.match(/<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] ?? '').replace(/<[^>]+>/g, '').trim(),
    jsonld: [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).sort(),
  };
}

function links(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '');
  return new Set([...body.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&')));
}

const cat = (h) => (/^https?:/.test(h) ? 'external' : /^\/q\//.test(h) ? 'quiz' : /^\/u\//.test(h) ? 'profile' : /^\/[a-z0-9-]+-quiz$/.test(h) ? 'hub' : 'site');
const byCat = (s) => { const o = {}; for (const h of s) o[cat(h)] = (o[cat(h)] ?? 0) + 1; return o; };

let fail = 0;
for (const p of pages) {
  const [ha, hb] = await Promise.all([get(A, p), get(B, p)]);
  const sa = seo(ha); const sb = seo(hb);
  const diffs = Object.keys(sa).filter((k) => JSON.stringify(sa[k]) !== JSON.stringify(sb[k]));
  const la = links(ha); const lb = links(hb);
  const lost = [...la].filter((h) => !lb.has(h));
  const added = [...lb].filter((h) => !la.has(h));
  console.log(`== ${p}`);
  console.log(`SEO items: ${diffs.length ? `DIFFERENT: ${diffs.join(', ')}` : 'identical'} (title, description, robots, canonical, hreflang, og, twitter, h1, intro, json-ld)`);
  for (const k of diffs) console.log(`  ${k}\n    A: ${JSON.stringify(sa[k])}\n    B: ${JSON.stringify(sb[k])}`);
  console.log(`  title: ${JSON.stringify(sa.title)}  h1: ${JSON.stringify(sa.h1)}  intro: ${JSON.stringify(sa.intro)}  json-ld blocks: ${sa.jsonld.length}`);
  console.log(`Links: flag off ${la.size} ${JSON.stringify(byCat(la))} | flag on ${lb.size} ${JSON.stringify(byCat(lb))}`);
  console.log(`  lost (flag off hrefs missing on flag on): ${lost.length ? JSON.stringify(lost) : 'none'}`);
  console.log(`  added: ${JSON.stringify(added)}`);
  if (diffs.length || lost.length) fail++;
}
process.exit(fail ? 1 : 0);
