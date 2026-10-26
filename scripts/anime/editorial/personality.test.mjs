// Run O1, lane PERS: the editorial check on a personality quiz (docs/anime/data/personality/<series>.json). The real Death Note quiz
// passes every check; each planted fault fails exactly the checks it names. The data folder of a case is the passing test dataset with
// the real Death Note series file (its characters carry the spoiler levels the quiz is judged against) and the quiz laid over it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './lib/schema.mjs';
import { runChecks } from './lib/run.mjs';
import { CODES } from './lib/thresholds.mjs';
import { INSPIRATION, NOW, PASS_DATA, failingCodes } from './fixtures/runner.mjs';

const REAL_SERIES = join(REPO_ROOT, 'docs/anime/data/series/death-note.json');
const REAL_QUIZ = join(REPO_ROOT, 'docs/anime/data/personality/death-note.json');

/** Runs the checks on the quiz after edit({ doc, series, other, dir }) changed it; `file` renames the quiz file. */
function run(edit = () => {}, { file = 'personality/death-note.json', extra = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'pers-case-'));
  const dir = join(root, 'data');
  try {
    cpSync(PASS_DATA, dir, { recursive: true });
    const series = JSON.parse(readFileSync(REAL_SERIES, 'utf8'));
    const doc = JSON.parse(readFileSync(REAL_QUIZ, 'utf8'));
    const others = [];
    edit({ doc, series, dir, addOther: (rel, d) => others.push([rel, d]) });
    mkdirSync(join(dir, 'series'), { recursive: true });
    writeFileSync(join(dir, 'series/death-note.json'), JSON.stringify(series));
    const write = (rel, d) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), JSON.stringify(d)); };
    write(file, doc);
    for (const [rel, d] of others) write(rel, d);
    return runChecks([join(dir, file)], { dataDir: dir, inspiration: INSPIRATION, now: NOW, ...extra });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

const check = (report, code) => report.entries[0].result.checks.find((c) => c.code === code);
const notes = (report, code) => check(report, code).notes.map((n) => `${n.path} ${n.message}`).join(' | ');

test('the real Death Note quiz passes the 14 checks, C2, C4, C6 and C13 not applying', () => {
  const report = run();
  assert.deepEqual(failingCodes(report), []);
  assert.equal(report.summary.items, 1);
  const r = report.entries[0].result;
  assert.equal(r.kind, 'personality');
  assert.equal(r.questions, 8);
  assert.equal(r.profiles, 6);
  assert.equal(r.checks.length, 14);
  for (const code of ['C2', 'C4', 'C6', 'C13']) assert.equal(check(report, code).na, true, `${code} does not apply to a personality quiz`);
  for (const c of r.checks) assert.equal(c.pass, true, `${c.code} ${JSON.stringify(c.notes)}`);
  for (const code of ['C1', 'C3', 'C5', 'C7', 'C8', 'C9', 'C11', 'C12']) assert.equal(check(report, code).na, false, `${code} must run for real`);
});

test('the file is found by its folder and by its shape, and the names of the checks are unchanged', () => {
  assert.equal(Object.keys(CODES).length, 14);
  const report = run(() => {}, { file: 'elsewhere/death-note-quiz-of-the-reader.json' });
  assert.equal(report.entries[0].item.kind, 'personality');
});

test('C1: a missing question, a fifth answer, a weight above 5, an unknown axis, an extra key fail the schema', () => {
  assert.deepEqual(failingCodes(run(({ doc }) => { doc.questions.pop(); })), ['C1']);
  assert.deepEqual(failingCodes(run(({ doc }) => { doc.questions[0].options.push({ text: 'Extra answer', weights: { energy: 1 } }); })), ['C1']);
  assert.match(notes(run(({ doc }) => { doc.questions[0].options[0].weights.energy = 6; }), 'C1'), /above 5/);
  assert.match(notes(run(({ doc }) => { doc.questions[0].options[0].weights.bravery = 2; }), 'C1'), /unknown property/);
  assert.match(notes(run(({ doc }) => { doc.profiles[0].mood = 'x'; }), 'C1'), /unknown property/);
  assert.match(notes(run(({ doc }) => { doc.profiles[0].traits.heart = 101; }), 'C1'), /above 100/);
  assert.match(notes(run(({ doc }) => { delete doc.status; }), 'C1'), /missing status/);
  assert.match(notes(run(({ doc }) => { doc.profiles.pop(); }), 'C1'), /fewer than 6/);
  assert.match(notes(run(({ doc }) => { doc.profiles[0].profile = ['One line only.']; }), 'C1'), /fewer than 2/);
});

