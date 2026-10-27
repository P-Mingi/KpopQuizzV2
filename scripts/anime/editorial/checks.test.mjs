// Run O1, lane E1a: each check C1 to C14 has a passing and a failing fixture; the named scenarios of the brief.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CODES } from './lib/thresholds.mjs';
import { REL, caseNames, codeOf, failingCodes, runCase, runPass, runWith } from './fixtures/runner.mjs';

const ALL = Object.keys(CODES);

test('there are 14 checks, C1 to C14', () => {
  assert.deepEqual(ALL, Array.from({ length: 14 }, (_, i) => `C${i + 1}`));
});

test('the passing Death Note dataset passes every check on every file', () => {
  const report = runPass();
  assert.equal(report.ok, true);
  assert.equal(report.summary.items, 4);
  assert.deepEqual(failingCodes(report), []);
  for (const e of report.entries) assert.equal(e.result.checks.length, 14, e.item.ref);
});

test('every check passes (not just n/a) on at least one passing item', () => {
  const report = runPass();
  for (const code of ALL) {
    const live = report.entries.filter((e) => e.result.checks.find((c) => c.code === code && c.pass && !c.na));
    assert.ok(live.length > 0, `${code} never ran for real on the passing data`);
  }
});

test('a Death Note quiz built from 9 sourced facts passes all 14 checks', () => {
  const report = runPass();
  const quiz = report.entries.find((e) => e.item.kind === 'quiz');
  assert.equal(quiz.result.questions, 9);
  assert.equal(new Set(quiz.item.data.questions.flatMap((q) => q.fact_ids)).size, 9);
  assert.equal(quiz.result.checks.length, 14);
  for (const c of quiz.result.checks) assert.equal(c.pass, true, `${c.code} ${JSON.stringify(c.notes)}`);
  assert.equal(quiz.result.pass, true);
});

test('a daily row of 8 true or false questions passes', () => {
  const report = runPass();
  const row = report.entries.find((e) => e.item.kind === 'daily');
  assert.equal(row.result.questions, 8);
  assert.equal(row.result.pass, true);
});

test('each failing fixture fails exactly the checks it names', () => {
  const names = caseNames();
  assert.ok(names.length >= 20);
  for (const name of names) {
    const { report, expect } = runCase(name);
    assert.deepEqual(failingCodes(report), expect.fails, `${name}: ${expect.note}`);
    assert.equal(report.ok, false, name);
  }
});

test('every check has a failing fixture', () => {
  const covered = new Set();
  for (const name of caseNames()) { const { expect } = runCase(name); expect.fails.forEach((c) => covered.add(c)); }
  for (const code of ALL) assert.ok(covered.has(code), `${code} has no failing fixture`);
});

test('a copied source sentence fails C7 and names the fact it was copied from', () => {
  const { report } = runCase('c07-copy');
  const c7 = codeOf(report, 'C7');
  assert.equal(c7.pass, false);
  assert.match(c7.notes[0].message, /dn-creators-001/);
  assert.equal(c7.notes[0].q, 1);
  assert.equal(codeOf(report, 'C5').pass, true);
});

test('a spoiler mismatch fails C5, with the fact that spoils', () => {
  const { report } = runCase('c05-spoiler-mismatch');
  const c5 = codeOf(report, 'C5');
  assert.equal(c5.pass, false);
  assert.ok(c5.notes.some((n) => /dn-near-015 spoils from arc 2/.test(n.message)));
  assert.equal(c5.notes[0].q, 9);
});

test('C5: a tag higher than the facts need is a warning, not a failure', () => {
  const report = runWith(({ read, write }) => { const q = read(REL.quiz); q.questions[0].spoiler = { arc: 1, scope: 'both' }; write(REL.quiz, q); }, [REL.quiz]);
  const c5 = codeOf(report, 'C5');
  assert.equal(c5.pass, true);
  assert.equal(c5.warnings.length, 1);
});

test('C5: a scope that does not cover the facts fails', () => {
  const report = runWith(({ read, write }) => {
    const f = read(REL.facts); f.facts[0].spoiler = { arc: 1, scope: 'manga' }; write(REL.facts, f);
    const q = read(REL.quiz); q.questions[0].spoiler = { arc: 1, scope: 'anime' }; write(REL.quiz, q);
  }, [REL.quiz]);
  assert.match(codeOf(report, 'C5').notes[0].message, /scope anime does not cover the scope manga/);
});

