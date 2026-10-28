// SEO (owner, 2026-10-13): the <title> and meta description of a quiz page, /q/<slug>.
// Pure, unit tested (quiz-meta.test.ts), applied to every quiz, new ones included.
//
// Title: the root layout appends " | KpopQuiz" (11 characters); Bing and Google show
// about 60, so the page's own part stays within TITLE_MAX. The quiz's own title comes
// first and is never cut inside a word: " · N questions" is added only when it fits, and a
// long title keeps its first words and its last ones (quiz titles in this catalogue often
// differ by their ending: "... girl groups" / "... boy groups", "(2)").
//
// Description: the creator's note when it says something (a note of a few words, like
// "easy quiz", is not a description); else a sentence built from the quiz's real data.

import { GENRE } from '@/lib/site/genre';
import { SITE } from '@/lib/site/registry';
import { contentTopics, TOPIC_QUALIFIER } from '@/lib/hubs/topics';

export const TITLE_MAX = 49;
export const DESCRIPTION_MAX = 158;
/** Bing reports descriptions under about 120 characters as too short: a short one gets a last line. */
export const DESCRIPTION_MIN = 120;
/** A creator note shorter than this is not used as the description. */
export const NOTE_MIN = 70;
const TAIL_MAX = 14;

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Cut on a word boundary to at most `max` characters, with "..." when something was cut. */
export function clipWords(text: string, max: number): string {
  const t = clean(text);
  if (t.length <= max) return t;
  const room = max - 3;
  const cut = t.slice(0, room + 1);
  const space = cut.lastIndexOf(' ');
  const head = (space > room * 0.5 ? cut.slice(0, space) : t.slice(0, room)).replace(/[\s,;:.\-·]+$/, '');
  return `${head}...`;
}

/** First words and last words of a long title, cut on word boundaries, within `max`. */
function shorten(title: string, max: number): string {
  const words = title.split(' ');
  let tailFrom = words.length;
  for (let i = words.length - 1; i > 0; i--) {
    if (words.slice(i).join(' ').length > TAIL_MAX) break;
    tailFrom = i;
  }
  const tail = tailFrom < words.length ? words.slice(tailFrom).join(' ') : '';
  const room = max - (tail ? tail.length + 4 : 3); // "head... tail" or "head..."
  let head = '';
  for (let i = 0; i < tailFrom; i++) {
    const next = head ? `${head} ${words[i]}` : words[i]!;
    if (next.length > room) break;
    head = next;
  }
  if (!head) return clipWords(title, max);
  head = head.replace(/[\s,;:.\-·]+$/, '');
  return tail ? `${head}... ${tail}` : `${head}...`;
}

/** The page's part of the <title> ("| KpopQuiz" is added by the layout). */
export function quizTitle(title: string, questionCount: number): string {
  const t = clean(title);
  const withCount = `${t} · ${questionCount} question${questionCount === 1 ? '' : 's'}`;
  if (withCount.length <= TITLE_MAX) return withCount;
  if (t.length <= TITLE_MAX) return t;
  return shorten(t, TITLE_MAX);
}

export interface QuizDescriptionInput {
  title: string;
  difficulty: string;
  questionCount: number;
  groupName: string;
  creator: string;
  plays: number;
  /** averageText() of the quiz average (lib/quiz/quiz-average.ts, from 30 completed plays), else null.
   *  Passed as text so this module, read by other pages, keeps its imports. */
  average: string | null;
  creatorNote: string | null;
}

const article = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a');

export function quizDescription(q: QuizDescriptionInput): string {
  const note = q.creatorNote ? clean(q.creatorNote) : '';
  if (note.length >= NOTE_MIN) return clipWords(note, DESCRIPTION_MAX);
  const n = q.questionCount;
  let s = `${clean(q.title)}: ${article(q.difficulty)} ${q.difficulty} ${n}-question ${GENRE} quiz on ${q.groupName}, made by ${q.creator}.`;
  const plays = q.plays.toLocaleString('en-US');
  // The facts first; the call to action only when it fits whole (never "Can you beat...").
  const parts = q.plays <= 0
    ? [` New on ${SITE.brand.name}: be one of the first to play it.`]
    : [q.average !== null
      ? ` ${plays} ${q.plays === 1 ? 'fan has' : 'fans have'} played it: ${q.average}.`
      : ` Played by ${plays} ${q.plays === 1 ? 'fan' : 'fans'}.`, ' Can you beat them?'];
  for (const p of parts) if ((s + p).length <= DESCRIPTION_MAX) s += p;
  const tail = ' Free to play, no sign-up.';
  if (s.length < DESCRIPTION_MIN && (s + tail).length <= DESCRIPTION_MAX) s += tail;
  return clipWords(s, DESCRIPTION_MAX);
}

// ---------------------------------------------------------------------------
// SEO Mission 2 (owner, 2026-10-14; rulebook 1.5): only the hub /{group}-quiz may be titled
// "{Group} Quiz". A fan quiz whose title, normalized, is exactly "{group} quiz", "{group} test"
// or "quiz {group}" competes with its hub for the same query, so its SEO title and its H1 get
// a qualifier read from its own content ("ILLIT members quiz"); the creator's title stays on
// the page as the subtitle. Nothing is stored or rewritten: the slug and the stored title stay.
// ---------------------------------------------------------------------------

/** Lowercase, accents folded, every run of non-alphanumerics one space. */
export function normalizeTitle(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** True when the title is only "{group} quiz", "{group} test" or "quiz {group}". */
export function isGenericGroupTitle(title: string, groupName: string, groupSlug?: string | null): boolean {
  const t = normalizeTitle(title);
  const names = new Set([normalizeTitle(groupName), groupSlug ? normalizeTitle(groupSlug) : ''].filter(Boolean));
  for (const n of names) {
    if (t === `${n} quiz` || t === `${n} test` || t === `quiz ${n}`) return true;
  }
  return false;
}

const TYPE_QUALIFIER: Record<string, string> = {
  true_false: 'true or false',
  guess_from_clues: 'guess from clues',
  image: 'picture',
  intruder: 'odd one out',
};

export interface QualifierInput {
  title: string;
  groupName: string;
  groupSlug?: string | null;
  quizType: string;
  difficulty: string;
  /** The question prompts (the quiz's own content). */
  prompts: readonly string[];
}

/**
 * The title a quiz page shows in its <title> and H1: the creator's own title, unless it is a
 * generic "{group} quiz". Then "{Group} {qualifier} quiz", the qualifier read from the quiz:
 * the topic most of its questions are about ("members", "songs", "history"...) or its two
 * main topics ("members and songs"), else its format ("true or false", "picture"...), else
 * its difficulty ("hard trivia", "fan trivia"). The group is written as the groups table
 * writes it (rulebook 2.5).
 */
export function qualifiedQuizTitle(q: QualifierInput): string {
  const own = clean(q.title);
  if (!isGenericGroupTitle(own, q.groupName, q.groupSlug)) return own;
  const topics = contentTopics(q.prompts);
  const qualifier = topics.length > 0
    ? topics.map((t) => TOPIC_QUALIFIER[t]).join(' and ')
    : TYPE_QUALIFIER[q.quizType] ?? (q.difficulty === 'easy' || q.difficulty === 'hard' ? `${q.difficulty} trivia` : 'fan trivia');
  return `${clean(q.groupName)} ${qualifier} quiz`;
}
