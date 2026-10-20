#!/usr/bin/env node
// Run O1, lane E1a: builds the test fixtures of the content checks, deterministically.
//   node scripts/anime/editorial/fixtures/build.mjs          writes the files under fixtures/
//   import { buildFixtures }                                   returns Map(relative path -> text), for the sync test
//
// fixtures/pass/data/**         the passing dataset: Death Note series data, 15 facts, a quiz of 9 questions built from
//                               9 verified facts, a daily row of 8 true or false questions.
// fixtures/fail/<case>/data/**  the files a case replaces or adds; fixtures/fail/<case>/expect.json names the target
//                               file and the checks that must fail. One passing and one failing fixture per check.
// fixtures/inspiration-titles.json  invented titles for C13.
// fixtures/example-packet.html   the review packet of the passing dataset (fixed seed and date), to open and read.
// Everything is invented test data: the revision ids are placeholders, no network is used, no source text is copied
// (the excerpts are written for the tests).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const clone = (x) => JSON.parse(JSON.stringify(x));
const one = (x) => JSON.stringify(x).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
export function fmt(v, pad = '') {
  if (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'object' && x !== null)) return `[\n${v.map((x) => `${pad}  ${one(x)}`).join(',\n')}\n${pad}]`;
  if (v && typeof v === 'object' && !Array.isArray(v)) return `{\n${Object.keys(v).map((k) => `${pad}  ${one(k)}: ${fmt(v[k], `${pad}  `)}`).join(',\n')}\n${pad}}`;
  return one(v);
}

const WIKI = 'https://en.wikipedia.org/wiki/Death_Note';
const WIKI_CHARS = 'https://en.wikipedia.org/wiki/List_of_Death_Note_characters';
const WIKI_EPS = 'https://en.wikipedia.org/wiki/List_of_Death_Note_episodes';
const OFFICIAL = 'https://www.viz.com/death-note';
const FETCHED = '2026-10-04T10:00:00Z';
const VERIFIED = '2026-10-05T09:00:00Z';

let rev = 1000000000;
const wp = (url) => { rev += 1; return { source: 'wikipedia', url, ref: String(rev), fetched_at: FETCHED }; };
const off = () => ({ source: 'official', url: OFFICIAL, fetched_at: FETCHED });

function fact(id, entity, value, text, category, lb, arc, sources, excerpt, field) {
  const f = { id, site: 'anime', entity: { ...entity, group_slug: 'death-note' } };
  if (field) f.field = field;
  Object.assign(f, { value, text, category, load_bearing: lb, spoiler: { arc, scope: 'both' }, sources, status: 'verified', verified_at: VERIFIED, excerpt });
  return f;
}
const ser = { kind: 'series' };
const ch = (ref) => ({ kind: 'character', ref });
const th = (ref) => ({ kind: 'theme', ref });

