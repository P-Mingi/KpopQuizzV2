// Automatic checks of a daily quiz lot before human review (Mission U, owner 2026-10-15).
//
//   npx tsx scripts/daily-bank/lint-lot.mts <lot.json> [more.json ...]
//
// Fails (exit 1) on any error; prints warnings and the lot's mix. Checks, per quiz:
//   shape (10 questions; multiple choice: 4 distinct options and one correct index; true or
//   false: a boolean, 4 to 6 false statements), a source on every question from an allowed
//   domain and never a forbidden one, no em or en dash, no quoted text in a music question,
//   no forbidden word, a unique title within 45 characters that is not "{group} quiz", a
//   real group slug, the schedule (no gap, no duplicate date, no same group or category two
//   days running, also against the bank rows the day before and the day after the lot, at most
//   3 quizzes of a group in 7 days), and duplicates against the 100+
//   bank quizzes and every published quiz (normalized text). Kpop only: the groups, bank rows
//   and published quizzes it reads are kpopquiz.org's (src/lib/daily-bank/kpop-scope.ts).

import { kpopLintContext } from '../../src/lib/daily-bank/kpop-scope';

import { loadLots, norm, readClient } from './lib.mts';

import type { LotQuiz, McQuestion, TfQuestion } from './lib.mts';

