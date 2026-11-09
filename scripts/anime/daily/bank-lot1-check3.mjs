// Applies the third reading (docs/anime/data/verify/bank-lot1-check3.json) to bank-lot1.json. Idempotent.
//   node scripts/anime/daily/bank-lot1-check3.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const dir = `${ROOT}/docs/anime/data/verify`;
const c3 = JSON.parse(readFileSync(`${dir}/bank-lot1-check3.json`, 'utf8'));
const bank = JSON.parse(readFileSync(`${dir}/bank-lot1.json`, 'utf8'));
const label = (o) => (typeof o === 'string' ? o : o.label);

let replaced = 0;
let fixed = 0;
for (const it of c3.items) {
  const quiz = bank.quizzes.find((q) => q.date === it.date);
  if (!quiz) throw new Error(`no quiz ${it.date}`);
  const k = it.index - 1;
  const v = quiz.verdicts[k];
  if (it.job === 'A') {
    v.check3 = { job: 'A', verdict: it.verdict, note: it.reason, source_url: it.source_url, revision: it.revision, read_on: c3.read_on };
    if (it.fix) {
      const opts = quiz.questions[k].options;
      const n = opts.findIndex((o) => label(o) === it.fix.option_to);
      const m = opts.findIndex((o) => label(o) === it.fix.option_from);
      if (m >= 0) { opts[m] = it.fix.option_to; fixed++; } else if (n < 0) throw new Error(`fix option not found ${it.date} #${it.index}`);
      v.check3.fix = it.fix;
    }
    continue;
  }
  // job B
  if (it.verdict === 'KEEP') { v.check3 = { job: 'B', verdict: 'KEEP', note: it.reason, read_on: c3.read_on }; continue; }
  const prev = quiz.questions[k];
  const { revision, evidence, ...q } = it.new;
  if (prev.question !== q.question) replaced++;
  quiz.questions[k] = q;
  v.check3 = {
    job: 'B', verdict: 'DUPLICATE', new: true, note: it.reason, matched: it.matched,
    original_question: it.original.question, original_options: it.original.options ?? null, original_answer: it.original.answer,
    source_url: q.source_url, revision, read_on: c3.read_on, evidence,
  };
}
for (const e of c3.quiz_edits ?? []) {
  const quiz = bank.quizzes.find((q) => q.date === e.date);
  if (e.title) quiz.title = e.title;
  if (e.description) quiz.description = e.description;
}
bank.check3 = { reader: c3.reader, read_on: c3.read_on, method: c3.method, counts: c3.counts, pages: c3.pages, extra_duplicates_not_replaced: c3.extra_duplicates_not_replaced.length };
writeFileSync(`${dir}/bank-lot1.json`, JSON.stringify(bank, null, 1) + '\n');
console.log('ok', { replaced, fixed });
