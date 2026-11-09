// Writes the owner review packet and the short summary of anime bank lot 2 from docs/anime/data/verify/bank-lot2.json.
//   node scripts/anime/daily/bank-lot2-docs.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const data = JSON.parse(readFileSync(`${ROOT}/docs/anime/data/verify/bank-lot2.json`, 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const label = (o) => (typeof o === 'string' ? o : o.label);
const wiki = (u, rev) => `${u}${u.includes('?') ? '&' : '?'}oldid=${rev}`;

const css = `:root{--bg:#fbfaf7;--fg:#1d1d1f;--mut:#5b5b63;--line:#d9d6cc;--card:#fff;--bad:#a4161a;--badbg:#fdecec;--warn:#8a5a00;--warnbg:#fff5dc;--ok:#1b6b3a;--okbg:#e8f6ee;--acc:#2d4a9a}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececf0;--mut:#a0a0aa;--line:#34343c;--card:#1c1c20;--bad:#ff8a8d;--badbg:#3a1618;--warn:#f0c060;--warnbg:#33290f;--ok:#7fd9a0;--okbg:#14301f;--acc:#9db4ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:64rem;margin:0 auto;padding:12px 14px 48px}h1{font-size:1.45rem}h2{font-size:1.15rem;margin:1.6em 0 .3em;border-top:2px solid var(--line);padding-top:.4em}
a{color:var(--acc);overflow-wrap:anywhere}.mut{color:var(--mut)}.small{font-size:.88rem}table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{border:1px solid var(--line);padding:3px 6px;text-align:left}
.sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:8px}.sum div{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px}.sum b{display:block;font-size:1.3rem}
.q{border-top:1px solid var(--line);padding:8px 0}.q.fix{background:var(--warnbg);padding:8px;border-radius:6px}.q.drop{background:var(--badbg);padding:8px;border-radius:6px}
ol.o{margin:.2em 0 .2em 1.2em;padding:0}ol.o li.c{color:var(--ok);font-weight:600}.tag{display:inline-block;font-size:.76rem;border:1px solid var(--line);border-radius:999px;padding:0 8px;margin-right:4px}
.q.c3{background:var(--okbg);padding:8px;border-radius:6px}.tag.c3{color:var(--acc);border-color:var(--acc)}.tag.fix{color:var(--warn);border-color:var(--warn)}.tag.drop{color:var(--bad);border-color:var(--bad)}.tag.ok{color:var(--ok);border-color:var(--ok)}.why{color:var(--warn)}.was{color:var(--mut);text-decoration:line-through}`;