const ALLOWED = [
  'en.wikipedia.org', 'www.wikidata.org', 'wikidata.org', 'musicbrainz.org', 'circlechart.kr', 'www.circlechart.kr',
  'www.billboard.com', 'billboard.com', 'koreajoongangdaily.joins.com', 'koreajoongangdaily.com', 'www.koreaherald.com',
  'www.koreajoongangdaily.com', 'koreaherald.com', 'www.koreatimes.co.kr', 'koreatimes.co.kr', 'en.yna.co.kr', 'www.nme.com', 'nme.com',
  'ibighit.com', 'www.ibighit.com', 'smtown.com', 'www.smtown.com', 'ygfamily.com', 'www.ygfamily.com', 'jype.com',
  'www.jype.com', 'hybecorp.com', 'www.hybecorp.com', 'belift.kr', 'www.belift.kr', 'beliftlab.com', 'www.beliftlab.com', 'highup-ent.com', 'www.highup-ent.com', 'starship-ent.com', 'pledis.co.kr',
  'www.pledis.co.kr', 'www.grammy.com', 'www.officialcharts.com', 'officialcharts.com', 'www.riaa.com', 'www.guinnessworldrecords.com',
];
const FORBIDDEN_DOMAIN = /kprofiles|fandom\.com|soompi|allkpop|sporcle|reddit|namu\.wiki|quiz/i;
const FORBIDDEN_WORD = /\b(dating|girlfriend|boyfriend|scandal|rumou?r|weight|height)\b/i;
const MUSIC = /\b(song|single|track|album|title track|b-side|ep|mini album|lyrics?)\b/i;
const DASH = /[\u2013\u2014]/;
// Double quotes anywhere, or a single-quoted span that opens after a space or a bracket and
// closes before a space or punctuation. A possessive ("Girls' Generation's") is not a quote.
const QUOTED = /["\u201c\u201d]|(?:^|[\s(])['\u2018][^'\u2018\u2019]+['\u2019](?=[\s,.?!:;)]|$)/;

interface Finding { level: 'error' | 'warn'; where: string; msg: string }
const findings: Finding[] = [];
const err = (where: string, msg: string): void => { findings.push({ level: 'error', where, msg }); };
const warn = (where: string, msg: string): void => { findings.push({ level: 'warn', where, msg }); };

function host(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

function checkText(where: string, text: string): void {
  if (DASH.test(text)) err(where, 'em or en dash');
  if (FORBIDDEN_WORD.test(text)) err(where, `forbidden word: ${FORBIDDEN_WORD.exec(text)![0]}`);
}

function checkSource(where: string, url: string | undefined): void {
  if (!url) { err(where, 'no source'); return; }
  const h = host(url);
  if (!h) { err(where, `source is not a URL: ${url}`); return; }
  if (FORBIDDEN_DOMAIN.test(h)) { err(where, `forbidden source domain: ${h}`); return; }
  if (!ALLOWED.includes(h)) warn(where, `source domain to confirm as official or allowed: ${h}`);
}

// Topic words of a title: what is left after the words every quiz title shares. Two titles
// whose topic words overlap this much target the same search (the new page would compete
// with the old one), so the lot gets a warning to rethink the topic, not just the wording.
const STOP = new Set(['k', 'pop', 'kpop', 'quiz', 'quizzes', 'test', 'trivia', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with', 'from', 'by', 'true', 'false', 'era', 'eras', 'can', 'you', 'your', 'how', 'well', 'do', 'know', 'only', 'real', 'fans', 'pass', 'this', 'that', 'guess', 'name', 'which', 'what', 'who', 'facts', 'edition', 'challenge', 'ultimate', 'deep', 'dive', 'level']);
const topicWords = (t: string): Set<string> => new Set(norm(t).split(' ').filter((w) => w.length > 1 && !STOP.has(w)).map((w) => w.replace(/s$/, '')));
// Share of the smaller title's topic words found in the other one. Words of a group name
// alone ("ILLIT" in "ILLIT quiz") do not make two quizzes the same topic.
function topicOverlap(a: Set<string>, b: Set<string>, groupWords: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const shared = [...a].filter((w) => b.has(w));
  if (shared.every((w) => groupWords.has(w))) return 0;
  return shared.length / Math.min(a.size, b.size);
}

// Near duplicates: the same fact asked in other words. The words of a question plus its right
// answer, without the topic stop words, compared by Jaccard against every existing question.
const NEAR_DUP = 0.6;
const LOT_REPEAT = 0.5;
type AnyQ = { question?: string; options?: unknown; correct?: unknown };
const answerText = (x: AnyQ): string => (Array.isArray(x.options) && typeof x.correct === 'number' ? String(x.options[x.correct] ?? '') : typeof x.correct === 'boolean' ? String(x.correct) : '');
const factWords = (x: AnyQ): Set<string> => topicWords(`${x.question ?? ''} ${answerText(x)}`);
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return shared / (a.size + b.size - shared);
}

const addDays = (d: string, n: number): string => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

async function main(): Promise<void> {
  const files = process.argv.slice(2);
  if (files.length === 0) throw new Error('usage: lint-lot.mts <lot.json> [...]');
  const lot = loadLots(files).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const { groups, bank, quizzes } = await kpopLintContext(readClient());
  const slugs = new Map(groups.map((g) => [g.slug, g]));
  const seenTitles = new Set([...bank, ...quizzes].map((q) => norm(q.title)));
  const seenTopics = [...bank, ...quizzes].map((q) => ({ title: q.title, words: topicWords(q.title) }));
  const groupWords = new Set(groups.flatMap((g) => [...topicWords(g.name), ...topicWords(g.slug.replace(/-/g, ' '))]));
  const seenQuestions = new Map<string, string>();
  for (const q of [...bank, ...quizzes]) for (const x of q.questions ?? []) if (x?.question) seenQuestions.set(norm(x.question), q.title);
  const seenFacts = [...bank, ...quizzes].flatMap((q) => (q.questions ?? []).filter((x) => x?.question).map((x) => ({ title: q.title, words: factWords(x as AnyQ) })));

  const lotTitles = new Set<string>();
  const lotQuestions = new Map<string, string>();
  for (const q of lot) {
    const at = `${q.scheduled_date} ${q.title}`;
    checkText(`${at} title`, q.title);
    checkText(`${at} description`, q.description ?? '');
    if (q.title.length > 45) err(at, `title over 45 characters (${q.title.length})`);
    if (seenTitles.has(norm(q.title))) err(at, 'title already used in the bank or the catalogue');
    if (lotTitles.has(norm(q.title))) err(at, 'title used twice in the lot');
    const mine = topicWords(q.title);
    const close = seenTopics.filter((x) => mine.size > 0 && x.words.size > 0 && topicOverlap(mine, x.words, groupWords) >= 1 && norm(x.title) !== norm(q.title));
    if (close.length) warn(at, `same topic as existing: ${close.slice(0, 3).map((x) => `"${x.title}"`).join(', ')}${close.length > 3 ? ` (+${close.length - 3})` : ''}`);
    lotTitles.add(norm(q.title));
    const g = q.group_slug ? slugs.get(q.group_slug) : null;
    if (q.group_slug && !g) err(at, `unknown group slug: ${q.group_slug}`);
    if (g && /^(quiz )?\S+( (quiz|test))?$/.test(norm(q.title)) && [`${norm(g.name)} quiz`, `${norm(g.name)} test`, `quiz ${norm(g.name)}`].includes(norm(q.title))) err(at, 'title is just "{group} quiz"');
    if (!q.description || q.description.length < 60 || q.description.length > 160) warn(at, `description length ${q.description?.length ?? 0} (aim 90 to 150)`);
    if (!Array.isArray(q.questions) || q.questions.length !== 10) err(at, `${q.questions?.length ?? 0} questions, not 10`);
    let falseCount = 0;
    const positions = new Map<number, number>();
    (q.questions ?? []).forEach((x, i) => {
      const w = `${at} Q${i + 1}`;
      checkText(w, `${x.question} ${x.fun_fact}`);
      checkSource(w, x.source);
      if (!x.fun_fact || x.fun_fact.length < 20) warn(w, 'fun fact missing or very short');
      if (x.question.length > 140) warn(w, `question ${x.question.length} characters`);
      if (MUSIC.test(x.question) && QUOTED.test(x.question)) err(w, 'quoted text in a music question');
      const k = norm(x.question);
      if (seenQuestions.has(k)) err(w, `duplicate of a question in "${seenQuestions.get(k)}"`);
      if (lotQuestions.has(k)) err(w, `duplicate of a question in "${lotQuestions.get(k)}"`);
      if (!seenQuestions.has(k)) {
        const mineF = factWords(x as AnyQ);
        const near = seenFacts.find((f) => jaccard(mineF, f.words) >= NEAR_DUP);
        if (near) warn(w, `near duplicate of a question in "${near.title}"`);
      }
      lotQuestions.set(k, q.title);
      if (q.quiz_type === 'multiple_choice') {
        const m = x as McQuestion;
        if (!Array.isArray(m.options) || m.options.length !== 4) err(w, 'not 4 options');
        else if (new Set(m.options.map(norm)).size !== 4) err(w, 'options are not distinct');
        if (!Number.isInteger(m.correct) || m.correct < 0 || m.correct > 3) err(w, `correct index ${String(m.correct)}`);
        positions.set(m.correct, (positions.get(m.correct) ?? 0) + 1);
        for (const o of m.options ?? []) checkText(`${w} option`, o);
      } else {
        const t = x as TfQuestion;
        if (typeof t.correct !== 'boolean') err(w, 'true or false answer is not a boolean');
        if (t.correct === false) falseCount += 1;
      }
    });
    if (q.quiz_type === 'true_false' && (falseCount < 4 || falseCount > 6)) warn(at, `${falseCount} false statements (aim 4 to 6)`);
    if (q.quiz_type === 'multiple_choice' && [...positions.values()].some((n) => n > 4)) warn(at, 'right answers bunched on one position');
    // A pattern players can spot: a strict cycle (0-1-2-3-0... or 3-2-1-0...), or four in a row on one slot.
    const seq = q.quiz_type === 'multiple_choice' ? (q.questions ?? []).map((x) => (x as McQuestion).correct) : [];
    if (seq.length >= 4) {
      const cycle = (step: number): boolean => seq.every((c, i) => c === (((seq[0]! + step * i) % 4) + 4) % 4);
      let run = 1, maxRun = 1;
      for (let i = 1; i < seq.length; i++) { run = seq[i] === seq[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
      if (cycle(1) || cycle(-1)) warn(at, `right answers follow a cycle (${seq.join('')})`);
      else if (maxRun >= 4) warn(at, `right answer on the same position ${maxRun} times in a row (${seq.join('')})`);
    }
  }

  // The same fact on two days of the lot: the earlier quiz gives the later one away.
  const lotFacts = lot.flatMap((q) => (q.questions ?? []).map((x, i) => ({ date: q.scheduled_date, n: i + 1, words: factWords(x as AnyQ) })));
  for (let a = 0; a < lotFacts.length; a++) {
    for (let b = a + 1; b < lotFacts.length; b++) {
      const x = lotFacts[a]!; const y = lotFacts[b]!;
      if (x.date !== y.date && jaccard(x.words, y.words) >= LOT_REPEAT) warn(`${y.date} Q${y.n}`, `same fact as ${x.date} Q${x.n} in this lot`);
    }
  }

  // Schedule. The kpop bank row on the day before the lot and the day after it count too: the
  // first day of a lot follows the last day of the previous one.
  const idToSlug = new Map(groups.map((g) => [g.id, g.slug]));
  const live = bank.filter((b) => b.status !== 'draft' && b.scheduled_date);
  for (const [day, mine, side] of [[addDays(lot[0]!.scheduled_date, -1), lot[0]!, 'before'], [addDays(lot.at(-1)!.scheduled_date, 1), lot.at(-1)!, 'after']] as const) {
    const next = live.find((b) => b.scheduled_date === day);
    if (!next) continue;
    const slug = next.group_id != null ? idToSlug.get(next.group_id) ?? null : null;
    if (mine.group_slug && mine.group_slug === slug) err(mine.scheduled_date, `same group as the bank row the day ${side} (${day}, ${next.title})`);
    if (mine.category === next.category) err(mine.scheduled_date, `same category as the bank row the day ${side} (${day}, ${next.title})`);
  }
  for (let i = 1; i < lot.length; i++) {
    const a = lot[i - 1]!; const b = lot[i]!;
    if (b.scheduled_date === a.scheduled_date) err(b.scheduled_date, 'two quizzes on one date');
    else if (b.scheduled_date !== addDays(a.scheduled_date, 1)) err(b.scheduled_date, `gap after ${a.scheduled_date}`);
    if (a.group_slug && a.group_slug === b.group_slug) err(b.scheduled_date, `same group two days running (${b.group_slug})`);
    if (a.category === b.category) err(b.scheduled_date, `same category two days running (${b.category})`);
  }
  for (const q of lot) {
    if (!q.group_slug) continue;
    const week = lot.filter((x) => x.group_slug === q.group_slug && x.scheduled_date >= q.scheduled_date && x.scheduled_date <= addDays(q.scheduled_date, 6));
    if (week.length > 3) err(q.scheduled_date, `${q.group_slug}: more than 3 quizzes in 7 days`);
  }

  // Mix.
  const count = (key: keyof LotQuiz): Record<string, number> => lot.reduce<Record<string, number>>((acc, q) => { const k = String(q[key] ?? 'none'); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
  console.log(`${lot.length} quizzes, ${lot[0]?.scheduled_date} to ${lot.at(-1)?.scheduled_date}`);
  console.log('category', count('category'));
  console.log('difficulty', count('difficulty'));
  console.log('type', count('quiz_type'));
  console.log('groups', count('group_slug'));

  const errors = findings.filter((f) => f.level === 'error');
  for (const f of findings) console.log(`${f.level === 'error' ? 'ERROR' : 'warn '} ${f.where}: ${f.msg}`);
  console.log(errors.length ? `\n${errors.length} error(s): the lot is not ready.` : '\nNo errors.');
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
