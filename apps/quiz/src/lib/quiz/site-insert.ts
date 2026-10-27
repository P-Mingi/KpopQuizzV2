// Run O1, lot (e) part 2, lane E1a: the quiz insert of a build that is not kpop, and the spoiler level of a quiz.
//
// kpopquiz.org keeps creating quizzes through the create_quiz_bypass rpc (it fills no site_id: the column default
// 'kpop' does). That rpc cannot name a site, and a quiz of another site must carry its own site_id from the first
// write (trg_quizzes_site_guard compares it with the group's), so the other builds insert the row directly with the
// service-role client. The level of an anime quiz (spoiler_arc_ord, spoiler_scope) is computed here from the tags of
// its questions, never taken from the client (S 3.4 rule 5).

import { computeSpoilerLevel } from '@/lib/anime/spoilers';
import { withSite } from '@/lib/site/scope';

import type { QuestionSpoiler } from '@/lib/anime/types';
import type { SiteId } from '@/lib/site/types';

/** The part of a supabase-js client this module uses (a test passes a fake). */
export interface InsertDb {
  from(table: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any -- the builder is untyped on this app's clients
}

export interface SiteQuizPayload {
  readonly creator_id: string;
  readonly group_id: number;
  readonly title: string;
  readonly slug: string;
  readonly quiz_type: string;
  readonly difficulty: string;
  readonly language: string;
  readonly questions: unknown;
  readonly settings: unknown;
  readonly question_count: number;
  readonly cover_image_url: string | null;
}

export interface SpoilerColumns {
  readonly spoiler_arc_ord: number;
  readonly spoiler_scope: 'anime' | 'manga' | 'both' | null;
}

/**
 * The level columns of a quiz from its questions' tags; manga-only arcs of the quiz's series make a tagged question
 * count as manga. A failed arcs read (no such table, a network error) only drops that refinement.
 */
export async function spoilerColumnsFor(db: InsertDb, groupId: number | null, questions: unknown): Promise<SpoilerColumns> {
  const list = Array.isArray(questions) ? (questions as Array<{ spoiler?: QuestionSpoiler }>) : [];
  let mangaOnly: Set<number> | undefined;
  if (groupId !== null && list.some((q) => q && typeof q === 'object' && q.spoiler && q.spoiler.arc > 0)) {
    try {
      const { data } = (await db.from('arcs').select('ord').eq('group_id', groupId).eq('manga_only', true)) as { data: Array<{ ord: number }> | null };
      mangaOnly = new Set((data ?? []).map((a) => a.ord));
    } catch {
      mangaOnly = undefined;
    }
  }
  const level = computeSpoilerLevel(list, mangaOnly);
  return { spoiler_arc_ord: level.arcOrd, spoiler_scope: level.scope };
}

/** Insert the quiz with site_id = `site` and its level; the result has the shape of the rpc's ({ data: { id, slug } }). */
export async function insertQuizForSite(
  db: InsertDb,
  site: SiteId,
  payload: SiteQuizPayload,
): Promise<{ data: { id: string; slug: string } | null; error: { message: string; code?: string } | null }> {
  const level = await spoilerColumnsFor(db, payload.group_id, payload.questions);
  const row = withSite({ ...payload, ...level }, site);
  const { data, error } = await db.from('quizzes').insert(row).select('id, slug').single();
  return { data: (data as { id: string; slug: string } | null) ?? null, error: error ?? null };
}