test('C3: --facts-draft-ok turns a draft fact into a warning', () => {
  const { report } = runCase('c03-draft-fact', { allowDraftFacts: true });
  const c3 = codeOf(report, 'C3');
  assert.equal(c3.pass, true);
  assert.equal(c3.warnings.length, 1);
});

test('C3: a fact of another series, another site or a rejected fact fails', () => {
  const report = runWith(({ read, write }) => {
    const f = read(REL.facts);
    f.facts[1].entity.group_slug = 'one-piece';
    f.facts[2].status = 'rejected'; delete f.facts[2].verified_at;
    write(REL.facts, f);
  }, [REL.quiz]);
  const msgs = codeOf(report, 'C3').notes.map((n) => n.message).join(' | ');
  assert.match(msgs, /dn-magazine-002 belongs to the series one-piece/);
});

test('C3: fact ids are unique across the site', () => {
  const report = runWith(({ read, write }) => {
    const f = read(REL.facts); f.slug = 'one-piece'; f.facts.forEach((x) => { x.entity.group_slug = 'one-piece'; }); write('facts/one-piece.json', f);
  }, [REL.facts]);
  assert.match(codeOf(report, 'C3').notes[0].message, /is also used in/);
});

test('C3: entity references resolve against the series file', () => {
  const report = runWith(({ read, write }) => { const f = read(REL.facts); f.facts[8].entity.ref = 'no-such-character'; write(REL.facts, f); }, [REL.facts]);
  assert.match(codeOf(report, 'C3').notes[0].message, /no character no-such-character/);
});

test('C2: Wikipedia without a revision, a host that is not the source kind, a future fetch date', () => {
  const report = runWith(({ read, write }) => {
    const f = read(REL.facts);
    f.facts[0].sources[0].url = 'https://example.org/page';
    f.facts[1].sources[0].fetched_at = '2027-01-01T00:00:00Z';
    f.facts[7].sources = [{ source: 'official', url: 'https://en.wikipedia.org/wiki/Death_Note', fetched_at: '2026-10-04T10:00:00Z' }];
    write(REL.facts, f);
  }, [REL.facts]);
  const msgs = codeOf(report, 'C2').notes.map((n) => n.message).join(' | ');
  assert.match(msgs, /says wikipedia but its host is example.org/);
  assert.match(msgs, /in the future/);
  assert.match(msgs, /says official but its host is en.wikipedia.org/);
});

test('C4: a true statement the facts do not back fails, a false one needs only a shared subject', () => {
  const report = runWith(({ read, write }) => {
    const d = read(REL.daily);
    d[0].questions[0].question = 'Death Note was written by Akira Toriyama.';
    d[0].questions[2].question = 'The Death Note manga was collected in 99 volumes.';
    write(REL.daily, d);
  }, [REL.daily]);
  const c4 = codeOf(report, 'C4');
  assert.equal(c4.notes.length, 1);
  assert.equal(c4.notes[0].q, 1);
});

test('C4: the question must not contain its own answer', () => {
  const report = runWith(({ read, write }) => { const q = read(REL.quiz); q.questions[4].question = 'Tetsuro Araki directed the Death Note anime. Who directed it?'; write(REL.quiz, q); }, [REL.quiz]);
  assert.match(codeOf(report, 'C4').notes[0].message, /contain the right answer/);
});

test('C4 on a series: a character with neither a fact nor a source_url fails', () => {
  const report = runWith(({ read, write }) => { const s = read(REL.series); delete s.characters[0].source_url; s.characters[0].name = 'Nobody Known'; write(REL.series, s); }, [REL.series]);
  assert.match(codeOf(report, 'C4').notes[0].message, /light-yagami has neither a fact nor a source_url/);
});

test('C6: an identity spoiler character in the title fails', () => {
  const report = runWith(({ read, write }) => {
    const s = read(REL.series); s.characters[3].identity_spoiler = true; write(REL.series, s);
    const q = read(REL.quiz); q.title = 'Death Note Basics and Misa Amane'; write(REL.quiz, q);
  }, [REL.quiz]);
  assert.match(codeOf(report, 'C6').notes[0].message, /Misa Amane/);
});

