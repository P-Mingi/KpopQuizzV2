#!/usr/bin/env node
// C3: summarise a Playwright JSON report (PLAYWRIGHT_JSON_OUTPUT_FILE) per spec file and
// project: passed / flaky (passed on a retry) / failed / skipped, plus every failure with
// its first error line and every skip reason. Writes <out>.md and <out>.json.
//   node e2e-summary.mjs <report.json> <out-basename>
import fs from 'node:fs';

const [, , file, outBase] = process.argv;
const rep = JSON.parse(fs.readFileSync(file, 'utf8'));
const rows = new Map();
const failures = []; const skips = []; const flakes = [];
function walk(suite, fileName) {
  const f = suite.file ?? fileName;
  for (const s of suite.suites ?? []) walk(s, f);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const key = `${f.replace(/^.*ux-v1\//, '')}|${t.projectName}`;
      const r = rows.get(key) ?? { file: f.replace(/^.*ux-v1\//, ''), project: t.projectName, passed: 0, flaky: 0, failed: 0, skipped: 0 };
      const status = t.status; // expected | unexpected | flaky | skipped
      const title = `${spec.title}`;
      const suiteTitle = suite.title;
      if (status === 'expected') r.passed++;
      else if (status === 'flaky') { r.flaky++; flakes.push({ file: r.file, project: t.projectName, title: `${suiteTitle} › ${title}` }); }
      else if (status === 'skipped') {
        r.skipped++;
        const why = (t.annotations ?? []).filter((a) => a.type === 'skip').map((a) => a.description).join('; ') || (t.results?.[0]?.annotations ?? []).filter((a) => a.type === 'skip').map((a) => a.description).join('; ');
        skips.push({ file: r.file, project: t.projectName, title: `${suiteTitle} › ${title}`, why });
      } else {
        r.failed++;
        const last = t.results?.at(-1);
        const msg = (last?.error?.message ?? last?.errors?.[0]?.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').filter((l) => l.trim()).slice(0, 3).join(' / ').slice(0, 300);
        failures.push({ file: r.file, project: t.projectName, title: `${suiteTitle} › ${title}`, line: spec.line, error: msg });
      }
      rows.set(key, r);
    }
  }
}
for (const s of rep.suites ?? []) walk(s, s.file);
const list = [...rows.values()].sort((a, b) => a.file.localeCompare(b.file) || a.project.localeCompare(b.project));
const tot = list.reduce((a, r) => ({ passed: a.passed + r.passed, flaky: a.flaky + r.flaky, failed: a.failed + r.failed, skipped: a.skipped + r.skipped }), { passed: 0, flaky: 0, failed: 0, skipped: 0 });
let md = `| Spec | Project | Passed | Flaky (passed on retry) | Failed | Skipped |\n|---|---|---|---|---|---|\n`;
for (const r of list) md += `| ${r.file} | ${r.project} | ${r.passed} | ${r.flaky} | ${r.failed} | ${r.skipped} |\n`;
md += `| **Total** | | **${tot.passed}** | **${tot.flaky}** | **${tot.failed}** | **${tot.skipped}** |\n`;
md += `\nStarted ${rep.stats?.startTime ?? '?'}, duration ${Math.round((rep.stats?.duration ?? 0) / 60000)} min.\n`;
md += `\n### Failures (${failures.length})\n\n`;
for (const f of failures) md += `- ${f.file}:${f.line} [${f.project}] ${f.title}: ${f.error}\n`;
md += `\n### Flaky (${flakes.length})\n\n`;
for (const f of flakes) md += `- ${f.file} [${f.project}] ${f.title}\n`;
const why = new Map();
for (const s of skips) { const k = `${s.file}: ${s.why || '(no reason given)'}`; why.set(k, (why.get(k) ?? 0) + 1); }
md += `\n### Skips (${skips.length}) by reason\n\n`;
for (const [k, n] of why) md += `- ${n} x ${k}\n`;
fs.writeFileSync(`${outBase}.md`, md);
fs.writeFileSync(`${outBase}.json`, JSON.stringify({ totals: tot, rows: list, failures, flakes, skips }, null, 1));
process.stdout.write(md);
