// Quizzes of one group that chase the same search intent (SEO phase 1, PR 12; method of
// docs/seo/strategy-2026-10-27/DUPLICATES-2026-10-27.md, titles only). Pure.
//
// Two titles of the same group are siblings when they share an intent (true or false, members, music
// videos, ...) or, after the group name, the fandom name and filler words are removed, when their words
// overlap (Jaccard 0.5 or more, 2 words or more). A title with no word left ("Cortis quiz", "Are you a
// real COER?") is a fan test. On the 103 hand-checked group clusters of the audit (2026-10-27; titles of the
// O1 dev copy, 474 published kpop quizzes) this finds
// 64% of the pairs, and 77% of what it finds is in an audited cluster; the rest are other quizzes of the
// same group, so a wrong guess still links a quiz of that group.
//
// Used by /q/<slug> (up to 3 siblings first in the "More" grid, so a new quiz is linked from its series on
// its first render) and by /api/quiz/title-check (the soft "add your angle" advice of the create form).

import { normalizeTitle } from './quiz-meta';

export interface SeriesQuiz {
  slug: string;
  title: string;
  play_count?: number;
}

export interface SeriesGroup {
  name: string;
  fandom: string | null;
}

const FILLER = new Set((
  'quiz quizzes test the a an of for and or to in on is are your you do how well know can about only true real ultimate '
  + 'edition part vol volume i ii iii with this that who what which fans fan let s it its hardest easy hard basics basic fun '
  + 'trivia challenge knowledge ace pass get all right here learn baby version really think them they my me we our will '
  + 'survive t'
).split(' '));

// The first intent that matches wins (a "true or false" quiz on members is a true or false quiz).
const INTENTS: ReadonlyArray<[string, RegExp]> = [
  ['true-or-false', /\btrue or false\b|\btrue false\b|\bt f\b/],
  ['members', /\bmembers?\b/],
  ['music-videos', /\bmvs?\b|\bmusic videos?\b/],
  ['discography', /\bdiscography\b|\balbums?\b|\bb sides?\b/],
  ['songs', /\bsongs?\b|\btracks?\b/],
  ['records', /\brecords?\b|\bachievements?\b|\bawards?\b|\bmilestones?\b/],
  ['debut', /\bdebut\b|\bpre debut\b|\btrainee/],
  ['solo', /\bsolo\b/],
  ['lyrics', /\blyrics?\b/],
  ['fan-test', /\bonly (?:for )?(?:true|real)\b|\b(?:true|real|ultimate|biggest) [a-z0-9]+\b|\bhow well do you know\b|\bare you a (?:true|real)\b|\bcan you pass\b/],
];

function groupWords(g: SeriesGroup): Set<string> {
  const name = normalizeTitle(g.name);
  const fandom = normalizeTitle(g.fandom ?? '').split(' ').filter(Boolean);
  return new Set([...name.split(' '), name.replace(/ /g, ''), ...fandom, ...fandom.map((w) => w.replace(/s$/, '')), ...fandom.map((w) => `${w}s`)]);
}

interface Profile {
  intent: string | null;
  words: Set<string>;
}

function profile(title: string, skip: Set<string>): Profile {
  const t = normalizeTitle(title);
  const words = new Set(t.split(' ').filter((w) => w.length > 1 && !FILLER.has(w) && !skip.has(w)));
  const intent = INTENTS.find(([, re]) => re.test(t))?.[0] ?? (words.size === 0 ? 'fan-test' : null);
  return { intent, words };
}

function overlap(a: Set<string>, b: Set<string>): { shared: number; jaccard: number } {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  const union = a.size + b.size - shared;
  return { shared, jaccard: union === 0 ? 0 : shared / union };
}

function closeness(a: Profile, b: Profile): number {
  const { shared, jaccard } = overlap(a.words, b.words);
  if (jaccard >= 0.5 && shared >= 2) return 1 + jaccard;
  if (a.intent !== null && a.intent === b.intent) return jaccard;
  return -1;
}

/**
 * The siblings of a quiz among the other published quizzes of its group: closest title first, then the
 * most played. Never the quiz itself.
 */
export function seriesSiblings(quiz: SeriesQuiz, others: readonly SeriesQuiz[], group: SeriesGroup, max: number): string[] {
  const skip = groupWords(group);
  const me = profile(quiz.title, skip);
  return others
    .filter((o) => o.slug !== quiz.slug)
    .map((o) => ({ o, score: closeness(me, profile(o.title, skip)) }))
    .filter((x) => x.score >= 0)
    .sort((x, y) => y.score - x.score || (y.o.play_count ?? 0) - (x.o.play_count ?? 0) || x.o.slug.localeCompare(y.o.slug))
    .slice(0, max)
    .map((x) => x.o.slug);
}
