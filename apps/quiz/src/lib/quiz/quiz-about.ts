// The lead sentence of a quiz page's "About this quiz" (SEO strategy of 2026-10-27, phase 1, item 7). Pure.
// Built only from the quiz's own content: the group's members, songs and albums that its questions and
// options name, and the years they cite, so two quizzes of the same group read differently. Nothing is
// generated or guessed: an entity is named only when the quiz's text contains it, and the right answer
// is never singled out (options name wrong answers too). With nothing found, the sentence is today's.
// The page leaves out the questions whose answers it never states (noStatedAnswer: age, birth, body,
// departures, private life, family, origin), so the sentence never draws on them either.

export interface GroupEntities {
  /** Stage names of the group's active members. */
  members: string[];
  /** Song titles of the group. */
  songs: string[];
  /** Album titles of the group. */
  albums: string[];
}

export interface QuizIntroInput {
  groupName: string;
  quizType: string;
  questionCount: number;
  difficulty: string;
  creator: string;
  /** Every question, option and clue text of the questions the page shows. */
  texts: string[];
  entities: GroupEntities;
}

const TYPE_WORDS: Record<string, string> = {
  multiple_choice: 'multiple-choice',
  true_false: 'true or false',
  guess_from_clues: 'guess-from-clues',
  image: 'picture',
  intruder: 'odd-one-out',
};

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The names a text contains, in order of first appearance, each once. Whole words only; a name shorter
 * than `anyCaseFrom` characters must match its case ("Jin", "Rose", the song "CRAZY" is not "Easy Crazy
 * Hot Tour"), a longer one matches in any case ("jisoo"). Names under 2 characters are never matched.
 */
export function namesIn(text: string, names: string[], anyCaseFrom = 5): string[] {
  const found: Array<{ name: string; at: number }> = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const name = raw.trim();
    if (name.length < 2 || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escape(name)}(?=$|[^\\p{L}\\p{N}])`, name.length < anyCaseFrom ? 'u' : 'iu');
    const m = re.exec(text);
    if (m) found.push({ name, at: m.index + m[1]!.length });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.name);
}

/** "A", "A and B", "A, B and C", "A, B, C and more" */
function list(items: string[], max: number): string {
  const shown = items.slice(0, max);
  if (items.length > max) return `${shown.join(', ')} and more`;
  if (shown.length <= 1) return shown[0] ?? '';
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

/** The years 1980 to 2039 the texts cite, as [first, last], or null. */
export function yearSpan(texts: string[]): [number, number] | null {
  const years = texts.flatMap((t) => [...t.matchAll(/\b(19[89]\d|20[0-3]\d)\b/g)].map((m) => Number(m[1])));
  return years.length > 0 ? [Math.min(...years), Math.max(...years)] : null;
}

export function buildQuizIntro(i: QuizIntroInput): string {
  const text = i.texts.join('\n');
  // a song or album named like the group ("Stray Kids") says nothing about the quiz
  const notGroup = (names: string[]): string[] => names.filter((n) => n.trim().toLowerCase() !== i.groupName.trim().toLowerCase());
  const members = namesIn(text, notGroup(i.entities.members));
  // song and album titles are often common words: their case must match below 7 characters
  const songs = namesIn(text, notGroup(i.entities.songs), 7);
  const albums = namesIn(text, notGroup(i.entities.albums), 7).filter((a) => !songs.includes(a));
  const n = i.questionCount;
  const kind = TYPE_WORDS[i.quizType];
  const lead = `This ${i.difficulty} ${n}-question ${kind ? `${kind} ` : ''}${i.groupName} quiz by ${i.creator}`;
  let topic: string | null = null;
  if (members.length >= 1 && songs.length + albums.length >= 1) {
    topic = `${lead} asks about ${list(members, 3)} and about ${songs.length > 0 ? `songs such as ${list(songs, 2)}` : `albums such as ${list(albums, 2)}`}.`;
  } else if (songs.length >= 1) {
    topic = `${lead} is about ${i.groupName} songs such as ${list(songs, 3)}${albums.length > 0 ? ` and albums such as ${list(albums, 2)}` : ''}.`;
  } else if (albums.length >= 1) {
    topic = `${lead} is about ${i.groupName} albums such as ${list(albums, 3)}.`;
  } else if (members.length >= 1) {
    topic = `${lead} asks about ${list(members, 4)}.`;
  }
  const span = yearSpan(i.texts);
  const years = span ? (span[0] === span[1] ? ` Its questions cite ${span[0]}.` : ` Its questions run from ${span[0]} to ${span[1]}.`) : '';
  if (!topic) return `Test your ${i.groupName} knowledge with this ${i.difficulty} ${n}-question quiz by ${i.creator}.${years}`;
  return `${topic}${years}`;
}