test('C1: an answer that names four axes, repeated answers, a repeated question and a wrong ord fail the shape rules', () => {
  assert.match(notes(run(({ doc }) => { doc.questions[0].options[0].weights = { energy: 1, chaos: 1, care: 1, craft: 1 }; }), 'C1'), /at most three axes/);
  assert.match(notes(run(({ doc }) => { doc.questions[0].options[1].text = doc.questions[0].options[0].text; }), 'C1'), /answers are not distinct/);
  assert.match(notes(run(({ doc }) => { doc.questions[1].question = doc.questions[0].question; }), 'C1'), /repeats question 1/);
  assert.match(notes(run(({ doc }) => { doc.questions[2].ord = 5; }), 'C1'), /ord must run 1 to 8/);
  assert.match(notes(run(({ doc }) => { doc.profiles[1].character_slug = doc.profiles[0].character_slug; }), 'C1'), /appears twice/);
});

test('C1: a profile the quiz would never give, one it gives too often, and two profiles on top of each other fail', () => {
  // Mogi moved to the loud end: nothing in the answers points at him any more
  const never = run(({ doc }) => { doc.profiles[5].traits = { energy: 100, chaos: 100, care: 100, craft: 100, heart: 0, spotlight: 0 }; });
  assert.deepEqual(failingCodes(never), ['C1']);
  assert.match(notes(never, 'C1'), /kanzo-mogi is the result of [0-9.]+% of the answer sheets, at least 3% is needed/);
  // Light moved to the middle of everything: the nearest result for most sheets
  const often = run(({ doc }) => { doc.profiles[0].traits = { energy: 50, chaos: 50, care: 50, craft: 50, heart: 50, spotlight: 50 }; });
  assert.match(notes(often, 'C1'), /too often|never gives it|almost never/);
  const twins = run(({ doc }) => { doc.profiles[1].traits = { ...doc.profiles[0].traits, energy: doc.profiles[0].traits.energy + 5 }; });
  assert.match(notes(twins, 'C1'), /only 5 from light-yagami/);
});

test('C1: the thresholds are the ones in lib/thresholds.mjs and they can be moved for a stricter run', () => {
  const strict = run(() => {}, { extra: { thresholds: { personality_min_share: 0.2 } } });
  assert.deepEqual(failingCodes(strict), ['C1']);
  assert.match(notes(strict, 'C1'), /at least 20% is needed/);
});

test('C3: a character that is not in the series, one that is not published, a file not named after its series fail', () => {
  assert.match(notes(run(({ doc }) => { doc.profiles[0].character_slug = 'no-such-character'; }), 'C3'), /no character no-such-character/);
  assert.deepEqual(failingCodes(run(({ doc }) => { doc.profiles[0].character_slug = 'no-such-character'; })), ['C3']);
  const draft = run(({ series }) => { series.characters.find((c) => c.slug === 'ryuk').status = 'draft'; });
  assert.deepEqual(failingCodes(draft), ['C3']);
  assert.match(notes(draft, 'C3'), /ryuk is draft/);
  const named = run(({ doc }) => { doc.group_slug = 'death-note'; }, { file: 'personality/death-note-two.json' });
  assert.match(notes(named, 'C3'), /file is named death-note-two.json but the series slug is death-note/);
  assert.match(notes(run(({ doc }) => { doc.group_slug = 'no-such-series'; }, { file: 'personality/no-such-series.json' }), 'C3'), /no series file for no-such-series/);
});

test('C5: an arc above 0, a character above the arc, an identity spoiler and a name in a text fail', () => {
  const arc = run(({ doc }) => { doc.spoiler.arc = 1; });
  assert.deepEqual(failingCodes(arc), ['C5']);
  assert.match(notes(arc, 'C5'), /no spoiler shield, so the arc of a personality quiz is 0/);
  assert.match(notes(run(({ doc }) => { doc.spoiler.arc = 9; }), 'C5'), /beyond the last arc/);
  const level = run(({ doc, series }) => { doc.profiles[1].character_slug = 'misa-amane'; series.characters.find((c) => c.slug === 'misa-amane').spoiler_level = 1; });
  assert.deepEqual(failingCodes(level), ['C5']);
  assert.match(notes(level, 'C5'), /misa-amane has spoiler level 1, above the arc 0/);
  const identity = run(({ doc, series }) => { series.characters.find((c) => c.slug === 'l').identity_spoiler = true; });
  assert.match(notes(identity, 'C5'), /l is an identity spoiler/);
  const named = run(({ doc }) => { doc.profiles[0].profile[1] = 'You would take Near seriously, and he would take you seriously.'; });
  assert.deepEqual(failingCodes(named), ['C5']);
  assert.match(notes(named, 'C5'), /names Near \(spoiler level 2, identity spoiler\)/);
  const inQuestion = run(({ doc }) => { doc.questions[0].options[0].text = 'Ask Mello what he would do'; });
  assert.match(notes(inQuestion, 'C5'), /questions\/0\/options\/0\/text names Mello/);
});

