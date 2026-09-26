// C2 backend checker: builds one <row id>.md per WIRING-MAP row from rows/*.json,
// plus README.md (summary table). Row id = R + the row's line number in
// WIRING-MAP.md (the run already cites rows by line: "WIRING-MAP rows 79 and 255").
// node docs/design/ux-dashboard-v1/v11/checks/backend/gen.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mapFile = path.resolve(here, '../../../WIRING-MAP.md');
const lines = fs.readFileSync(mapFile, 'utf8').split('\n');

// Every table row of the map, with its section heading.
const all = [];
let section = '';
lines.forEach((l, i) => {
  if (l.startsWith('## ')) section = l.slice(3).trim();
  if (/^\| /.test(l) && !/^\|---/.test(l) && !/^\| (Control|View|Item) \|/.test(l)) {
    all.push({ id: `R${String(i + 1).padStart(3, '0')}`, line: i + 1, section, text: l.trim() });
  }
});

const src = path.join(here, 'rows');
const rows = new Map();
for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.json')).sort()) {
  for (const r of JSON.parse(fs.readFileSync(path.join(src, f), 'utf8'))) {
    if (rows.has(r.id)) throw new Error(`duplicate ${r.id} in ${f}`);
    rows.set(r.id, { ...r, src: f });
  }
}

const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const list = (v) => (Array.isArray(v) ? v.map((x) => `- ${x}`).join('\n') : v ? String(v) : '-');
const title = (t) => t.split('|').map((c) => c.trim()).filter(Boolean);

let count = { PASS: 0, FAIL: 0, 'NOT VERIFIED': 0, PENDING: 0, 'N/A': 0, TODO: 0 };
const summary = [];
for (const m of all) {
  const r = rows.get(m.id);
  const cols = title(m.text);
  const name = m.section.startsWith('v1') ? `${cols[0]} · ${cols[1]}` : cols[0];
  if (!r) { count.TODO++; summary.push(`| ${m.id} | ${cell(m.section.split(' ')[0])} | ${cell(name)} | - | TODO | - |`); continue; }
  const v = r.verdict;
  const key = v.startsWith('PASS') ? 'PASS' : v.startsWith('FAIL') ? 'FAIL' : v.startsWith('NOT VERIFIED') ? 'NOT VERIFIED' : v.startsWith('PENDING') ? 'PENDING' : v.startsWith('N/A') ? 'N/A' : 'TODO';
  count[key]++;
  const md = `# ${m.id} · ${name}

- Section: ${m.section} (WIRING-MAP.md line ${m.line})
- Owner: ${r.owner}
- Build: ${r.build ?? 'shared flag-on production build on :3021 (feat/ux-v1-v11 dcc3159)'}
- Verdict: **${v}**

Map row (verbatim):

${m.text}

${r.corrected ? `Corrected by WIRING-MAP.verified.md: ${r.corrected}\n\n` : ''}## Control
${list(r.control)}

## Call (endpoint, method, status / payload)
${list(r.call)}

## Database (read-only, service role \`select\` only)
${list(r.db)}

## Flag off
${list(r.flagoff)}

## Notes
${list(r.notes)}

## Evidence
${list((r.evidence ?? []).map((e) => `\`${e}\``))}
`;
  fs.writeFileSync(path.join(here, `${m.id}.md`), md);
  summary.push(`| [${m.id}](${m.id}.md) | ${cell(r.owner)} | ${cell(name)} | ${cell(cols[cols.length - 2] ?? '')} | ${cell(v)} | ${cell(r.issue ?? '-')} |`);
}
for (const id of rows.keys()) if (!all.find((m) => m.id === id)) throw new Error(`unknown row ${id}`);

const head = fs.readFileSync(path.join(here, 'README.head.md'), 'utf8');
const readme = `${head}
## Counts

| Verdict | Rows |
|---|---:|
${Object.entries(count).map(([k, n]) => `| ${k} | ${n} |`).join('\n')}
| Total | ${all.length} |

## Rows

| Row | Owner | Control | Map status | Verdict | Issue |
|---|---|---|---|---|---|
${summary.join('\n')}
`;
fs.writeFileSync(path.join(here, 'README.md'), readme);
console.log(JSON.stringify(count), 'total', all.length);
