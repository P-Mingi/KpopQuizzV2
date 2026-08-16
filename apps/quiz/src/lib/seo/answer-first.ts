import type { Group } from '@/lib/db/types';

// W8 - ANSWER-FIRST + QUERY FAN-OUT (docs/PLAY-GEO-AEO-AUDIT.md G2).
//
// An AI lifts a CHUNK, not a page. So each answer below is self-contained: it names the
// group, states one fact, and needs no surrounding context to make sense when quoted
// alone. That is what turns one citation shot into six.
//
// REAL DATA ONLY. Every value comes from a DB column or a live count at render time. A
// missing value produces NO sentence: there is no "around", no "approximately", no
// placeholder, and no guessed generation for the 7 groups that have none. An absent
// fact is silence, never an estimate.

export interface GroupFacts {
  /** Members, counted from the group's published name-all game. Null when there is none. */
  memberCount: number | null;
  /** Playable blindtest songs for this group. */
  songCount: number;
}

/** The columns this module reads that `Group` does not declare yet. */
type GroupExtras = {
  inception_date?: string | null;
  origin_country?: string | null;
  record_label?: string | null;
};

export interface AnswerChunk {
  /** The literal question a fan types, used verbatim as the heading. */
  question: string;
  answer: string;
}

const YEAR_RE = /^(\d{4})-\d{2}-\d{2}/;

/**
 * `fandom_name` is "fan" on 7 groups: a placeholder someone typed to fill the column,
 * not a fandom name. Publishing "Their fandom is called fan" would be a real value
 * rendered as a non-answer, which is worse than saying nothing. Treated as absent.
 * This filters known placeholders only; it never rewrites or guesses a real name.
 */
const PLACEHOLDER_FANDOM = /^(fan|fans|n\/a|none|unknown|-)$/i;

export function realFandom(name: string | null | undefined): string | null {
  const v = (name ?? '').trim();
  return v && !PLACEHOLDER_FANDOM.test(v) ? v : null;
}

/** Debut year from inception_date, or null. Never derived from anything else. */
export function debutYear(group: { inception_date?: string | null }): number | null {
  const raw = group.inception_date;
  if (!raw) return null;
  const m = YEAR_RE.exec(raw);
  return m ? Number(m[1]) : null;
}

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The 40-60 word direct answer, built from whatever is actually known.
 *
 * Clauses are added in descending order of how often a fan asks them, and the builder
 * stops adding once the answer is long enough, so a data-rich group does not run past
 * the window. A sparse group simply produces a shorter answer: padding it would mean
 * inventing, which is the one thing this must not do.
 */
export function buildAnswerFirst(group: Group, facts: GroupFacts): string {
  const g = group as Group & GroupExtras;
  const year = debutYear(g);
  const parts: string[] = [];

  parts.push(
    facts.memberCount !== null
      ? `${g.name} is a K-pop group with ${facts.memberCount} members.`
      : `${g.name} is a K-pop group.`,
  );
  if (year) parts.push(`They debuted in ${year}.`);
  const fandom = realFandom(g.fandom_name);
  if (fandom) parts.push(`Their fandom is called ${fandom}.`);
  if (g.generation) parts.push(`${g.name} belongs to the ${g.generation} of K-pop.`);
  if (g.origin_country) parts.push(`The group is from ${g.origin_country}.`);

  parts.push(
    g.quiz_count === 1
      ? `On kpopquiz.org you can play 1 free fan-made ${g.name} quiz.`
      : `On kpopquiz.org you can play ${g.quiz_count} free fan-made ${g.name} quizzes.`,
  );
  if (facts.songCount > 0) parts.push(`${facts.songCount} of their songs are playable in the blind test.`);

  // Trim from the tail if we overshot the window. Never pad to reach it.
  const out: string[] = [];
  for (const p of parts) {
    if (countWords(out.join(' ')) >= 60) break;
    out.push(p);
  }
  return out.join(' ');
}

/**
 * The query fan-out: the adjacent questions a fan actually types, each answered in a
 * chunk that stands on its own. A question with no data is not emitted at all, so the
 * page never shows a heading above an empty or hedged answer.
 */
export function buildAnswerChunks(group: Group, facts: GroupFacts): AnswerChunk[] {
  const g = group as Group & GroupExtras;
  const year = debutYear(g);
  const chunks: AnswerChunk[] = [];

  if (facts.memberCount !== null) {
    chunks.push({
      question: `How many members does ${g.name} have?`,
      answer: `${g.name} has ${facts.memberCount} members.`,
    });
  }
  if (year) {
    chunks.push({
      question: `When did ${g.name} debut?`,
      answer: `${g.name} debuted in ${year}.`,
    });
  }
  const fandom = realFandom(g.fandom_name);
  if (fandom) {
    chunks.push({
      question: `What is ${g.name}'s fandom called?`,
      answer: `${g.name}'s fandom is called ${fandom}.`,
    });
  }
  if (g.generation) {
    chunks.push({
      question: `What generation is ${g.name}?`,
      answer: `${g.name} is a ${g.generation} K-pop group.`,
    });
  }
  if (g.origin_country) {
    chunks.push({
      question: `Where is ${g.name} from?`,
      answer: `${g.name} is from ${g.origin_country}.`,
    });
  }
  if (g.record_label) {
    chunks.push({
      question: `What label is ${g.name} on?`,
      answer: `${g.name} is on ${g.record_label}.`,
    });
  }
  if (facts.songCount > 0) {
    chunks.push({
      question: `How many ${g.name} songs can I play in the blind test?`,
      answer: `${facts.songCount} ${g.name} songs are playable in the kpopquiz.org blind test.`,
    });
  }
  return chunks;
}
