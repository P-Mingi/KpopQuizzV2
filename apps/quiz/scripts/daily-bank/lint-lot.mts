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
//   days running, at most 3 quizzes of a group in 7 days), and duplicates against the 100+
//   bank quizzes and every published quiz (normalized text).

import { fetchAll, loadLots, norm, readClient } from './lib.mts';

import type { LotQuiz, McQuestion, TfQuestion } from './lib.mts';

const ALLOWED = [
  'en.wikipedia.org', 'www.wikidata.org', 'wikidata.org', 'musicbrainz.org', 'circlechart.kr', 'www.circlechart.kr',
  'www.billboard.com', 'billboard.com', 'koreajoongangdaily.joins.com', 'koreajoongangdaily.com', 'www.koreaherald.com',
  'koreaherald.com', 'www.koreatimes.co.kr', 'koreatimes.co.kr', 'en.yna.co.kr', 'www.nme.com', 'nme.com',
  'ibighit.com', 'www.ibighit.com', 'smtown.com', 'www.smtown.com', 'ygfamily.com', 'www.ygfamily.com', 'jype.com',
  'www.jype.com', 'hybecorp.com', 'www.hybecorp.com', 'belift.kr', 'www.belift.kr', 'starship-ent.com', 'pledis.co.kr',
  'www.pledis.co.kr', 'www.grammy.com', 'www.officialcharts.com', 'officialcharts.com', 'www.riaa.com', 'www.guinnessworldrecords.com',
];
const FORBIDDEN_DOMAIN = /kprofiles|fandom\.com|soompi|allkpop|sporcle|reddit|namu\.wiki|quiz/i;
const FORBIDDEN_WORD = /\b(dating|girlfriend|boyfriend|scandal|rumou?r|weight|height)\b/i;
const MUSIC = /\b(song|single|track|album|title track|b-side|ep|mini album|lyrics?)\b/i;
const DASH = /[\u2013\u2014]/;

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

const addDays = (d: string, n: number): string => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

async function main(): Promise<void> {
  const files = process.argv.slice(2);
  if (files.length === 0) throw new Error('usage: lint-lot.mts <lot.json> [...]');
  const lot = loadLots(files).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const db = readClient();
  const [groups, bank, quizzes] = await Promise.all([
    fetchAll<{ id: number; slug: string; name: string }>((f, t) => db.from('groups').select('id, slug, name').range(f, t)),
    fetchAll<{ title: string; questions: Array<{ question?: string }> }>((f, t) => db.from('quiz_bank').select('title, questions').range(f, t)),
    fetchAll<{ title: string; questions: Array<{ question?: string }> }>((f, t) => db.from('quizzes').select('title, questions').eq('status', 'published').order('id').range(f, t)),
  ]);
  const slugs = new Map(groups.map((g) => [g.slug, g]));
  const seenTitles = new Set([...bank, ...quizzes].map((q) => norm(q.title)));
  const seenQuestions = new Map<string, string>();
  for (const q of [...bank, ...quizzes]) for (const x of q.questions ?? []) if (x?.question) seenQuestions.set(norm(x.question), q.title);

  const lotTitles = new Set<string>();
  const lotQuestions = new Map<string, string>();
  for (const q of lot) {
    const at = `${q.scheduled_date} ${q.title}`;
    checkText(`${at} title`, q.title);
    checkText(`${at} description`, q.description ?? '');
    if (q.title.length > 45) err(at, `title over 45 characters (${q.title.length})`);
    if (seenTitles.has(norm(q.title))) err(at, 'title already used in the bank or the catalogue');
    if (lotTitles.has(norm(q.title))) err(at, 'title used twice in the lot');
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
      if (MUSIC.test(x.question) && /["“”‘’]|'[^']+'/.test(x.question)) err(w, 'quoted text in a music question');
      const k = norm(x.question);
      if (seenQuestions.has(k)) err(w, `duplicate of a question in "${seenQuestions.get(k)}"`);
      if (lotQuestions.has(k)) err(w, `duplicate of a question in "${lotQuestions.get(k)}"`);
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
  }

  // Schedule.
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
