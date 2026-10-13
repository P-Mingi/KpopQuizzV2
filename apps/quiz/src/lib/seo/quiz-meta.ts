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
  /** Average score in percent, or null when not meaningful yet. */
  avgScore: number | null;
  creatorNote: string | null;
}

const article = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a');

export function quizDescription(q: QuizDescriptionInput): string {
  const note = q.creatorNote ? clean(q.creatorNote) : '';
  if (note.length >= NOTE_MIN) return clipWords(note, DESCRIPTION_MAX);
  const n = q.questionCount;
  let s = `${clean(q.title)}: ${article(q.difficulty)} ${q.difficulty} ${n}-question K-pop quiz on ${q.groupName}, made by ${q.creator}.`;
  const plays = q.plays.toLocaleString('en-US');
  // The facts first; the call to action only when it fits whole (never "Can you beat...").
  const parts = q.plays <= 0
    ? [' New on KpopQuiz: be one of the first to play it.']
    : [q.avgScore !== null
      ? ` ${plays} ${q.plays === 1 ? 'fan has' : 'fans have'} played it, scoring ${q.avgScore}% on average.`
      : ` Played by ${plays} ${q.plays === 1 ? 'fan' : 'fans'}.`, ' Can you beat them?'];
  for (const p of parts) if ((s + p).length <= DESCRIPTION_MAX) s += p;
  const tail = ' Free to play, no sign-up.';
  if (s.length < DESCRIPTION_MIN && (s + tail).length <= DESCRIPTION_MAX) s += tail;
  return clipWords(s, DESCRIPTION_MAX);
}
