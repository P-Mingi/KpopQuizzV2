// SEO Mission 2 (owner, 2026-10-14): the topic of a quiz, read from its own words (its title,
// or its question prompts), never from a label someone typed. Used by the "{Group} quizzes by
// topic" section of a strengthened hub and by the title qualifier of lib/seo/quiz-meta.ts.
// Pure and unit tested (topics.test.ts). The keywords are generic K-pop words, never one
// group's era names, so the same rules work on every hub.

export type QuizTopic = 'solo' | 'records' | 'tours' | 'members' | 'songs' | 'eras' | 'general';

/** Checked in this order: the first topic whose words appear wins. */
const RULES: Array<[Exclude<QuizTopic, 'general'>, RegExp]> = [
  ['solo', /\bsolo\b/i],
  ['records', /\b(records?|achievements?|awards?|grammys?|billboard|charts?|milestones?)\b/i],
  ['tours', /\b(concerts?|tours?)\b/i],
  ['members', /\b(members?|bias(es)?|real names?|maknae|leader|oldest|youngest|unnie|hyung|nicknames?|positions?)\b/i],
  ['songs', /\b(songs?|discography|albums?|mvs?|music videos?|lyrics?|tracks?|b-sides?|singles?|ost)\b/i],
  ['eras', /\b(eras?|debut(ed)?|comebacks?|history|timeline|survival show)\b/i],
];

/** The section heading of each topic on a hub, in the order the sections render. */
export const TOPIC_LABEL: Record<QuizTopic, string> = {
  members: 'Members',
  songs: 'Songs, albums and music videos',
  eras: 'Eras and history',
  solo: 'Solo work',
  records: 'Records and awards',
  tours: 'Concerts and tours',
  general: 'Mixed knowledge',
};

export const TOPIC_ORDER: readonly QuizTopic[] = ['members', 'songs', 'eras', 'solo', 'records', 'tours', 'general'];

/** The word a title qualifier uses ("ILLIT members quiz"). */
export const TOPIC_QUALIFIER: Record<Exclude<QuizTopic, 'general'>, string> = {
  members: 'members',
  songs: 'songs',
  eras: 'history',
  solo: 'solo',
  records: 'records',
  tours: 'concerts',
};

/** The topic of one text (a title or a question prompt): the first rule that matches. */
export function topicOf(text: string): QuizTopic {
  for (const [topic, re] of RULES) if (re.test(text)) return topic;
  return 'general';
}

/**
 * The main topic of a set of prompts, or null when no topic stands out: the most frequent
 * non-general topic, if it covers at least 2 prompts and at least 30% of them.
 */
export function dominantTopic(prompts: readonly string[]): Exclude<QuizTopic, 'general'> | null {
  const texts = prompts.map((p) => p.trim()).filter(Boolean);
  if (texts.length === 0) return null;
  const counts = new Map<Exclude<QuizTopic, 'general'>, number>();
  for (const t of texts) {
    const topic = topicOf(t);
    if (topic !== 'general') counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  let best: Exclude<QuizTopic, 'general'> | null = null;
  let bestN = 0;
  // Ties go to the earlier rule (RULES order), so the answer never depends on Map order.
  for (const [topic] of RULES) {
    const n = counts.get(topic) ?? 0;
    if (n > bestN) { best = topic; bestN = n; }
  }
  if (!best || bestN < 2 || bestN / texts.length < 0.3) return null;
  return best;
}

/**
 * What a quiz is about, from its prompts, for a title qualifier: one topic when it stands out
 * (dominantTopic), else the two most frequent ones when each covers at least 2 prompts and
 * together at least 40% of them ("members and songs"), else none.
 */
export function contentTopics(prompts: readonly string[]): Array<Exclude<QuizTopic, 'general'>> {
  const one = dominantTopic(prompts);
  if (one) return [one];
  const texts = prompts.map((p) => p.trim()).filter(Boolean);
  if (texts.length === 0) return [];
  const counts = RULES.map(([topic]) => ({ topic, n: texts.filter((t) => topicOf(t) === topic).length }));
  // Stable sort: equal counts keep the RULES order.
  const [a, b] = [...counts].sort((x, y) => y.n - x.n);
  if (!a || !b || b.n < 2 || (a.n + b.n) / texts.length < 0.4) return [];
  return [a.topic, b.topic];
}

/** Quizzes grouped by the topic of their title, in TOPIC_ORDER, empty topics left out. */
export function groupByTopic<T extends { title: string }>(quizzes: readonly T[]): Array<{ topic: QuizTopic; label: string; quizzes: T[] }> {
  const by = new Map<QuizTopic, T[]>();
  for (const q of quizzes) {
    const t = topicOf(q.title);
    const list = by.get(t) ?? [];
    list.push(q);
    by.set(t, list);
  }
  return TOPIC_ORDER.filter((t) => (by.get(t)?.length ?? 0) > 0).map((t) => ({ topic: t, label: TOPIC_LABEL[t], quizzes: by.get(t)! }));
}
