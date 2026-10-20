// Run O1, lane C3: turns the Playwright JSON reports of run-dev.sh into docs/o1/reports/C3/e2e-dev.md.
//   node report.mjs --out <file> --head <sha> --integration <sha> --dirty 0|1 --ports p1,p2,p3 --with-jump 0|1 <report.json>...
// The report names the date, the commit, and for each spec file every test with pass, fail or skip and its reason.
// A failure shows the first line of its message, cut and cleaned of anything that looks like a secret (long tokens,
// query strings and fragments of URLs). No dash characters of the long kinds, no emoji.
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = {};
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
  else files.push(args[i]);
}

const clean = (s) =>
  String(s ?? '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/(https?:\/\/[^\s"'<>)]*?)[?#][^\s"'<>)]*/g, '$1')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '<redacted>')
    .replace(/\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}\b/g, '<redacted>')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/** @typedef {{ file: string, title: string, project: string, status: 'pass'|'fail'|'skip', note: string }} Row */
const rows = [];
const missing = [];
function walk(suite, trail, file) {
  const here = suite.title && suite.title !== file && !/\.o1\.ts$/.test(suite.title) ? [...trail, suite.title] : trail;
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const last = (t.results ?? []).at(-1);
      let status = 'pass';
      let note = '';
      if (t.status === 'skipped' || last?.status === 'skipped') {
        status = 'skip';
        note = (t.annotations ?? []).find((a) => a.type === 'skip')?.description ?? '';
      } else if (t.status === 'unexpected' || t.status === 'flaky' || (last && last.status !== 'passed')) {
        status = 'fail';
        const lines = String(last?.error?.message ?? last?.errors?.[0]?.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').filter((l) => l.trim());
        const entries = lines.filter((l) => /^\s*\+\s+"/.test(l)).map((l) => l.replace(/^\s*\+\s*/, '').replace(/,$/, ''));
        const got = lines.filter((l) => /^(Expected|Received):/.test(l)).slice(0, 2);
        note = clean([lines[0] ?? t.status, ...got, entries.length ? `${entries.length} entries, first: ${entries.slice(0, 2).join(' ')}` : ''].filter(Boolean).join('; ')).slice(0, 420);
      }
      const extra = (t.annotations ?? []).filter((a) => a.type !== 'skip' && a.description).map((a) => `${a.type}: ${a.description}`);
      rows.push({
        file: spec.file ?? file, title: [...here, spec.title].join(' > '), project: t.projectName ?? '', status,
        note: clean([note, ...(status === 'pass' ? extra : [])].filter(Boolean).join('; ')),
      });
    }
  }
  for (const s of suite.suites ?? []) walk(s, here, file);
}
for (const f of files) {
  if (!fs.existsSync(f)) { missing.push(f.split('/').pop()); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const s of j.suites ?? []) walk(s, [], s.file ?? s.title);
  for (const e of j.errors ?? []) rows.push({ file: '(run)', title: 'playwright error', project: '', status: 'fail', note: clean(e.message).slice(0, 300) });
}

const byFile = new Map();
for (const r of rows) {
  const f = r.file.replace(/^.*e2e\/o1\//, 'e2e/o1/').replace(/^(?!e2e\/)/, 'e2e/o1/');
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push(r);
}
const count = (list, s) => list.filter((r) => r.status === s).length;
const total = { pass: count(rows, 'pass'), fail: count(rows, 'fail'), skip: count(rows, 'skip') };

const out = [];
out.push('# E2E pass on o1-dev, lane C3');
out.push('');
out.push(`- date: ${new Date().toISOString()}`);
out.push(`- commit: ${opt.head}${opt.dirty === '1' ? ' (with local changes in the app sources)' : ''}; o1/integration at ${opt.integration}`);
out.push('- command: `bash apps/quiz/e2e/o1/C3/run-dev.sh`');
out.push(`- servers: kpop.localhost, anime.localhost, hub.localhost on ports ${opt.ports} (next start, builds against o1-dev, PASSPORT_JUMP on with run-only secrets)`);
out.push(`- B3/jump: ${opt['with-jump'] === '1' ? 'ran with the service role (creates its own user on o1-dev)' : 'not run with the service role, as the lane rule forbids it on o1-dev (the C3 passport spec covers the jump with a fixture account)'}`);
out.push(`- total: ${total.pass} pass, ${total.fail} fail, ${total.skip} skip${missing.length ? `; no report from: ${missing.join(', ')}` : ''}`);
out.push('');
out.push('## Per spec file');
out.push('');
out.push('| spec | pass | fail | skip |');
out.push('| --- | ---: | ---: | ---: |');
for (const [f, list] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
  out.push(`| ${f} | ${count(list, 'pass')} | ${count(list, 'fail')} | ${count(list, 'skip')} |`);
}
out.push('');
out.push('## Per test');
for (const [f, list] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
  out.push('');
  out.push(`### ${f}`);
  out.push('');
  for (const r of list) out.push(`- ${r.status.toUpperCase()} ${r.title}${r.project ? ` [${r.project}]` : ''}${r.note ? `: ${r.note}` : ''}`);
}
out.push('');
fs.mkdirSync(opt.out.replace(/\/[^/]*$/, ''), { recursive: true });
fs.writeFileSync(opt.out, out.join('\n'));
console.log(`report: ${total.pass} pass, ${total.fail} fail, ${total.skip} skip`);
process.exit(total.fail > 0 ? 1 : 0);
