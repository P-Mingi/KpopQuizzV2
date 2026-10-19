// Run O1, lot (b), lane LB (A5): the spoiler core. Pure functions, no I/O, usable on the server (the level of a quiz
// is computed there, never taken from the client: S 3.4 rule 5) and in the browser (the labels on a quiz card).
// Signatures follow AnimeSpoilerFns in ../types.ts.

import { SPOILER_SHOW_ALL } from '../types';

import type { QuestionSpoiler, SpoilerLevel, SpoilerProgress } from '../types';

/** The level of a quiz whose questions carry no tag above arc 0. */
export const SPOILER_FREE_LEVEL: SpoilerLevel = { arcOrd: 0, scope: null };

/** The view of a reader with no stored value: spoiler-free (S 2.7). */
export const SPOILER_FREE_VIEW: SpoilerProgress = { arc: 0, scope: 'anime' };

/** "Show everything": above every arc, and the manga reader's view too. */
export const SHOW_EVERYTHING_VIEW: SpoilerProgress = { arc: SPOILER_SHOW_ALL, scope: 'manga' };

/**
 * `arcOrd` is the highest `spoiler.arc` of the questions (arc 0 is spoiler-free and counts for nothing). With no tag
 * above 0 the level is {0, null}. Otherwise `scope` is 'manga' when any tagged question has scope 'manga' or sits in
 * a manga-only arc, else 'anime' when every tagged question has scope 'anime', else 'both'.
 */
export function computeSpoilerLevel(
  questions: readonly { readonly spoiler?: QuestionSpoiler | undefined }[],
  mangaOnlyArcs?: ReadonlySet<number>,
): SpoilerLevel {
  let arcOrd = 0;
  let anyManga = false;
  let allAnime = true;
  let tagged = 0;
  for (const q of questions) {
    const tag = q.spoiler;
    if (!tag || !Number.isFinite(tag.arc) || tag.arc <= 0) continue;
    tagged += 1;
    if (tag.arc > arcOrd) arcOrd = tag.arc;
    if (tag.scope === 'manga' || mangaOnlyArcs?.has(tag.arc) === true) anyManga = true;
    if (tag.scope !== 'anime') allAnime = false;
  }
  if (tagged === 0) return SPOILER_FREE_LEVEL;
  return { arcOrd, scope: anyManga ? 'manga' : allAnime ? 'anime' : 'both' };
}

/**
 * "Safe for you": true when the level is arc 0, or when the reader has seen up to the level's arc and does not follow
 * the anime only while the level needs the manga.
 */
export function isSafeFor(level: SpoilerLevel, progress: SpoilerProgress): boolean {
  if (level.arcOrd <= 0) return true;
  if (progress.arc < level.arcOrd) return false;
  return !(level.scope === 'manga' && progress.scope === 'anime');
}

/** Whether a thing hidden until arc `fromArc` (a character's `spoiler_level`) is visible to this reader. */
export function isRevealedTo(fromArc: number, progress: SpoilerProgress): boolean {
  return fromArc <= 0 || progress.arc >= fromArc;
}

/** The level as stored on the quizzes row (spoiler_arc_ord, spoiler_scope); a row with no value is spoiler-free. */
export function levelOfRow(row: { readonly spoiler_arc_ord?: number | null; readonly spoiler_scope?: string | null }): SpoilerLevel {
  const arcOrd = typeof row.spoiler_arc_ord === 'number' && row.spoiler_arc_ord > 0 ? row.spoiler_arc_ord : 0;
  if (arcOrd === 0) return SPOILER_FREE_LEVEL;
  const scope = row.spoiler_scope === 'anime' || row.spoiler_scope === 'manga' || row.spoiler_scope === 'both' ? row.spoiler_scope : 'both';
  return { arcOrd, scope };
}

/** The questions a crawler may read: tagged ones (arc above 0) are removed (A5: never in the HTML or the JSON-LD). */
export function withoutTaggedQuestions<T extends { readonly spoiler?: QuestionSpoiler | undefined }>(questions: readonly T[]): T[] {
  return questions.filter((q) => !q.spoiler || !(q.spoiler.arc > 0));
}

/** The same list with every tagged question replaced by an empty object: a count stays true, no tagged text is left. */
export function maskTaggedQuestions<T extends { readonly spoiler?: QuestionSpoiler | undefined }>(questions: readonly T[]): Array<T | Record<string, never>> {
  return questions.map((q) => (q.spoiler && q.spoiler.arc > 0 ? {} : q));
}