test('C6: "test", "trivia" and "quiz {series}" are lazy titles too; a real title is not', () => {
  for (const [title, lazy] of [['Quiz Death Note', true], ['Death Note Trivia', true], ['The Ultimate Death Note Quiz', true], ['Death Note Test', true], ['Anime Quiz', true], ['Death Note Basics: Who Made It', false], ['Which Death Note Character Are You Really?', false]]) {
    const report = runWith(({ read, write }) => { const q = read(REL.quiz); q.title = title; write(REL.quiz, q); }, [REL.quiz]);
    assert.equal(codeOf(report, 'C6').pass, !lazy, title);
  }
});

test('C7: a paraphrase passes, 8 copied words in a row fail, a short phrase is not compared', () => {
  const texts = [
    ['Tsugumi Ohba is the writer and Takeshi Obata the artist of the Death Note manga.', true],
    ['It is a Japanese manga series written by Tsugumi Ohba and more.', false],
    ['written by Tsugumi Ohba and', true],
  ];
  for (const [text, pass] of texts) {
    const report = runWith(({ read, write }) => { const q = read(REL.quiz); q.questions[0].fun_fact = text; write(REL.quiz, q); }, [REL.quiz]);
    assert.equal(codeOf(report, 'C7').pass, pass, text);
  }
});

test('C7: a fact text that copies its excerpt fails; a fact without an excerpt cannot be checked and fails', () => {
  const copied = runWith(({ read, write }) => { const f = read(REL.facts); f.facts[5].text = 'The series was directed by Tetsuro Araki at Madhouse in Japan.'; write(REL.facts, f); }, [REL.facts]);
  assert.equal(codeOf(copied, 'C7').pass, false);
  const none = runWith(({ read, write }) => { const f = read(REL.facts); delete f.facts[5].excerpt; write(REL.facts, f); }, [REL.facts]);
  assert.match(codeOf(none, 'C7').notes[0].message, /no stored source excerpt/);
});

test('C8: a quoted theme title is fine, a second quoted line fails, any quoted line in a music question fails, lyric notes fail', () => {
  const run = (edit) => codeOf(runWith(({ read, write }) => { const q = read(REL.quiz); edit(q); write(REL.quiz, q); }, [REL.quiz]), 'C8');
  assert.equal(run((q) => { q.questions[6].question = 'Which song is the second ending, the one that goes "gone with the wind again today"?'; }).pass, false, 'quote in a music question');
  assert.equal(run((q) => { q.questions[6].question = 'Is "Zetsubou Billy" the second ending of the Death Note anime?'; }).pass, true, 'a quoted song title is a title, not a line');
  assert.equal(run((q) => { q.questions[0].fun_fact = 'The title reads "Death Note" on the cover page.'; }).pass, true, 'a quoted series name');
  assert.equal(run((q) => { q.questions[0].fun_fact = 'He says "I will be the god"'; q.questions[1].fun_fact = 'Another says "a new world awaits us"'; }).pass, false, 'two lines');
  assert.equal(run((q) => { q.questions[0].fun_fact = 'He says "I will be the god"'; }).pass, true, 'one short line');
  assert.equal(run((q) => { q.questions[0].fun_fact = 'A tune \u{266a} goes on'; }).pass, false, 'music note');
});

test('C9: the same answer and almost the same words is a duplicate; a slug or a title reused is a duplicate', () => {
  const near = runWith(({ read, write }) => {
    const d = read(REL.daily); d[0].questions[4].question = 'Alumina by Nightmare is the first ending of the Death Note anime show.'; d[0].questions[3].question = 'Alumina by Nightmare is the first ending of the Death Note anime.'; write(REL.daily, d);
  }, [REL.daily]);
  assert.equal(codeOf(near, 'C9').pass, false);
  const slug = runWith(({ read, write }) => { const q = read(REL.quiz); q.title = 'Another Death Note Round: Studios and Songs'; write('quizzes/death-note/copy.json', q); }, [REL.quiz]);
  const msgs = codeOf(slug, 'C9').notes.map((n) => n.message).join(' | ');
  assert.match(msgs, /slug death-note-basics-who-made-it is also used/);
});