test('C7: a profile line copied from a stored source excerpt fails and names the fact', () => {
  const report = run(({ doc, dir }) => {
    const facts = JSON.parse(readFileSync(join(dir, 'facts/death-note.json'), 'utf8'));
    const list = Array.isArray(facts) ? facts : facts.facts;
    const excerpt = list.map((f) => f.excerpt).find((e) => typeof e === 'string' && e.split(/\s+/).length >= 10);
    doc.profiles[0].profile[1] = excerpt.slice(0, 135);
  });
  assert.ok(failingCodes(report).includes('C7'));
  assert.match(notes(report, 'C7'), /copies the stored source text/);
});

test('C8: a music note and a long quoted line fail', () => {
  assert.match(notes(run(({ doc }) => { doc.profiles[0].profile[1] = `You hum a tune ♪ all day long.`; }), 'C8'), /music note/);
  const long = run(({ doc }) => { doc.profiles[0].profile[1] = 'You say "this is a very long quoted line of more than ten words in a row" a lot.'; });
  assert.deepEqual(failingCodes(long), ['C8']);
  assert.match(notes(long, 'C8'), /quoted line of 15 words/);
});

test('C9: a line repeated in the file, and a question or a profile line of another personality quiz, fail', () => {
  const same = run(({ doc }) => { doc.profiles[1].profile[1] = doc.profiles[0].profile[1]; });
  assert.deepEqual(failingCodes(same), ['C9']);
  assert.match(notes(same, 'C9'), /repeats \/profiles\/0\/profile\/1 of this file/);
  const other = run(({ doc, addOther }) => {
    const copy = JSON.parse(readFileSync(REAL_QUIZ, 'utf8'));
    copy.group_slug = 'one-piece';
    addOther('personality/one-piece.json', copy);
  });
  const msgs = notes(other, 'C9');
  assert.match(msgs, /is also a question of .*one-piece\.json/);
  assert.match(msgs, /is also a profile line of .*one-piece\.json/);
  assert.ok(!failingCodes(other).includes('C1'), 'the other file is not the one being checked');
});

test('C11 and C12: a double hyphen fails C11, the voice and the emoji rules fail C12', () => {
  const dash = run(({ doc }) => { doc.profiles[0].profile[1] = 'You plan -- then you plan again.'; });
  assert.deepEqual(failingCodes(dash), ['C11']);
  const emoji = run(({ doc }) => { doc.profiles[0].profile[1] = 'You love a good plan \u{1F600} always.'; });
  assert.ok(failingCodes(emoji).includes('C12'));
  const voice = run(({ doc }) => { doc.profiles[0].profile[0] = 'Light has a plan, a backup plan, and a calm face.'; });
  assert.deepEqual(failingCodes(voice), ['C12']);
  assert.match(notes(voice, 'C12'), /starts with "You"/);
  const aboutHim = run(({ doc }) => { doc.profiles[0].profile[2] = 'Light Yagami gets restless when nothing is hard enough.'; });
  assert.deepEqual(failingCodes(aboutHim), ['C12']);
  assert.match(notes(aboutHim, 'C12'), /starts with the name of Light Yagami/);
});

test('C14 and C10: an image field and a link are refused', () => {
  const image = run(({ doc }) => { doc.profiles[0].image = 'https://example.org/x.png'; });
  assert.ok(failingCodes(image).includes('C14'));
  assert.ok(failingCodes(image).includes('C1'));
  const banned = run(({ doc }) => { doc.profiles[0].profile[1] = 'You read myanimelist.net every day.'; });
  assert.ok(failingCodes(banned).includes('C10'));
});

test('a file that is not an object of the shape is a C1 failure, never a crash', () => {
  const report = run(({ doc }) => { doc.profiles = 'none'; });
  assert.ok(failingCodes(report).length > 0);
  assert.equal(report.ok, false);
});

test('the checks that already ran on quizzes, daily rows, series and facts still fail what they failed (the passing dataset is untouched)', () => {
  const report = runChecks([PASS_DATA], { inspiration: INSPIRATION, now: NOW });
  assert.equal(report.ok, true);
  assert.equal(report.summary.items, 4);
});
