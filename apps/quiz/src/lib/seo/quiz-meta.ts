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

import { TEAM_AUTHOR_NAME, TEAM_BYLINE } from './team-byline';
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

// ---------------------------------------------------------------------------
// Audit 04 P1-2 (owner, 2026-11-09): the <title> of a quiz page names the group and says "quiz", which the creator's own title
// often does not ("are u a real GLLIT?!! · 3 questions"). The creator's words stay (punctuation runs collapsed), then
// "{Group} quiz, N questions" or "N-question quiz" for whatever is missing. The H1 and the stored title do not change.
// ---------------------------------------------------------------------------

/** "?!!" becomes "?", "!!!" becomes "!", "~~" becomes "~", "..." stays a clean ellipsis: a run of the same kind of mark is one mark. */
export function collapsePunctuation(s: string): string {
  return clean(s)
    .replace(/([!?])[!?]+/g, '$1')
    .replace(/([~*_#=+^])\1+/g, '$1')
    .replace(/\.{4,}/g, '...')
    .replace(/\s+([!?,.])/g, '$1');
}

const plural = (n: number): string => `${n} question${n === 1 ? '' : 's'}`;

/** Cut at the last word boundary that fits in `max`, at the end: no ellipsis, no trailing punctuation or dangling separator. */
export function cutAtWord(text: string, max: number): string {
  const t = clean(text);
  if (t.length <= max) return t;
  const head = t.slice(0, max + 1);
  const space = t.charAt(max) === ' ' ? max : head.lastIndexOf(' ');
  const cut = space > 0 ? t.slice(0, space) : t.slice(0, max);
  return cut.replace(/[\s,;:.\-\u2013\u2014·(\[/&+]+$/, '');
}

/** The names a creator may use for the group: its name, its slug, the name without spaces; for General K-pop also "K-pop". */
function groupAliases(name: string, slug?: string | null): string[] {
  const n = normalizeTitle(name);
  const out = new Set<string>([n, n.replace(/ /g, '')]);
  if (slug) out.add(normalizeTitle(slug));
  if (n === 'general k pop' || n === 'general kpop') { out.add('k pop'); out.add('kpop'); }
  out.delete('');
  return [...out];
}

/**
 * The title of a quiz page. The creator's words are never shortened to make room for something we add (audit 04 P1-2, ORCH follow-up):
 *   a. a title that already names the group (or K-pop for General K-pop) and says quiz gets only the count, when it fits;
 *   b. what is added ("{Group} quiz", "N-question quiz", the group name) is dropped, richest first, when it would pass TITLE_MAX;
 *   c. only a creator title that is itself over TITLE_MAX is cut, at the last word boundary that fits, at the end, with no ellipsis.
 */
export function quizSeoTitle(title: string, questionCount: number, group: { name: string; slug?: string | null }): string {
  const t = collapsePunctuation(title);
  if (t.length > TITLE_MAX) return cutAtWord(t, TITLE_MAX);
  const name = clean(group.name);
  const norm = normalizeTitle(t);
  const hasGroup = groupAliases(name, group.slug).some((n) => norm === n || norm.startsWith(`${n} `) || norm.endsWith(` ${n}`) || norm.includes(` ${n} `));
  const hasQuiz = /\b(quiz|quizz|test|trivia)\b/i.test(t);
  const join = (suffix: string): string => (/[?!.]$/.test(t) ? `${t} ${suffix}` : `${t} \u00b7 ${suffix}`);
  const candidates = hasGroup && hasQuiz ? [`${t} \u00b7 ${plural(questionCount)}`]
    : hasGroup ? [join(`${questionCount}-question quiz`)]
    : hasQuiz ? [join(`${name}, ${plural(questionCount)}`), join(name)]
    : [join(`${name} quiz, ${plural(questionCount)}`), join(`${name} quiz`)];
  return candidates.find((c) => c.length <= TITLE_MAX) ?? t;
}

export interface QuizDescriptionInput {
  title: string;
  difficulty: string;
  questionCount: number;
  groupName: string;
  creator: string;
  /** True for an editorial (Team) account: the byline reads "the KpopQuiz Team", never the handle (audit 04 P0-2). */
  creatorIsTeam?: boolean;
  plays: number;
  creatorNote: string | null;
  /** quizzes.quiz_type, for the wording of the questions ("odd-one-out"); absent = plain "questions". */
  quizType?: string;
}

/** How a Team quiz is signed in search results and in JSON-LD: a Team handle can read like a fan. */
export { TEAM_AUTHOR_NAME, TEAM_BYLINE };

/** The JSON-LD author of a quiz: the Team as an Organization (link to /about), else the fan creator as a Person. */
export function quizAuthorJsonLd(creator: string, creatorIsTeam: boolean): Record<string, unknown> {
  return creatorIsTeam
    ? { '@type': 'Organization', name: TEAM_AUTHOR_NAME, url: 'https://kpopquiz.org/about' }
    : { '@type': 'Person', name: creator, url: `https://kpopquiz.org/u/${creator}` };
}

/** "Played 1,784 times." A play is not a person, so the count never says fans (audit 04 P0-3). */
export function playedText(plays: number): string {
  return `Played ${plays.toLocaleString('en-US')} ${plays === 1 ? 'time' : 'times'}.`;
}

const TYPE_NOUN: Record<string, string> = {
  multiple_choice: 'multiple-choice', true_false: 'true or false', guess_from_clues: 'guess-from-clues', image: 'picture', intruder: 'odd-one-out',
};

/**
 * The meta description of a quiz page: the creator's note when it says something, else a sentence built from the quiz's real data,
 * 140 to 155 characters. It opens with what the visitor gets ("3 easy odd-one-out questions on ILLIT"), says who made it ("by fan
 * creator mina", "by the KpopQuiz Team"), how often it was played (plays, never fans) and what it costs (audit 04 P0-3, P1-2).
 */
export function quizDescription(q: QuizDescriptionInput): string {
  const note = q.creatorNote ? clean(q.creatorNote) : '';
  if (note.length >= NOTE_MIN) return clipWords(note, DESCRIPTION_MAX);
  const n = q.questionCount;
  const by = q.creatorIsTeam ? TEAM_BYLINE : `fan creator ${q.creator}`;
  const title = collapsePunctuation(q.title);
  const noun = q.quizType ? TYPE_NOUN[q.quizType] : undefined;
  const kind = noun && noun !== 'multiple-choice' ? `${noun} ` : '';
  const core = `${title}${/[?!.]$/.test(title) ? '' : ':'} ${n} ${q.difficulty} ${kind}question${n === 1 ? '' : 's'} on ${q.groupName} by ${by}.`;
  const played = q.plays <= 0 ? [` New on ${SITE.brand.name}: be one of the first to play it.`, ''] : [` ${playedText(q.plays)}`, ''];
  const closers = [' Free to play, no sign-up needed.', ' Free to play, no sign-up.', ''];
  let best = '';
  for (const p of played) for (const c of closers) {
    const d = `${core}${p}${c}`;
    if (d.length <= DESCRIPTION_MAX && d.length > best.length) best = d;
  }
  return best || clipWords(`${core}${played[0]}${closers[1]}`, DESCRIPTION_MAX);
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
