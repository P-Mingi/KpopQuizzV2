#!/usr/bin/env node
// C3: perf/perf-<on>.json + perf/perf-<raw>.json + perf/perf-<off>.json -> perf/<out>
//   node perf-summary.mjs <perf dir> [onLabel rawLabel offLabel outName title]
//   node perf-summary.mjs <perf dir>
import fs from 'node:fs';
import path from 'node:path';

const [, , dir, onL = 'on-gzip', rawL = 'on', offL = 'off', outName = 'SUMMARY.md', title = 'loop 1'] = process.argv;
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const gz = load(`perf-${onL}.json`);
const raw = fs.existsSync(path.join(dir, `perf-${rawL}.json`)) ? load(`perf-${rawL}.json`) : { pages: {}, base: '-', at: '-' };
const off = load(`perf-${offL}.json`);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
let md = `# Performance probe (C3, ${title})\n\nPlaywright, no Lighthouse (not installed; adding it is a new dependency): the Lighthouse scores (perf >= 85, SEO 100, a11y >= 95) are PENDING the owner's OK to run Lighthouse. Phone: 390 x 844, DPR ${gz.dpr}, touch, Pixel 5 UA; CPU throttled ${gz.cpuThrottle}x (CDP); cache disabled; ${gz.runs} runs per cell after one warm load, median shown. Profiles: "local" = no network throttle; "slow 4G" = 150 ms RTT, 1.6 Mbps down, 750 kbps up (Lighthouse's mobile values).\n\nThree servers: **on** = the shared flag-on build of ${title} (:3021) seen through \`checks/qa/gzip-proxy.mjs\` (${gz.base}), which gzips the one response \`next start\` sends uncompressed (the v11 stylesheet route, 160 KB raw, 28 KB gzip) as Vercel's edge does; **on raw** = the same build without the proxy (the stylesheet uncompressed, so about 130 KB more render-blocking CSS: a local artefact, kept for the record); **off** = the C3 flag-off build of the same head (${off.base}). Runs: ${gz.at} (on), ${raw.at} (on raw), ${off.at} (off). Not measured on Vercel (previews are behind SSO).\n\n`;
md += `| Page | Profile | LCP on / on raw / off (ms) | CLS on / off | JS on / off (KB) | CSS on / on raw / off (KB) | Images on / off (KB) | Total on / off (KB) | LCP element (on) |\n|---|---|---|---|---|---|---|---|---|\n`;
const kb = (x, k) => (x ? med(x.runs.map((r) => r.kb?.[k] ?? 0)) : '-');
for (const p of Object.keys(gz.pages)) {
  for (const prof of ['local', 'slow4g']) {
    const a = gz.pages[p][prof]; const r = raw.pages[p]?.[prof]; const b = off.pages[p]?.[prof];
    md += `| ${p} | ${prof === 'slow4g' ? 'slow 4G' : 'local'} | ${a.lcpMs} / ${r?.lcpMs ?? '-'} / ${b?.lcpMs ?? '-'} | ${a.cls} / ${b?.cls ?? '-'} | ${kb(a, 'js')} / ${kb(b, 'js')} | ${kb(a, 'css')} / ${kb(r, 'css')} / ${kb(b, 'css')} | ${kb(a, 'img')} / ${kb(b, 'img')} | ${kb(a, 'total')} / ${kb(b, 'total')} | ${(a.lcpEl ?? '-').replace(/\|/g, '/').slice(0, 70)} |\n`;
  }
}
md += `\n## Photos from public/idols (flag on, 390, DPR ${gz.dpr})\n\nNeeded = rendered width x DPR. A problem is: served more than 2x the pixels needed, served under 2/3 of it while the source had more, or a width-descriptor srcset without \`sizes\` (a fixed-size image with a 1x / 2x srcset needs none).\n\n`;
for (const p of Object.keys(gz.pages)) {
  const imgs = gz.pages[p].local.idolImages;
  const probs = gz.pages[p].local.idolImageProblems;
  const judged = imgs.filter((i) => i.loaded !== false);
  md += `- ${p}: ${imgs.length} photos (${judged.length} loaded and judged), each with \`sizes\` or a 1x / 2x srcset: ${imgs.every((i) => i.sizes || i.density) ? 'yes' : 'NO'}; problems ${probs.length}${probs.length ? `:\n${probs.map((x) => `  - ${x}`).join('\n')}` : ''}\n`;
}
fs.writeFileSync(path.join(dir, outName), md);
process.stdout.write(md);
