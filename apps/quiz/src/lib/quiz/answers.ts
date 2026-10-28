// "Answers & explanations" of the quiz page (SEO strategy of 2026-10-27, phase 1, item 6). Pure: no read,
// no React. For each question the page shows, the right answer, then one explanation, never generated:
//   1. the verified explanation of public.quiz_explanations, with its source link, only while the live
//      question text and the live right answer are exactly the ones that were checked;
//   2. else the creator's fun fact, labelled as such (the existing questions block shows it the same way);
//   3. else the answer alone.
// A database fact that merely names the answer is not used: naming it does not explain the question.
//
// Questions about a person's age or birth, body, departure from a group, private life, family or origin
// get no stated answer (rulebook 6.1 and 6.2): players write such questions, and the page must not assert
// their answers about real people, minors included. A verified explanation is the exception: its lot was
// checked against the same rules (no minors' age, birth or family, no heights, no departures).

/** A question as stored in quizzes.questions (any quiz type). */
export interface RawQuestion {
  question?: unknown;
  options?: unknown;
  correct?: unknown;
  fun_fact?: unknown;
}

/** A row of public.quiz_explanations (status verified, as the public read policy returns them). */
export interface StoredExplanation {
  q_index: number;
  question: string;
  answer: string;
  explanation: string;
  source_url: string;
}

export type AnswerExplanation =
  | { kind: 'verified'; text: string; sourceUrl: string }
  | { kind: 'fun_fact'; text: string };

export interface AnswerRow {
  /** Index in quizzes.questions (the key of quiz_explanations), never a position in a filtered list. */
  qIndex: number;
  /** Number of the question in the list the page shows (1-based), as its questions block numbers it. */
  n: number;
  question: string;
  answer: string;
  explanation: AnswerExplanation | null;
}

const HTTPS = /^https:\/\/[^\s"'<>]+$/;

/** Topics whose answers the page never states (matched on the question text, whole words). */
export const NO_STATED_ANSWER: readonly RegExp[] = [
  // age and birth
  /\b(born|birth|births|birthday|birthdays|birthplace|age|ages|aged|old|older|oldest|young|younger|youngest|maknae|eldest)\b/i,
  // body
  /\b(tall|taller|tallest|short|shorter|shortest|height|heights|weigh|weighs|weight|cm|kg)\b/i,
  // departures and disputes
  /\b(left|leave|leaves|leaving|departed|departure|quit|kicked|removed|hiatus|lawsuit|dispute|terminated|disbanded)\b|no longer|not in the group|isn'?t in the group/i,
  // private life and health
  /\b(dating|dated|girlfriend|boyfriend|married|marriage|wife|husband|relationship|religion|religious|sick|illness|injury|injured|surgery|hospital|scandal|depression|anxiety)\b/i,
  // family and origin
  /\b(sister|sisters|brother|brothers|sibling|siblings|parent|parents|mother|father|mom|dad|family|cousin|nationality|ethnicity|heritage|hometown|grew up)\b|\bfrom (australia|america|the us|usa|canada|japan|china|thailand|vietnam|new zealand|indonesia|the philippines|taiwan|hong kong)\b/i,
];

/** True when the page must not state the answer of this question (see NO_STATED_ANSWER). */
export function noStatedAnswer(question: string): boolean {
  return NO_STATED_ANSWER.some((re) => re.test(question));
}

function text(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

/**
 * The right answer as the explanation lots stored it, mirroring the SQL guard of gen-expl-sql.py:
 * a boolean `correct` is 'True' or 'False'; a numeric one is the option text at that index. An
 * option that is not a string (picture and intruder quizzes) has no stored key, so it never matches.
 */
export function storedAnswerKey(q: RawQuestion): string | null {
  if (typeof q.correct === 'boolean') return q.correct ? 'True' : 'False';
  if (typeof q.correct !== 'number' || !Array.isArray(q.options)) return null;
  const option: unknown = q.options[q.correct];
  return typeof option === 'string' ? option : null;
}

/** The right answer as a reader sees it in the quiz (the option text, or the label of a picture option). */
export function displayAnswer(q: RawQuestion): string | null {
  const options = Array.isArray(q.options) ? q.options : [];
  if (typeof q.correct === 'boolean') {
    const wanted = q.correct ? 'true' : 'false';
    const shown = options.find((o): o is string => typeof o === 'string' && o.trim().toLowerCase() === wanted);
    return text(shown) ?? (q.correct ? 'True' : 'False');
  }
  if (typeof q.correct !== 'number' || !Number.isInteger(q.correct)) return null;
  const option: unknown = options[q.correct];
  if (typeof option === 'string') return text(option);
  if (option && typeof option === 'object') return text((option as { label?: unknown }).label);
  return null;
}

/** The answer rows of the questions a page shows, in that order. A question without text or answer is left out. */
export function buildAnswerRows(questions: Array<{ q: RawQuestion; qIndex: number }>, explanations: StoredExplanation[]): AnswerRow[] {
  const byIndex = new Map(explanations.map((e) => [e.q_index, e]));
  const rows: AnswerRow[] = [];
  for (const [i, { q, qIndex }] of questions.entries()) {
    const question = text(q.question);
    const answer = displayAnswer(q);
    if (!question || !answer) continue;
    const e = byIndex.get(qIndex);
    const key = storedAnswerKey(q);
    // the checked question and answer must still be the live ones, word for word
    const checked = e && e.question === q.question && key !== null && e.answer === key ? e : null;
    const verifiedText = checked && HTTPS.test(checked.source_url) ? text(checked.explanation) : null;
    if (!verifiedText && noStatedAnswer(question)) continue;
    const funFact = text(q.fun_fact);
    rows.push({
      qIndex,
      n: i + 1,
      question,
      answer,
      explanation: checked && verifiedText ? { kind: 'verified', text: verifiedText, sourceUrl: checked.source_url }
        : funFact ? { kind: 'fun_fact', text: funFact }
        : null,
    });
  }
  return rows;
}

/**
 * The `hasPart` Questions of the Quiz JSON-LD for a page that shows the answers block: the same
 * questions as before (non-empty text, in order), each with its acceptedAnswer when the block shows
 * one, the same text as the visible answer (rulebook 7: semantics only, never Flashcard).
 */
export function questionsJsonLd(questions: Array<{ q: RawQuestion; qIndex: number }>, rows: AnswerRow[]): Array<Record<string, unknown>> {
  const byIndex = new Map(rows.map((r) => [r.qIndex, r]));
  return questions
    .filter(({ q }) => typeof q.question === 'string' && q.question.length > 0)
    .map(({ q, qIndex }) => {
      const row = byIndex.get(qIndex);
      return row
        ? { '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: row.answer } }
        : { '@type': 'Question', name: q.question };
    });
}
