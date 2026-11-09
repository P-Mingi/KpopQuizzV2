// Writes the owner review packet and the short summary of anime bank lot 1 from docs/anime/data/verify/bank-lot1.json.
//   node scripts/anime/daily/bank-lot1-docs.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const data = JSON.parse(readFileSync(`${ROOT}/docs/anime/data/verify/bank-lot1.json`, 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const label = (o) => (typeof o === 'string' ? o : o.label);

const css = `:root{--bg:#fbfaf7;--fg:#1d1d1f;--mut:#5b5b63;--line:#d9d6cc;--card:#fff;--bad:#a4161a;--badbg:#fdecec;--warn:#8a5a00;--warnbg:#fff5dc;--ok:#1b6b3a;--okbg:#e8f6ee;--acc:#2d4a9a}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececf0;--mut:#a0a0aa;--line:#34343c;--card:#1c1c20;--bad:#ff8a8d;--badbg:#3a1618;--warn:#f0c060;--warnbg:#33290f;--ok:#7fd9a0;--okbg:#14301f;--acc:#9db4ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:64rem;margin:0 auto;padding:12px 14px 48px}h1{font-size:1.45rem}h2{font-size:1.15rem;margin:1.6em 0 .3em;border-top:2px solid var(--line);padding-top:.4em}
a{color:var(--acc);overflow-wrap:anywhere}.mut{color:var(--mut)}.small{font-size:.88rem}table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{border:1px solid var(--line);padding:3px 6px;text-align:left}
.sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:8px}.sum div{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px}.sum b{display:block;font-size:1.3rem}
.q{border-top:1px solid var(--line);padding:8px 0}.q.fix{background:var(--warnbg);padding:8px;border-radius:6px}.q.drop{background:var(--badbg);padding:8px;border-radius:6px}
ol.o{margin:.2em 0 .2em 1.2em;padding:0}ol.o li.c{color:var(--ok);font-weight:600}.tag{display:inline-block;font-size:.76rem;border:1px solid var(--line);border-radius:999px;padding:0 8px;margin-right:4px}
.tag.fix{color:var(--warn);border-color:var(--warn)}.tag.drop{color:var(--bad);border-color:var(--bad)}.tag.ok{color:var(--ok);border-color:var(--ok)}.why{color:var(--warn)}.was{color:var(--mut);text-decoration:line-through}`;

let h = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Review packet bank-lot1</title><style>${css}</style></head><body><main>\n`;
h += `<h1>Anime daily bank, lot 1: review packet</h1><p class="mut small">${data.quizzes.length} quizzes, ${data.quizzes[0].date} to ${data.quizzes.at(-1).date}. Every question re-read on ${data.read_on} from its cited page. Correct answers are in green. Yellow = FIX (text corrected), red = original question dropped and replaced (the replacement is shown, with its own source).</p>\n`;
h += `<div class="sum"><div><b>${data.counts.OK}</b>OK</div><div><b>${data.counts.FIX}</b>FIX</div><div><b>${data.counts.DROP}</b>DROP and replaced</div><div><b>${data.quizzes.length}</b>quizzes</div></div>\n`;
h += `<h2>Schedule</h2><table><tr><th>Date</th><th>Series</th><th>Type</th><th>Difficulty</th><th>Title</th></tr>\n`;
for (const q of data.quizzes) h += `<tr><td>${q.date}</td><td>${esc(q.group_slug)}</td><td>${esc(q.quiz_type)}</td><td>${esc(q.difficulty)}</td><td><a href="#d${q.date}">${esc(q.title)}</a></td></tr>\n`;
h += `<tr><td>${data.moved_row.to}</td><td>anime-mix</td><td></td><td></td><td>${esc(data.moved_row.title)} (stuck row, moved from ${data.moved_row.from})</td></tr></table>\n`;
for (const q of data.quizzes) {
  h += `<h2 id="d${q.date}">${q.date}: ${esc(q.title)}</h2><p class="small">${esc(q.description)} <span class="mut">(${esc(q.group_slug)}, ${esc(q.quiz_type)}, ${esc(q.difficulty)}${q.title !== q.l08_title ? `; title changed from "${esc(q.l08_title)}"` : ''})</span></p>\n`;
  q.questions.forEach((x, k) => {
    const v = q.verdicts[k];
    const cls = v.verdict === 'FIX' ? 'fix' : v.verdict === 'DROP' ? 'drop' : '';
    h += `<div class="q ${cls}"><b>${k + 1}.</b> ${esc(x.question)} <span class="tag ${cls || 'ok'}">${v.verdict === 'DROP' ? 'REPLACED' : v.verdict}</span>`;
    if (x.clues) h += `<div class="small mut">${x.clues.map(esc).join(' / ')}</div>`;
    if ('options' in x) h += `<ol class="o" type="A">${x.options.map((o, n) => `<li${n === x.correct ? ' class="c"' : ''}>${esc(label(o))}</li>`).join('')}</ol>`;
    else h += `<div>Answer: <b class="c" style="color:var(--ok)">${x.correct ? 'True' : 'False'}</b></div>`;
    h += `<div class="small"><a href="${esc(x.source_url)}">source</a> <span class="mut">rev ${v.revision}, read ${v.read_on}</span></div>`;
    if (v.note) h += `<div class="small why">${esc(v.note)} <span class="was">${esc(v.original_question)}</span></div>`;
    h += `</div>\n`;
  });
}
h += `</main></body></html>\n`;
writeFileSync(`${ROOT}/docs/anime/editorial/packets/bank-lot1.html`, h);

const fixes = data.quizzes.flatMap((q) => q.verdicts.filter((v) => v.verdict !== 'OK').map((v) => ({ q, v })));
let m = `# Anime daily bank, lot 1: verification summary\n\nRead on ${data.read_on}. Full record: \`docs/anime/data/verify/bank-lot1.json\`. Owner packet: \`docs/anime/editorial/packets/bank-lot1.html\`.\n\n`;
m += `${data.quizzes.length} quizzes of the 85 L08 drafts, ${data.quizzes[0].date} to ${data.quizzes.at(-1).date}, 8 questions each (${data.quizzes.length * 8} questions): ${data.counts.OK} OK, ${data.counts.FIX} FIX, ${data.counts.DROP} DROP (each dropped question replaced by a new one from the same series, with its own source). The stuck row "${data.moved_row.title}" moves to ${data.moved_row.to}.\n\n`;
m += `Most DROPs are near duplicates of a published or taken question (same fact, same answer); the rest are claims the cited page does not support. Replacement questions have no fact_ids (the fact pack has no entry for them); each carries its source_url.\n\n## Schedule\n\n| Date | Series | Type | Difficulty | Title |\n|---|---|---|---|---|\n`;
for (const q of data.quizzes) m += `| ${q.date} | ${q.group_slug} | ${q.quiz_type} | ${q.difficulty} | ${q.title} |\n`;
m += `\n## FIX and DROP\n\n`;
for (const { q, v } of fixes) m += `- ${q.date} #${v.position + 1} ${v.verdict}: ${v.note}\n`;
writeFileSync(`${ROOT}/docs/anime/data/verify/bank-lot1.md`, m);
console.log('ok', fixes.length);
