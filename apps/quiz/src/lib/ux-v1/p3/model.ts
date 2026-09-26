// P3 (UX v11.2): pure view model of the groups index (/groups) and the group hub
// (/<slug>-quiz). No I/O here: the server reads live in ./data.ts, the pages and
// the client islands only format what this module returns. Every number comes
// from real rows (DESIGN-SPEC 16.10: counts from PUBLISHED quizzes, never the
// stale groups.quiz_count column).

/** The general K-pop catch-all bucket: a real group row, but not a fandom. It is
 *  listed in the A to Z (it has quizzes) and kept out of "Most played". */
export const CATCH_ALL_SLUG = 'general-kpop';

/** Hidden rows (the quarantine group, slug zzz-*): never listed (90 visible of 91). */
export function isHiddenGroup(slug: string): boolean {
  return slug.startsWith('zzz-');
}

export interface IndexGroup {
  slug: string;
  name: string;
  /** Published quizzes of the group. */
  quizzes: number;
  /** Plays of its published quizzes (sum of quizzes.play_count). */
  plays: number;
  /** /idols/<Group>.jpg when the group has a photo, else null (initials). */
  photo: string | null;
}

/** The /groups directory numbers (today's intro and generation line). */
export interface DirectoryStats {
  /** Group rows with at least one published quiz (today's "N groups"). */
  withQuizzes: number;
  /** Known generations in order, with their count (only non-zero). */
  gens: { gen: string; n: number }[];
  /** Groups with a quiz and no recorded generation. */
  noGen: number;
}

export interface GroupsIndex {
  groups: IndexGroup[];
  directory: DirectoryStats;
}

const GENERATION_ORDER = ['1st Gen', '2nd Gen', '3rd Gen', '4th Gen', '5th Gen'];

/** A recorded generation, or null (today's directory rule: never guessed). */
export function knownGeneration(g: string | null | undefined): string | null {
  const v = (g ?? '').trim();
  return v && GENERATION_ORDER.includes(v) ? v : null;
}

/** Today's directory numbers from every group row (hidden rows included, as
 *  today's page counts them) and its published-quiz count. */
export function directoryStats(rows: readonly { quizzes: number; generation: string | null | undefined }[]): DirectoryStats {
  const listed = rows.filter((r) => r.quizzes > 0);
  return {
    withQuizzes: listed.length,
    gens: GENERATION_ORDER
      .map((gen) => ({ gen, n: listed.filter((r) => knownGeneration(r.generation) === gen).length }))
      .filter((x) => x.n > 0),
    noGen: listed.filter((r) => !knownGeneration(r.generation)).length,
  };
}

/** Today's /groups intro, word for word. */
export function directoryIntro(d: DirectoryStats): string {
  return `Every group with at least one quiz on KpopQuiz. ${d.withQuizzes} groups, A to Z, each with its number of quizzes and its generation where we have one recorded.`;
}

/** Today's generation line ("3 2nd Gen · 12 3rd Gen · ... · 12 with no generation recorded"), or null. */
export function directoryGenLine(d: DirectoryStats): string | null {
  if (d.gens.length === 0) return null;
  return d.gens.map((x) => `${x.n} ${x.gen}`).join(' · ') + (d.noGen > 0 ? ` · ${d.noGen} with no generation recorded` : '');
}

/** Two-letter initials for a group without a photo (prototype ini()). */
export function initials(name: string): string {
  if (name === 'General K-pop') return 'K';
  const words = name.replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
  const out = words.length > 1
    ? `${words[0]!.charAt(0)}${words[1]!.charAt(0)}`
    : name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2);
  return (out || name.trim().slice(0, 2)).toUpperCase();
}