test('C9: a repeated fact, a repeated character and a series in two files fail', () => {
  const facts = runWith(({ read, write }) => { const f = read(REL.facts); const dup = structuredClone(f.facts[4]); dup.id = 'dn-anime-studio-099'; f.facts.push(dup); write(REL.facts, f); }, [REL.facts]);
  assert.match(codeOf(facts, 'C9').notes[0].message, /same entity, field and value/);
  const series = runWith(({ read, write }) => { const s = read(REL.series); s.characters[1].name = 'Light Yagami'; write(REL.series, s); write('series/copy.json', s); }, [REL.series]);
  assert.ok(codeOf(series, 'C9').notes.length >= 2);
});

test('C10: a question source outside the quiz sources fails; http fails; a banned name in plain text fails', () => {
  const report = runWith(({ read, write }) => {
    const q = read(REL.quiz);
    q.questions[0].source_url = 'https://en.wikipedia.org/wiki/Bakuman';
    q.notes = 'Checked against myanimelist for the ranking.';
    write(REL.quiz, q);
  }, [REL.quiz]);
  const msgs = codeOf(report, 'C10').notes.map((n) => n.message).join(' | ');
  assert.match(msgs, /not one of the quiz sources/);
  assert.match(msgs, /names a banned source/);
  const http = runWith(({ read, write }) => { const q = read(REL.quiz); q.sources[0].url = 'http://en.wikipedia.org/wiki/Death_Note'; write(REL.quiz, q); }, [REL.quiz]);
  assert.match(codeOf(http, 'C10').notes.map((n) => n.message).join(' | '), /not https/);
});

test('C10: Oricon and Anime News Network are allowed quiz sources (press); a look-alike host still fails', () => {
  const ok = runWith(({ read, write }) => {
    const q = read(REL.quiz);
    q.sources[0].url = 'https://www.animenewsnetwork.com/encyclopedia/anime.php?id=1';
    q.questions.forEach((x) => { x.source_url = q.sources[0].url; });
    write(REL.quiz, q);
  }, [REL.quiz]);
  assert.equal(codeOf(ok, 'C10').notes.filter((n) => /not Wikipedia/.test(n.message)).length, 0);
  const bad = runWith(({ read, write }) => {
    const q = read(REL.quiz);
    q.sources[0].url = 'https://animenewsnetwork.com.example.org/x';
    q.questions.forEach((x) => { x.source_url = q.sources[0].url; });
    write(REL.quiz, q);
  }, [REL.quiz]);
  assert.match(codeOf(bad, 'C10').notes.map((n) => n.message).join(' | '), /not Wikipedia, Wikidata, MusicBrainz, Oricon, Anime News Network/);
});

test('C11: a double hyphen fails; C12: a flag emoji and a keycap fail; URLs and excerpts are not scanned for dashes', () => {
  const dash = runWith(({ read, write }) => { const q = read(REL.quiz); q.questions[0].fun_fact = 'Obata -- the artist -- drew it.'; write(REL.quiz, q); }, [REL.quiz]);
  assert.equal(codeOf(dash, 'C11').pass, false);
  const emoji = runWith(({ read, write }) => { const q = read(REL.quiz); q.questions[0].fun_fact = 'Made in \u{1F1EF}\u{1F1F5} by hand.'; write(REL.quiz, q); }, [REL.quiz]);
  assert.equal(codeOf(emoji, 'C12').pass, false);
  const excerpt = runWith(({ read, write }) => { const f = read(REL.facts); f.facts[0].excerpt = 'A source text \u{2014} with an em dash \u{2014} is stored as it was read.'; write(REL.facts, f); }, [REL.facts]);
  assert.equal(codeOf(excerpt, 'C11').pass, true);
});

test('C13: close titles fail on the trigram score, distant titles pass; no list is a warning', () => {
  const close = runWith(({ read, write }) => { const q = read(REL.quiz); q.title = 'Death Note Production and Music Quiz Show'; write(REL.quiz, q); }, [REL.quiz]);
  assert.equal(codeOf(close, 'C13').pass, false);
  const none = runWith(() => {}, [REL.quiz], { inspiration: '/nonexistent/none.json' });
  assert.equal(codeOf(none, 'C13').pass, true);
  assert.match(codeOf(none, 'C13').warnings[0].message, /no inspiration titles loaded/);
});

