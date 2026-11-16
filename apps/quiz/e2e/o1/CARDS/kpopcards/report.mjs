#!/usr/bin/env node
// Turns the results.jsonl of a run into qa/pass-<n>.md (next free n). Usage: node e2e/o1/CARDS/kpopcards/report.mjs [--results file] [--note "text"]
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const QA = process.env.KC_QA_DIR || '/private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/kpopcards/qa';
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const resultsFile = arg('--results', path.join(QA, 'img', 'results.jsonl'));
const note = arg('--note', '');
const rows = fs.readFileSync(resultsFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

let n = 1; while (fs.existsSync(path.join(QA, `pass-${n}.md`))) n++;
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }).trim(); } catch { return '?'; } };
const heads = ['o1/c3goals', 'o1/kcscreens', 'o1/c3motion'].map((b) => `${b} ${sh(`git log -1 --format=%h ${b}`)}`).join(', ');

// who owns what: opening and motion = C; backend and data = A; screens = B
const owner = (r) => {
  const s = r.screen || r.name || r.kind || '';
  if (r.kind === 'fps' || r.kind === 'opening-fit' || r.kind === 'reduced-motion' || /^open/.test(s) || /open|reveal|golden|gold|daily|focus|flip/i.test(r.name || '')) return 'C';
  if (r.kind === 'flip') return /^open/.test(s) ? 'C' : 'B';
  if (r.kind === 'journey' && /guest|craft|set |week|friend|idol|recycle|ranking/i.test(r.name)) return 'A';
  return 'B';
};
const seen = new Set(); const byKey = new Map();
for (const r of rows) byKey.set([r.kind, r.screen, r.vp, r.name, r.engine, r.target].join('|'), r); // last wins
const last = [...byKey.values()];

const out = [];
out.push(`# Pass ${n}`, '', `Run at ${new Date().toISOString()}. Branches: ${heads}.${note ? ' ' + note : ''}`, '');
const vis = last.filter((r) => r.kind === 'visual');
if (vis.length) {
  out.push('## Visual comparison with the prototype (target: at most 1% of pixels different, key boxes within 2 px)', '', '| Screen | Viewport | Pixels different | Page height proto / app | Boxes off (>2 px) | Result |', '|---|---|---|---|---|---|');
  for (const r of vis) out.push(`| ${r.screen} | ${r.vp} | ${r.error ? 'error' : r.diffPct + '%'} | ${r.sizeProto ? r.sizeProto[1] + ' / ' + r.sizeApp[1] : ''} | ${r.error ? r.error : (r.boxesOff || []).length + ' of ' + r.boxesChecked} | ${r.pass ? 'PASS' : r.screen === 'lobby-guest' ? 'PRODUCT DECISION' : 'FAIL'} |`);
  const m = vis.find((r) => r.mask);
  if (m) out.push('', `Masked on both sides: ${m.mask}`);
  out.push('');
}
const section = (who) => {
  const L = [];
  for (const r of last) {
    if (r.pass !== false) continue;
    if (r.screen === 'lobby-guest') continue; // listed apart: a product decision, not a gap
    if (owner(r) !== who) continue;
    if (r.kind === 'visual') {
      if (r.error) L.push(`- **${r.screen} @ ${r.vp}**: could not be compared: ${r.error}`);
      else {
        L.push(`- **${r.screen} @ ${r.vp}**: ${r.diffPct}% of pixels differ (target 1%); page height prototype ${r.sizeProto[1]} px, app ${r.sizeApp[1]} px. Diff image: qa/img/${r.screen}/${r.vp}-diff.png`);
        for (const b of (r.boxesOff || []).slice(0, 14)) {
          if (!b.app) L.push(`  - \`${b.sel}\` #${b.idx}: missing in the app (prototype box x${b.proto.x} y${b.proto.y} ${b.proto.w}x${b.proto.h})`);
          else if (!b.proto) L.push(`  - \`${b.sel}\` #${b.idx}: extra in the app (${b.app.w}x${b.app.h} at ${b.app.x},${b.app.y}); the prototype has fewer`);
          else L.push(`  - \`${b.sel}\` #${b.idx}: prototype x${b.proto.x} y${b.proto.y} ${b.proto.w}x${b.proto.h}; app x${b.app.x} y${b.app.y} ${b.app.w}x${b.app.h} (dx ${b.dx}, dy ${b.dy}, dw ${b.dw}, dh ${b.dh})`);
        }
        if ((r.boxesOff || []).length > 14) L.push(`  - ... and ${(r.boxesOff || []).length - 14} more boxes in results.jsonl`);
      }
    } else if (r.kind === 'overflow') L.push(`- **overflow ${r.screen}**: ${r.bad.slice(0, 6).join('; ')}`);
    else if (r.kind === 'opening-fit') L.push(`- **opening does not fit at ${r.name}**: ${r.bad.slice(0, 8).join('; ')}`);
    else if (r.kind === 'journey') L.push(`- **journey "${r.name}"**: ${r.error}`);
    else if (r.kind === 'a11y') L.push(`- **a11y ${r.screen} @ ${r.vp}**: ${r.smallCount} targets under 44 px (${(r.small || []).slice(0, 5).join('; ')}); no name: ${(r.noName || []).join(', ') || 'none'}; no focus ring: ${(r.noFocusRing || []).join(', ') || 'none'}`);
    else if (r.kind === 'reduced-motion') L.push(`- **reduced motion**: transform animations in the opening: ${(r.longTransformAnimationsInOpening || []).join(', ') || 'none'}; card flip transform: ${r.flipTransform}`);
    else if (r.kind === 'flip') L.push(`- **flip on ${r.engine}**: frames with both faces visible: ${r.both}; final back ${r.final?.bk}, front ${r.final?.fr}`);
    else if (r.kind === 'fps') L.push(`- **fps ${r.target} @ ${r.vp}, CPU ${r.cpu}x**: ${r.fps} fps average, worst second ${r.worstSecondFrames} frames, p95 frame ${r.p95FrameMs} ms (target 45)`);
  }
  return L.length ? L : ['- Nothing failing for this lane in this run.'];
};
const other = last.filter((r) => r.kind !== 'visual');
if (other.length) {
  out.push('## Other checks', '', '| Check | Where | Result | Detail |', '|---|---|---|---|');
  for (const r of other) out.push(`| ${r.kind} | ${[r.screen, r.name, r.vp, r.engine, r.target].filter(Boolean).join(' / ')} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.kind === 'fps' ? r.fps + ' fps' : r.kind === 'flip' ? 'both visible: ' + r.both : ''} |`);
  out.push('');
}
const guest = last.filter((r) => r.screen === 'lobby-guest');
if (guest.length) out.push('## Product decision for the owner, not a gap: the guest lobby', '', 'A real signed-out visitor has no wallet and no stack, so showing the prototype\'s example player to a guest would be fake activity. The prototype\'s guest view differs on purpose; measured anyway:', '', ...guest.map((r) => `- ${r.vp}: ${r.error ? r.error : r.diffPct + '% of pixels differ, ' + (r.boxesOff || []).length + ' boxes off'}`), '');
for (const who of ['A', 'B', 'C']) out.push(`## For agent ${who}`, '', ...section(who), '');
const file = path.join(QA, `pass-${n}.md`);
fs.writeFileSync(file, out.join('\n'));
console.log(file);