export function quizzesLabel(n: number): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'quiz' : 'quizzes'}`;
}

/** First character bucket of the A to Z: A-Z, anything else "#". */
export function azKey(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
}

/** Anchor id of a letter block. Same ids as the live directory (#letter-A,
 *  #letter-other for "#"), so every existing jump link keeps its target. */
export function letterId(key: string): string {
  return `letter-${key === '#' ? 'other' : key}`;
}

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en');

export interface LetterBlock<G extends { name: string } = IndexGroup> {
  key: string;
  id: string;
  groups: G[];
}

/** A to Z blocks: "#" first, then A to Z (prototype renderAZ), names sorted
 *  case-insensitively inside a block. Letters without a group do not appear. */
export function azBlocks<G extends { name: string }>(groups: readonly G[]): LetterBlock<G>[] {
  const by = new Map<string, G[]>();
  for (const g of [...groups].sort(byName)) {
    const k = azKey(g.name);
    by.set(k, [...(by.get(k) ?? []), g]);
  }
  return [...by.keys()]
    .sort((a, b) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)))
    .map((key) => ({ key, id: letterId(key), groups: by.get(key)! }));
}

/** Case-insensitive name filter of the A to Z (prototype renderAZ). */
export function matchGroups<G extends { name: string }>(groups: readonly G[], query: string): G[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...groups];
  return groups.filter((g) => g.name.toLowerCase().includes(q));
}

/** "Most played": the groups with the most plays on their published quizzes,
 *  without the catch-all bucket and without groups that have no quiz. */
export function mostPlayed(groups: readonly IndexGroup[], n = 10): IndexGroup[] {
  return groups
    .filter((g) => g.quizzes > 0 && g.slug !== CATCH_ALL_SLUG)
    .sort((a, b) => b.plays - a.plays || b.quizzes - a.quizzes || byName(a, b))
    .slice(0, n);
}

/** "90 groups" or, while filtering, "12 of 90 groups". */
export function groupCountLabel(shown: number, total: number): string {
  return shown === total ? `${total} groups` : `${shown} of ${total} groups`;
}

// ---- group hub ----------------------------------------------------------------

/** "fan", "n/a"... are placeholders typed into groups.fandom_name, not fandoms
 *  (same rule as lib/seo/answer-first realFandom and the live hub hero). */
const PLACEHOLDER_FANDOM = /^(fan|fans|n\/a|none|unknown|-)$/i;
export function realFandomName(name: string | null | undefined): string | null {
  const v = (name ?? '').trim();
  return v && !PLACEHOLDER_FANDOM.test(v) ? v : null;
}

/** "3rd Gen" -> "3rd gen" (16.3 sentence case). */
export function genLabel(generation: string | null | undefined): string | null {
  const v = (generation ?? '').trim();
  return v ? v.replace(/\bGen\b/, 'gen') : null;
}

/** Hero eyebrow (prototype renderHub): "BLINK · 3rd gen · YG Entertainment"; a
 *  group with no real fandom shows its quiz count, a group without quizzes
 *  "No quiz yet". Missing facts are skipped, never guessed. */
export function hubEyebrow(g: { fandom: string | null; generation: string | null; label: string | null; quizzes: number }): string {
  const fandom = realFandomName(g.fandom);
  if (fandom) return [fandom, genLabel(g.generation), (g.label ?? '').trim() || null].filter(Boolean).join(' · ');
  return g.quizzes > 0 ? `${g.quizzes} fan-made ${g.quizzes === 1 ? 'quiz' : 'quizzes'}` : 'No quiz yet';
}

export interface HubFact {
  /** Words before the number ("Debut"). */
  pre?: string;
  value: string;
  /** Words after the number ("members"). */
  post?: string;
}

/** The facts line under the hero actions, each fact only when it is known. */
export function hubFacts(f: { members: number | null; debutYear: number | null; quizzes: number; songs: number }): HubFact[] {
  const out: HubFact[] = [];
  if (f.members && f.members > 0) out.push({ value: String(f.members), post: f.members === 1 ? 'member' : 'members' });
  if (f.debutYear) out.push({ pre: 'Debut', value: String(f.debutYear) });
  if (f.quizzes > 0) out.push({ value: f.quizzes.toLocaleString('en-US'), post: f.quizzes === 1 ? 'quiz' : 'quizzes' });
  if (f.songs > 0) out.push({ value: String(f.songs), post: f.songs === 1 ? 'blindtest song' : 'blindtest songs' });
  return out;
}

/** Debut year from groups.inception_date (YYYY-MM-DD), or null. */
export function debutYearOf(inception: string | null | undefined): number | null {
  const m = /^(\d{4})-\d{2}-\d{2}/.exec(inception ?? '');
  return m ? Number(m[1]) : null;
}

/** A published quiz of the group, as the hub lists it. */
export interface HubQuiz {
  slug: string;
  title: string;
  quiz_type: string;
  difficulty: string;
  play_count: number;
  like_count: number;
  total_score_sum: number;
  total_completions: number;
  question_count: number;
  created_at: string;
}

/** Average score in percent from the quiz's own totals, null without a play. */
export function averagePct(q: Pick<HubQuiz, 'total_score_sum' | 'total_completions' | 'question_count'>): number | null {
  if (q.total_completions <= 0 || q.question_count <= 0) return null;
  const pct = Math.round((q.total_score_sum / q.total_completions / q.question_count) * 100);
  return Math.max(0, Math.min(100, pct));
}

export type HubSort = 'popular' | 'newest' | 'most_liked' | 'hardest';

export const HUB_SORTS: { value: HubSort; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'most_liked', label: 'Most liked' },
  { value: 'hardest', label: 'Hardest' },
];

const newestFirst = (a: HubQuiz, b: HubQuiz): number => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0);

/** The four sorts of the live group feed (/api/quizzes/group, getQuizzesByGroup):
 *  Popular = most played; Newest = newest first; Most liked = liked quizzes only,
 *  most likes then most plays; Hardest = quizzes with 10+ completions, lowest
 *  average first. Ties fall back to newest, then slug, so the order is stable. */
export function sortHubQuizzes(list: readonly HubQuiz[], sort: HubSort): HubQuiz[] {
  const tie = (a: HubQuiz, b: HubQuiz): number => newestFirst(a, b) || a.slug.localeCompare(b.slug);
  const l = [...list];
  if (sort === 'newest') return l.sort((a, b) => newestFirst(a, b) || a.slug.localeCompare(b.slug));
  if (sort === 'most_liked') {
    return l.filter((q) => q.like_count > 0).sort((a, b) => b.like_count - a.like_count || b.play_count - a.play_count || tie(a, b));
  }
  if (sort === 'hardest') {
    return l
      .filter((q) => q.total_completions >= 10)
      .sort((a, b) => (averagePct(a) ?? 50) - (averagePct(b) ?? 50) || tie(a, b));
  }
  return l.sort((a, b) => b.play_count - a.play_count || tie(a, b));
}

/** Quiz types of the Type filter, in the prototype's words (quizzes.quiz_type). */
export const HUB_TYPES: { value: string; label: string }[] = [
  { value: 'multiple_choice', label: 'Classic' },
  { value: 'true_false', label: 'True/false' },
  { value: 'guess_from_clues', label: 'Guess from clues' },
  { value: 'image', label: 'Image' },
  { value: 'intruder', label: 'Find the intruder' },
];

export const HUB_LEVELS: { value: string; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

/** Only the options this group really has (facets never dead-end, DESIGN-SPEC 7). */
export function presentOptions(list: readonly HubQuiz[]): { types: typeof HUB_TYPES; levels: typeof HUB_LEVELS } {
  const types = new Set(list.map((q) => q.quiz_type));
  const levels = new Set(list.map((q) => (q.difficulty ?? '').toLowerCase()));
  return {
    types: HUB_TYPES.filter((t) => types.has(t.value)),
    levels: HUB_LEVELS.filter((l) => levels.has(l.value)),
  };
}

export function filterHubQuizzes(list: readonly HubQuiz[], f: { type: string | null; level: string | null }): HubQuiz[] {
  return list.filter((q) => (!f.type || q.quiz_type === f.type) && (!f.level || (q.difficulty ?? '').toLowerCase() === f.level));
}

/** Cards shown before "Show all N" (DESIGN-SPEC 16.7: 6 text cards). */
export const HUB_FIRST_CARDS = 6;

/** Coarse age of a comment row ("just now", "5h", "3d", "2mo"). */
export function coarseAge(iso: string, now = Date.now()): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 60) return 'just now';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

/** One line of a comment for a row title: collapsed whitespace, max `max` chars. */
export function commentLine(text: string, max = 90): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t;
}