function baseFacts() {
  return [
    fact('dn-creators-001', ser, ['Tsugumi Ohba', 'Takeshi Obata'], 'Tsugumi Ohba wrote the story of Death Note and Takeshi Obata drew it.', 'history', true, 0, [wp(WIKI), off()], 'Death Note is a Japanese manga series written by Tsugumi Ohba and illustrated by Takeshi Obata.', 'authors'),
    fact('dn-magazine-002', ser, ['Weekly Shonen Jump', 'Shueisha'], 'The Death Note manga was serialized in the magazine Weekly Shonen Jump, published by Shueisha.', 'history', true, 0, [wp(WIKI), off()], "The manga was serialized in Shueisha's Weekly Shonen Jump magazine from December 2003 to May 2006.", 'magazine'),
    fact('dn-manga-years-003', ser, '2003 to 2006', 'The Death Note manga ran from 2003 to 2006.', 'history', true, 0, [wp(WIKI), off()], 'Serialization of the manga ran from December 2003 until May 2006 in Weekly Shonen Jump.', 'manga_years'),
    fact('dn-manga-size-004', ser, '12 volumes and 108 chapters', 'The Death Note manga was collected in 12 volumes and 108 chapters.', 'history', true, 0, [wp(WIKI), off()], 'The 108 chapters were collected by Shueisha into 12 tankobon volumes.', 'manga_size'),
    fact('dn-anime-studio-005', ser, 'Madhouse', 'The Death Note anime was produced by the studio Madhouse.', 'history', true, 0, [wp(WIKI), off()], 'The anime television series was produced by Madhouse and aired on Nippon TV.', 'studios'),
    fact('dn-anime-director-006', ser, 'Tetsuro Araki', 'Tetsuro Araki directed the Death Note anime.', 'history', true, 0, [wp(WIKI), off()], 'The series was directed by Tetsuro Araki.', 'director'),
    fact('dn-anime-run-007', ser, '37 episodes in 1 season, from 2006 to 2007', 'The Death Note anime has 37 episodes and aired from 2006 to 2007.', 'history', true, 0, [wp(WIKI_EPS), off()], 'The anime ran for 37 episodes on Nippon TV between October 2006 and June 2007.', 'episodes'),
    fact('dn-titles-008', ser, ['Death Note', '\u{30c7}\u{30b9}\u{30ce}\u{30fc}\u{30c8}', 'Desu Noto'], 'Death Note is written Desu Noto in Latin letters and has a Japanese title in katakana.', 'fun', false, 0, [wp(WIKI)], 'The title Death Note is written in katakana as \u30c7\u30b9\u30ce\u30fc\u30c8 and read as Desu Noto.', 'titles'),
    fact('dn-ryuk-009', ch('ryuk'), 'Shinigami', 'Ryuk is a Shinigami, a death god who drops his notebook into the human world.', 'members', false, 0, [wp(WIKI_CHARS)], 'Ryuk is a shinigami who is bored in the shinigami realm and drops a Death Note into the human world.'),
    fact('dn-ryuk-apples-010', ch('ryuk'), 'apples', 'Ryuk loves apples, the one human food he cannot resist.', 'fun', false, 0, [wp(WIKI_CHARS)], 'Ryuk develops a craving for apples, which he finds irresistible among human foods.'),
    fact('dn-op1-011', th('op-1'), ['the WORLD', 'Nightmare'], 'The first opening of the Death Note anime is the WORLD by Nightmare.', 'music', false, 0, [wp(WIKI_EPS)], 'The first opening theme is the WORLD, performed by the band Nightmare.'),
    fact('dn-op2-012', th('op-2'), ["What's up, people?!", 'Maximum the Hormone'], "The second opening of the Death Note anime is What's up, people?! by Maximum the Hormone.", 'music', false, 0, [wp(WIKI_EPS)], "The second opening theme is What's up, people?!, performed by Maximum the Hormone."),
    fact('dn-ed1-013', th('ed-1'), ['Alumina', 'Nightmare'], 'The first ending of the Death Note anime is Alumina by Nightmare.', 'music', false, 0, [wp(WIKI_EPS)], 'The first ending theme is Alumina, performed by Nightmare.'),
    fact('dn-ed2-014', th('ed-2'), ['Zetsubou Billy', 'Maximum the Hormone'], 'The second ending of the Death Note anime is Zetsubou Billy by Maximum the Hormone.', 'music', false, 0, [wp(WIKI_EPS)], 'The second ending theme is Zetsubou Billy, performed by Maximum the Hormone.'),
    fact('dn-near-015', ch('near'), 'Near', 'Near is the young detective who takes over the hunt for Kira in the second part.', 'members', false, 2, [wp(WIKI_CHARS)], 'In the second part of the story a young detective called Near takes over the investigation.'),
  ];
}

const sp0 = { arc: 0, scope: 'both' };
function mc(question, options, kind, ids, src, fun, spoiler = sp0) {
  const q = { question, options, correct: 0, ...(fun ? { fun_fact: fun } : {}), kind, spoiler, fact_ids: ids, source_url: src };
  return q;
}