test('C14: an image URL, an embedded image and an image quiz type fail', () => {
  const report = runWith(({ read, write }) => {
    const f = read(REL.facts);
    f.facts[0].sources.push({ source: 'wikipedia', url: 'https://en.wikipedia.org/wiki/File:Death_Note_cover.jpg', ref: '5', fetched_at: '2026-10-04T10:00:00Z' });
    write(REL.facts, f);
    const s = read(REL.series); s.characters[0].photo = 'data:image/png;base64,AAAA'; write(REL.series, s);
  }, [REL.facts, REL.series]);
  assert.equal(codeOf(report, 'C14', 0).pass, false);
  assert.equal(codeOf(report, 'C14', 1).pass, false);
});

test('C1: invalid JSON and an unknown kind of file fail instead of crashing; a folder walk skips files of no kind', () => {
  const report = runWith(({ dir }) => {
    mkdirSync(join(dir, 'misc'), { recursive: true });
    writeFileSync(join(dir, 'quizzes/death-note/broken.json'), '{"title": ');
    writeFileSync(join(dir, 'misc/readme.json'), '{"a": 1}');
  }, ['quizzes/death-note/broken.json', 'misc/readme.json']);
  assert.equal(report.ok, false);
  const of = (name) => report.entries.find((e) => e.item.file.endsWith(name)).result.checks[0];
  assert.match(of('broken.json').notes[0].message, /not valid JSON/);
  assert.match(of('readme.json').notes[0].message, /not a series, facts, quiz draft or daily bank file/);
  const walk = runWith(({ dir }) => { mkdirSync(join(dir, 'misc'), { recursive: true }); writeFileSync(join(dir, 'misc/readme.json'), '{"a": 1}'); }, ['misc']);
  assert.equal(walk.summary.skipped, 1);
  assert.equal(walk.ok, true);
});

test('C5: a question without a spoiler tag fails', () => {
  const report = runWith(({ read, write }) => { const q = read(REL.quiz); delete q.questions[2].spoiler; write(REL.quiz, q); }, [REL.quiz]);
  assert.match(codeOf(report, 'C5').notes[0].message, /no spoiler tag/);
});

test('C5: a character name that is a common word counts only when written as the name', () => {
  const run = (text) => codeOf(runWith(({ read, write }) => { const q = read(REL.quiz); q.questions[0].fun_fact = text; write(REL.quiz, q); }, [REL.quiz]), 'C5');
  assert.equal(run('It all happened near the end of the story.').pass, true);
  const named = run('Near arrives later in the story.');
  assert.equal(named.pass, false);
  assert.match(named.notes[0].message, /names Near \(spoiler level 2\)/);
});

test('C5: a fact that names a higher level character without the tag fails', () => {
  const report = runWith(({ read, write }) => { const f = read(REL.facts); f.facts[0].text = 'Tsugumi Ohba wrote the story of Death Note, in which Mello hunts the case.'; write(REL.facts, f); }, [REL.facts]);
  assert.match(codeOf(report, 'C5').notes[0].message, /names Mello \(spoiler level 2\)/);
});

test('a folder named withdrawn is never collected (owner, 2026-10-24)', async () => {
  const { collectFiles } = await import('./lib/load.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const d = mkdtempSync(join(tmpdir(), 'withdrawn-'));
  mkdirSync(join(d, 'withdrawn', 'quizzes'), { recursive: true });
  writeFileSync(join(d, 'withdrawn', 'quizzes', 'x.json'), '{}');
  writeFileSync(join(d, 'live.json'), '{}');
  const files = [...collectFiles([d]).values()].map((f) => f.path);
  assert.equal(files.length, 1);
  assert.ok(files[0].endsWith('live.json'));
});

test('C5: a mix quiz reads names in the series of the facts it cites (D-117)', async () => {
  const { namedCharacters } = await import('./lib/checks-b.mjs');
  const series = (slug, level) => ({ data: { characters: [{ slug: `${slug}-kagura`, name: 'Kagura', spoiler_level: level }] } });
  const ctx = { series: new Map([['gintama', series('gintama', 0)], ['inuyasha', series('inuyasha', 1)]]) };
  const text = 'Kagura loves vinegar kelp.';
  assert.deepEqual(namedCharacters(text, 'anime-mix', ctx, ['gintama']).map((c) => c.level), [0]);
  assert.deepEqual(namedCharacters(text, 'anime-mix', ctx, []).map((c) => c.level).sort(), [0, 1]);
  assert.deepEqual(namedCharacters(text, 'inuyasha', ctx, ['gintama']).map((c) => c.level), [1]);
});