const nq = data.quizzes.length;
let h = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Review packet bank-lot2</title><style>${css}</style></head><body><main>\n`;
h += `<h1>Anime daily bank, lot 2: review packet</h1><p class="mut small">${nq} quizzes, ${data.quizzes[0].date} to ${data.quizzes.at(-1).date}. Every question was re-read on ${data.read_on} from its cited Wikipedia page at a pinned revision (the link opens that revision). Almost every L08 draft question repeated a fact already asked in a published, taken or lot 1 quiz, so ${data.counts.NEW} of ${nq * 8} questions are new, each on a fact asked nowhere. Three readings: the writer, then a second reader (${data.check2.counts.CONFIRMED} confirmed, ${data.check2.counts.FIX} fixed, ${data.check2.counts.REJECT} replaced), then a third reader (${data.check3.counts.CONFIRMED} confirmed, ${data.check3.counts.FIX} fixed, ${data.check3.counts.REJECT} replaced), then two more independent readers for ORCH (CHECK 4: ${data.check4.counts.CONFIRMED} confirmed, ${data.check4.counts.changed} changed: ${data.check4.counts.LEAK} answer leaks, ${data.check4.counts.DUPLICATE} duplicate, ${data.check4.counts.SOURCE} source links). Correct answers are in green; yellow = a question changed by a reader (tags CHECK 2 / CHECK 3), the old text is struck through.</p>\n`;
h += `<div class="sum"><div><b>${data.counts.OK}</b>OK (draft kept)</div><div><b>${data.counts.FIX}</b>FIX (draft kept, corrected)</div><div><b>${data.counts.NEW}</b>NEW questions</div><div><b>${data.counts.DROP}</b>DROP (draft questions)</div><div><b>${data.check2.counts.FIX + data.check2.counts.REJECT}</b>changed by check 2</div><div><b>${data.check3.counts.FIX + data.check3.counts.REJECT}</b>changed by check 3</div><div><b>${nq}</b>quizzes</div></div>\n`;
h += `<h2>Schedule</h2><table><tr><th>Date</th><th>Series</th><th>Type</th><th>Difficulty</th><th>Title</th></tr>\n`;
for (const q of data.quizzes) h += `<tr><td>${q.date}</td><td>${esc(q.group_slug)}</td><td>${esc(q.quiz_type)}</td><td>${esc(q.difficulty)}</td><td><a href="#d${q.date}">${esc(q.title)}</a></td></tr>\n`;
h += `</table>\n`;
for (const q of data.quizzes) {
  h += `<h2 id="d${q.date}">${q.date}: ${esc(q.title)}</h2><p class="small">${esc(q.description)} <span class="mut">(${esc(q.group_slug)}, ${esc(q.quiz_type)}, ${esc(q.difficulty)}${q.title !== q.l08_title ? `; draft title "${esc(q.l08_title)}"` : ''})</span></p>\n`;
  q.questions.forEach((x, k) => {
    const v = q.verdicts[k];
    const ch = [v.check2 && v.check2.verdict !== 'CONFIRMED' ? ['CHECK 2', v.check2] : null, v.check3 && v.check3.verdict !== 'CONFIRMED' ? ['CHECK 3', v.check3] : null, v.check4 ? ['CHECK 4', v.check4] : null].filter(Boolean);
    const cls = ch.length ? 'c3' : v.verdict === 'FIX' ? 'fix' : '';
    h += `<div class="q ${cls}"><b>${k + 1}.</b> ${esc(x.question)} <span class="tag ${v.verdict === 'NEW' ? 'c3' : v.verdict === 'FIX' ? 'fix' : 'ok'}">${v.verdict}</span>`;
    for (const [n, c] of ch) h += ` <span class="tag fix">${n} ${c.verdict === 'REJECT' ? 'REPLACED' : 'FIX'}</span>`;
    if (x.clues) h += `<div class="small mut">${x.clues.map(esc).join(' / ')}</div>`;
    if ('options' in x) h += `<ol class="o" type="A">${x.options.map((o, n) => `<li${n === x.correct ? ' class="c"' : ''}>${esc(label(o))}</li>`).join('')}</ol>`;
    else h += `<div>Answer: <b style="color:var(--ok)">${x.correct ? 'True' : 'False'}</b></div>`;
    h += `<div class="small"><a href="${esc(wiki(x.source_url, v.revision))}">source</a> <span class="mut">rev ${v.revision}, read ${v.read_on}</span></div>`;
    for (const [n, c] of ch) h += `<div class="small why">${n}: ${esc(c.note)}${c.before ? ` <span class="was">${esc(c.before)}</span>` : ''}</div>`;
    if (v.verdict !== 'OK' && v.note) h += `<div class="small mut">${esc(v.note)}</div>`;
    h += `</div>\n`;
  });
  if (q.dropped.length) h += `<details><summary class="small mut">${q.dropped.length} draft question${q.dropped.length > 1 ? 's' : ''} dropped</summary><ul class="small">${q.dropped.map((d) => `<li>#${d.draft_index + 1} ${esc(d.question)} <span class="why">${esc(d.reason)}</span></li>`).join('')}</ul></details>\n`;
}
h += `</main></body></html>\n`;
writeFileSync(`${ROOT}/docs/anime/editorial/packets/bank-lot2.html`, h);

let m = `# Anime daily bank, lot 2: verification summary\n\nRead on ${data.read_on}. Full record: \`docs/anime/data/verify/bank-lot2.json\`. Owner packet: \`docs/anime/editorial/packets/bank-lot2.html\`.\n\n`;
m += `${nq} quizzes of the 58 L08 drafts left after lot 1, ${data.quizzes[0].date} to ${data.quizzes.at(-1).date}, 8 questions each (${nq * 8} questions): ${data.counts.OK} OK, ${data.counts.FIX} FIX (draft question kept), ${data.counts.NEW} NEW (questions written from a page read at a pinned revision), ${data.counts.DROP} DROP (draft questions not kept).\n\n`;
m += `The L08 drafts were built on the same fact pack as the published quizzes: almost every draft question repeated a fact already asked in the 270 published anime quizzes, the taken rows or lot 1 (reason of nearly every DROP). The lot is therefore rebuilt on new facts; each new question carries its own source_url and no fact_ids. Titles or descriptions changed where the new content no longer matched the draft (the draft title stays the key of the SQL guard).\n\n`;
m += `Three readings of every question, each at the pinned revision: the writer, a second reader (check2: ${data.check2.counts.CONFIRMED} confirmed, ${data.check2.counts.FIX} fixed, ${data.check2.counts.REJECT} replaced) and a third reader (check3: ${data.check3.counts.CONFIRMED} confirmed, ${data.check3.counts.FIX} fixed, ${data.check3.counts.REJECT} replaced) and two further independent readers for ORCH (check4: ${data.check4.counts.CONFIRMED} confirmed, ${data.check4.counts.changed} changed, all applied). Duplicates were searched with \`scripts/anime/daily/dupcheck.py\` (TF-IDF over every question already asked) and by grep; clue-style published quizzes were the main source of duplicates the tool missed.\n\n`;
m += `## Schedule\n\n| Date | Series | Type | Difficulty | Title |\n|---|---|---|---|---|\n`;
for (const q of data.quizzes) m += `| ${q.date} | ${q.group_slug} | ${q.quiz_type} | ${q.difficulty} | ${q.title} |\n`;
m += `\n## Kept draft questions (OK and FIX)\n\n`;
for (const q of data.quizzes) q.verdicts.forEach((v) => { if (v.verdict === 'OK' || v.verdict === 'FIX') m += `- ${q.date} #${v.position + 1} ${v.verdict}: ${q.questions[v.position].question}${v.verdict === 'FIX' ? ` (${v.note})` : ''}\n`; });
m += `\n## Changes by the second and third readers\n\n`;
for (const q of data.quizzes) q.verdicts.forEach((v) => { for (const [n, c] of [['check2', v.check2], ['check3', v.check3], ['check4', v.check4]]) if (c && c.verdict !== 'CONFIRMED') m += `- ${q.date} #${v.position + 1} ${n} ${c.verdict === 'REJECT' ? 'REPLACED' : c.verdict === 'FIX' ? 'FIX' : c.verdict}: ${c.note}${n === 'check4' && c.before ? ` (before: ${c.before})` : ''}\n`; });
writeFileSync(`${ROOT}/docs/anime/data/verify/bank-lot2.md`, m);
console.log('ok', nq);