function baseQuiz() {
  return {
    site: 'anime', account: 'oq_creator_01', group_slug: 'death-note',
    title: 'Death Note Basics: Who Made It and How It Sounds', slug: 'death-note-basics-who-made-it',
    description: 'Nine questions on the people, the studio and the songs behind the Death Note anime and manga.',
    quiz_type: 'multiple_choice', difficulty: 'medium', language: 'en', title_gives_nothing_away: true,
    questions: [
      mc('Who drew the Death Note manga?', ['Takeshi Obata', 'Tsugumi Ohba', 'Hirohiko Araki', 'Yoshihiro Togashi'], 'production', ['dn-creators-001'], WIKI, 'Tsugumi Ohba wrote the story and Takeshi Obata drew the manga.'),
      mc('Which magazine first serialized the Death Note manga?', ['Weekly Shonen Jump', 'Weekly Shonen Magazine', 'Monthly Shonen Gangan', 'Weekly Young Jump'], 'production', ['dn-magazine-002'], OFFICIAL, 'The magazine is published by Shueisha.'),
      mc('Which studio animated the Death Note TV series?', ['Madhouse', 'Bones', 'Production I.G', 'Studio Pierrot'], 'production', ['dn-anime-studio-005'], WIKI, 'The anime was produced by the studio Madhouse.'),
      mc('How many episodes does the Death Note anime have?', ['37', '25', '51', '64'], 'episode', ['dn-anime-run-007'], WIKI_EPS, 'The anime aired from 2006 to 2007.'),
      mc('Who directed the Death Note anime?', ['Tetsuro Araki', 'Hiroyuki Imaishi', 'Shinichiro Watanabe', 'Kunihiko Ikuhara'], 'production', ['dn-anime-director-006'], WIKI, 'Tetsuro Araki directed the anime.'),
      mc('Which band performed the first opening of the Death Note anime?', ['Nightmare', 'Maximum the Hormone', 'Asian Kung-Fu Generation', 'UVERworld'], 'music', ['dn-op1-011'], WIKI_EPS, 'The first opening is the WORLD by Nightmare.'),
      mc('Which song is the second ending of the Death Note anime?', ['Zetsubou Billy', 'Alumina', 'the WORLD', "What's up, people?!"], 'music', ['dn-ed2-014'], WIKI_EPS, 'The second ending is Zetsubou Billy by Maximum the Hormone.'),
      mc('What kind of supernatural being is Ryuk?', ['Shinigami', 'Demon', 'Ghost', 'Vampire'], 'character', ['dn-ryuk-009'], WIKI_CHARS, 'Ryuk is a death god who drops his notebook into the human world.'),
      mc('Which food does Ryuk crave in the human world?', ['Apples', 'Peaches', 'Persimmons', 'Grapes'], 'character', ['dn-ryuk-apples-010'], WIKI_CHARS, 'Ryuk loves apples, the one human food he cannot resist.'),
    ],
    sources: [
      { id: 'S1', title: 'Death Note on Wikipedia', url: WIKI },
      { id: 'S2', title: 'Death Note on the Viz official page', url: OFFICIAL },
      { id: 'S3', title: 'List of Death Note episodes on Wikipedia', url: WIKI_EPS },
      { id: 'S4', title: 'List of Death Note characters on Wikipedia', url: WIKI_CHARS },
    ],
  };
}

function tf(question, correct, kind, ids, src) {
  return { question, correct, kind, spoiler: sp0, fact_ids: ids, source_url: src };
}

function baseDaily() {
  return [{
    site: 'anime', title: 'Death Note True or False: Studio, Songs and Page Counts', description: 'Eight true or false questions on the Death Note anime and manga.',
    group_slug: 'death-note', quiz_type: 'true_false', difficulty: 'easy', category: 'true_false',
    questions: [
      tf('The Death Note manga ran from 2003 to 2006.', true, 'manga', ['dn-manga-years-003'], WIKI),
      tf('The Death Note manga was collected in 12 volumes.', true, 'manga', ['dn-manga-size-004'], OFFICIAL),
      tf('The Death Note manga was collected in 20 volumes.', false, 'manga', ['dn-manga-size-004'], WIKI),
      tf('Madhouse is the studio behind the Death Note anime.', true, 'production', ['dn-anime-studio-005'], WIKI),
      tf('Alumina by Nightmare is the first ending of the Death Note anime.', true, 'music', ['dn-ed1-013'], WIKI_EPS),
      tf('Maximum the Hormone performed the second opening of the Death Note anime.', true, 'music', ['dn-op2-012'], WIKI_EPS),
      tf('Tetsuro Araki directed the Death Note anime.', true, 'production', ['dn-anime-director-006'], WIKI),
      tf('The Death Note anime aired from 2006 to 2007.', true, 'episode', ['dn-anime-run-007'], WIKI_EPS),
    ],
    sources: [{ id: 'S1', title: 'Death Note on Wikipedia', url: WIKI }, { id: 'S2', title: 'Death Note on the Viz official page', url: OFFICIAL }, { id: 'S3', title: 'List of Death Note episodes on Wikipedia', url: WIKI_EPS }],
  }];
}

