// Run O1, lane E1a: the facts file layouts the loader accepts (the contract leaves the file layout open).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REL, codeOf, failingCodes, runWith } from './fixtures/runner.mjs';

const k1Style = (f) => {
  const { id, spoiler, sources, ...rest } = f;
  return { fact_id: id, ...rest, spoiler_arc: spoiler.arc, spoiler_scope: spoiler.scope, sources: sources.map(({ source, ref, ...s }) => ({ ...s, ...(ref ? { revision_id: Number(ref) } : {}) })) };
};

test('a facts file in K1 style (fact_id, revision_id, no source kind, spoiler_arc) is read and passes, with warnings naming the aliases', () => {
  const report = runWith(({ read, write }) => { write(REL.facts, read(REL.facts).facts.map(k1Style)); }, [REL.facts, REL.quiz, REL.daily]);
  assert.deepEqual(failingCodes(report), []);
  const facts = report.entries.findIndex((e) => e.item.kind === 'facts');
  const warnings = codeOf(report, 'C1', facts).warnings.map((w) => w.message).join(' | ');
  assert.match(warnings, /fact_id read as id/);
  assert.match(warnings, /revision_id read as ref/);
  assert.match(warnings, /source kind read from the host/);
  assert.match(warnings, /spoiler_arc and spoiler_scope read as spoiler/);
});

test('a facts file keyed by fact id is read', () => {
  const report = runWith(({ read, write }) => {
    const keyed = {};
    for (const f of read(REL.facts).facts) { const { id, ...rest } = f; keyed[id] = rest; }
    write(REL.facts, keyed);
  }, [REL.facts, REL.quiz]);
  assert.deepEqual(failingCodes(report), []);
});

test('source excerpts may sit in a wrapper map, a per source field or a list', () => {
  const report = runWith(({ read, write }) => {
    const f = read(REL.facts);
    const map = {};
    f.facts.forEach((x, i) => { map[x.id] = i % 2 ? [x.excerpt] : x.excerpt; delete x.excerpt; });
    f.excerpts = map;
    write(REL.facts, f);
  }, [REL.facts, REL.quiz]);
  assert.deepEqual(failingCodes(report), []);
  const copied = runWith(({ read, write }) => {
    const f = read(REL.facts);
    f.facts[0].sources[0].source_text = f.facts[0].excerpt; delete f.facts[0].excerpt;
    write(REL.facts, f);
    const q = read(REL.quiz); q.questions[0].fun_fact = 'Death Note is a Japanese manga series written by Tsugumi Ohba and illustrated by Takeshi Obata.'; write(REL.quiz, q);
  }, [REL.quiz]);
  assert.equal(codeOf(copied, 'C7').pass, false);
});

test('a file that is an array of quiz drafts is read as several items with refs file:n', () => {
  const report = runWith(({ read, write }) => {
    const q = read(REL.quiz); const q2 = structuredClone(q); q2.slug = 'other-slug'; q2.title = 'Death Note Basics: A Second Look'; q2.questions = q2.questions.slice(0, 3).map((x) => ({ ...x, question: `${x.question} Think carefully now please.` }));
    write('quizzes/death-note/pair.json', [q, q2]);
  }, ['quizzes/death-note/pair.json']);
  assert.equal(report.entries.length, 2);
  assert.match(report.entries[0].item.ref, /pair\.json:1$/);
  assert.match(report.entries[1].item.ref, /pair\.json:2$/);
});

test('the series file may carry extra fields: each is one warning, never a failure', () => {
  const report = runWith(({ read, write }) => {
    const s = read(REL.series);
    s.group.site = 'anime'; s.series.wikidata_qid = 'Q1'; s.characters.forEach((c) => { c.affiliation = 'task force'; }); s.themes.forEach((t) => { t.deezer_playable = false; });
    write(REL.series, s);
  }, [REL.series]);
  assert.equal(report.ok, true);
  const w = codeOf(report, 'C1').warnings.map((x) => x.path);
  assert.ok(w.includes('/characters/*/affiliation') && w.includes('/themes/*/deezer_playable') && w.includes('/series/wikidata_qid'));
});

test('a series file without quizzes is valid; one with a wrong group site fails', () => {
  const ok = runWith(() => {}, [REL.series]);
  assert.equal(codeOf(ok, 'C1').pass, true);
  const bad = runWith(({ read, write }) => { const s = read(REL.series); s.group.site = 'kpop'; write(REL.series, s); }, [REL.series]);
  assert.equal(codeOf(bad, 'C1').pass, false);
});
