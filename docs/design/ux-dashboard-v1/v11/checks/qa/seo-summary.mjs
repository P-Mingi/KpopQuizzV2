#!/usr/bin/env node
// C3: turns seo/seo-diff.json into seo/SUMMARY.md (one row per URL: status, SEO fields, H1,
// JSON-LD types, link counts on / off / live, links lost, links added).
//   node seo-summary.mjs <seo-diff.json> <SUMMARY.md>
import fs from 'node:fs';

const [, , file, out] = process.argv;
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const FIELDS = ['title', 'description', 'robots', 'googlebot', 'canonical', 'hreflang', 'ogTitle', 'ogUrl', 'h1', 'xRobotsTag', 'jsonldTypes', 'jsonld', 'lostProse', 'lostSummaries'];
const fieldDiffs = (c) => FIELDS.filter((k) => c[k] !== undefined);
let md = `# SEO diff: flag on (:3021) vs flag off (C3 build of the same head) vs live (kpopquiz.org)\n\nRun ${d.at}. Script: \`checks/qa/seo-diff.mjs\`; raw data: \`seo-diff.json\`. Server HTML only (no JS). "Visible" links = \`<a href>\` outside \`<noscript>\`, \`<template>\` and scripts.\n\n`;
md += `| URL | Status on / off / live | Field diffs on vs off | On: robots | On: H1 | On: JSON-LD | Links on / off / live | Lost vs off | Lost vs live | Added vs off |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of d.rows) {
  const on = r.on ?? {};
  const o = r.onVsOff; const l = r.onVsLive;
  const st = `${r.status.on} / ${r.status.off}${r.location.off ? ' (301)' : ''} / ${r.status.live}${r.location.live ? ' (301)' : ''}`;
  const fd = fieldDiffs(o).filter((k) => k !== 'status');
  md += `| ${r.page} | ${st} | ${fd.join(', ') || 'none'} | ${(on.robots ?? []).join(' ') || '-'} | ${(on.h1 ?? []).join(' / ').slice(0, 60) || '-'} | ${(on.jsonldTypes ?? []).join(', ') || '-'} | ${on.links ?? '-'} / ${o.links?.off ?? '-'} / ${l.links?.live ?? '-'} | ${o.links?.lost?.length ?? 0} | ${l.links?.lost?.length ?? 0} | ${o.links?.addedCount ?? 0} |\n`;
}
md += `\n## Lost links and text (details)\n\n`;
for (const r of d.rows) {
  const o = r.onVsOff; const l = r.onVsLive;
  const parts = [];
  if (o.links?.lost?.length) parts.push(`- lost vs flag off: ${o.links.lost.join(', ')}`);
  if (l.links?.lost?.length) parts.push(`- lost vs live: ${l.links.lost.join(', ')}`);
  for (const k of fieldDiffs(o)) parts.push(`- ${k}: ${JSON.stringify(o[k]).slice(0, 600)}`);
  if (parts.length) md += `### ${r.page}\n\n${parts.join('\n')}\n\n`;
}
md += `## Links added with the flag on (vs flag off), first 60 per URL\n\n`;
for (const r of d.rows) if (r.onVsOff.links?.added?.length) md += `- ${r.page} (+${r.onVsOff.links.addedCount}): ${r.onVsOff.links.added.join(', ')}\n`;
const s = d.site;
md += `\n## robots.txt and sitemap\n\n- robots.txt identical flag on vs off: ${s.robotsIdentical}\n- sitemap URLs: on ${s.sitemapCount.on}, off ${s.sitemapCount.off}; only on: ${s.sitemapOnlyOn.length}; only off: ${s.sitemapOnlyOff.length}\n- new pages (/community, /blindtest/ranked, /ux-v1) in the flag-on sitemap: ${s.sitemapHasNewPages.length}\n`;
fs.writeFileSync(out, md);
process.stdout.write(md.slice(0, 4000));