const INSPIRATION = ['Death Note Production and Music Quiz', 'Ultimate Anime Openings Quiz', 'How Well Do You Know One Piece?', 'Name That Anime Song Test'];

const PATHS = {
  series: 'data/series/death-note.json',
  facts: 'data/facts/death-note.json',
  quiz: 'data/quizzes/death-note/death-note-basics-who-made-it.json',
  daily: 'data/daily/death-note-true-false-1.json',
};

function factsFile(facts) {
  return { $comment: 'E1a test fixture. The Wikipedia revision ids are placeholders and the excerpts are written for the tests; nothing was fetched.', slug: 'death-note', facts };
}

/** The cases: name, files the case replaces or adds (path -> object), target path, checks that must fail. */
function cases(base) {
  const out = [];
  const add = (name, target, files, fails, note) => out.push({ name, target, files, fails, note });
  const quizWith = (fn) => { const q = clone(base.quiz); fn(q); return { [PATHS.quiz]: q }; };
  const q9 = (q) => q.questions[8];

  add('c01-options', PATHS.quiz, quizWith((q) => { q.questions[0].options[1] = 'takeshi obata'; }), ['C1'], 'two options equal once case is ignored');
  add('c01-schema', PATHS.quiz, quizWith((q) => { q.difficulty = 'impossible'; }), ['C1'], 'difficulty outside the enumeration');
  { const f = clone(base.facts); f[0].sources = [f[0].sources[0]]; add('c02-one-source', PATHS.facts, { [PATHS.facts]: factsFile(f) }, ['C2'], 'verified load bearing fact with one source'); }
  { const f = clone(base.facts); f[1].status = 'draft'; delete f[1].verified_at; add('c03-draft-fact', PATHS.quiz, { [PATHS.facts]: factsFile(f) }, ['C3'], 'the quiz cites a draft fact'); }
  add('c03-missing-fact', PATHS.quiz, quizWith((q) => { q9(q).fact_ids = ['dn-missing-099']; }), ['C3', 'C4'], 'the cited fact is in no facts file');
  add('c04-unbacked', PATHS.quiz, quizWith((q) => { q.questions[0].options[0] = 'Akira Toriyama'; }), ['C4'], 'the right answer is in no cited fact');
  add('c04-type', PATHS.quiz, quizWith((q) => { q.questions[3].options[3] = 'Madhouse'; }), ['C4'], 'a studio among episode counts');
  add('c05-spoiler-mismatch', PATHS.quiz, quizWith((q) => {
    q.questions[8] = mc('Who takes over the hunt for Kira in the second part?', ['Near', 'Mello', 'Touta Matsuda', 'Soichiro Yagami'], 'character', ['dn-near-015'], WIKI_CHARS, 'Near is the young detective who takes over the hunt.', sp0);
  }), ['C5'], 'a question on an arc 2 fact tagged arc 0');
  add('c06-title', PATHS.quiz, quizWith((q) => { q.title = 'Death Note Quiz'; }), ['C6'], 'the title is the series name and quiz');
  add('c07-copy', PATHS.quiz, quizWith((q) => { q.questions[0].fun_fact = 'Death Note is a Japanese manga series written by Tsugumi Ohba and illustrated by Takeshi Obata.'; }), ['C7'], 'a source sentence copied');
  add('c08-quote', PATHS.quiz, quizWith((q) => { q.questions[7].fun_fact = 'A line goes "this quoted line has far more than ten words in it so it is too long here".'; }), ['C8'], 'a quoted line of 17 words');
  add('c09-duplicate', PATHS.quiz, (() => {
    const copy = clone(base.quiz); copy.title = 'Death Note Basics Again: Another Round'; copy.slug = 'death-note-basics-again';
    return { 'data/quizzes/death-note/death-note-basics-again.json': copy };
  })(), ['C9'], 'a second quiz with the same questions');
  add('c10-host', PATHS.quiz, quizWith((q) => { q.sources[1].url = 'https://www.example-quiz-site.com/death-note'; q.questions[1].source_url = 'https://www.example-quiz-site.com/death-note'; }), ['C10'], 'a source host that is none of the allowed ones');
  add('c10-banned', PATHS.quiz, quizWith((q) => { q.sources[1].url = 'https://myanimelist.net/manga/21/Death_Note'; q.questions[1].source_url = 'https://myanimelist.net/manga/21/Death_Note'; }), ['C1', 'C10'], 'a banned host (also refused by the schema)');
  add('c11-dash', PATHS.quiz, quizWith((q) => { q.questions[4].fun_fact = 'Tetsuro Araki \u{2013} the director \u{2013} also made other shows.'; }), ['C1', 'C11'], 'an en dash (also refused by the schema)');
  add('c12-emoji', PATHS.quiz, quizWith((q) => { q.questions[8].fun_fact = 'Ryuk loves apples \u{1F34E} above all.'; }), ['C1', 'C12'], 'an emoji (also refused by the schema)');
  add('c13-inspiration', PATHS.quiz, quizWith((q) => { q.title = 'Death Note Production and Music Trivia'; }), ['C13'], 'a title equal to an inspiration title once filler words go');
  add('c14-image', PATHS.quiz, quizWith((q) => { q.questions[2].image_url = 'https://en.wikipedia.org/wiki/Death_Note'; }), ['C1', 'C14'], 'an image field (also refused by the schema)');
  { const s = clone(base.series); s.series.episodes = 41; add('c04-series-unbacked', PATHS.series, { [PATHS.series]: s }, ['C4'], 'a series header value no fact backs'); }
  { const s = clone(base.series); s.characters[3].spoiler_level = 9; add('c05-series-level', PATHS.series, { [PATHS.series]: s }, ['C5'], 'a spoiler level beyond the last arc'); }
  return out;
}

export function buildFixtures() {
  const seed = JSON.parse(readFileSync(join(HERE, 'seed/death-note-series.json'), 'utf8'));
  const base = { series: seed, facts: baseFacts(), quiz: baseQuiz(), daily: baseDaily() };
  const files = new Map();
  files.set('pass/data/series/death-note.json', `${fmt(base.series)}\n`);
  files.set(`pass/${PATHS.facts}`, `${fmt(factsFile(base.facts))}\n`);
  files.set(`pass/${PATHS.quiz}`, `${fmt(base.quiz)}\n`);
  files.set(`pass/${PATHS.daily}`, `${fmt(base.daily)}\n`);
  files.set('inspiration-titles.json', `${fmt(INSPIRATION)}\n`);
  for (const c of cases(base)) {
    for (const [p, obj] of Object.entries(c.files)) files.set(`fail/${c.name}/${p}`, `${fmt(obj)}\n`);
    files.set(`fail/${c.name}/expect.json`, `${fmt({ target: c.target, fails: c.fails, note: c.note })}\n`);
  }
  return files;
}

export const FIXTURE_PATHS = PATHS;

/** The example review packet of the passing dataset, with a fixed seed and date: the page the owner can open to see the format. */
export async function buildExamplePacket() {
  const { runChecks } = await import('../lib/run.mjs');
  const { buildPacket } = await import('../packet.mjs');
  const report = runChecks([join(HERE, 'pass/data')], { inspiration: join(HERE, 'inspiration-titles.json'), now: '2026-10-20T00:00:00Z' });
  const note = 'Example built from the test fixtures of lane E1a: the Death Note data is invented for the tests, the Wikipedia revision ids are placeholders and nothing was fetched.';
  return buildPacket(report, { batch: 'e1a-example', seed: 'e1a-example', createdAt: '2026-10-20T08:00:00Z', note }).html;
}

if (process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  for (const [rel, text] of buildFixtures()) {
    const abs = join(HERE, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  }
  writeFileSync(join(HERE, 'example-packet.html'), await buildExamplePacket());
  console.log('fixtures and example packet written');
}
