import { badgeCategory } from '@/lib/badges';
import { spaceUnpublished, verseHidden } from '@/lib/verse/visibility';

import type { P8Group, PostKind } from './types';

// Privacy fail-closed (verse-laws 11): Verse-sourced community content follows the SAME
// gates as the /verse pages (lib/verse/visibility, imported, never edited):
//   - VERSE_PUBLIC not exactly 'true' (verseHidden): no Verse-sourced content at all;
//   - a parked space (spaceUnpublished: any slug outside LIVE_SPACES): never shown,
//     whatever VERSE_PUBLIC says;
//   - a Verse item without a known group: not shown.
// Verse-sourced = threads (verse_threads + verse_discussions), blogs (verse_essays +
// verse_essay_reactions + their comments, their space-asset covers), hearts or reports on
// those rows, and the Verse-world badges (a badge of the Verse or cross-world category
// tells of Verse activity). Play-side content (daily debates, fan debates, challenges,
// activity events, play badges) is unaffected.
// No viewer bypass on /community: its renders and data caches are shared between viewers,
// so a privileged render could reach anyone through a cache. The owner reaches hidden or
// parked content on /verse, where the admin bypass lives (isVerseAdmin).
// Server only: VERSE_PUBLIC is a server env var (the client receives VerseScope as props).

/** What of the Verse /community may show: open = the Verse is public; groupIds = the
 *  live spaces' group ids (empty while hidden). Passed to the cached readers as an
 *  argument, so a cache entry can never outlive a gate change. */
export interface VerseScope { open: boolean; groupIds: number[] }

export function isVerseKind(kind: PostKind): boolean {
  return kind === 'thread' || kind === 'blog';
}

/** May Verse content of this space be shown on /community? */
export function verseSpaceShown(slug: string | null | undefined): boolean {
  if (verseHidden()) return false;
  if (!slug) return false;
  return !spaceUnpublished(slug);
}

export function verseScope(groups: readonly P8Group[]): VerseScope {
  if (verseHidden()) return { open: false, groupIds: [] };
  return { open: true, groupIds: groups.filter((g) => !spaceUnpublished(g.slug)).map((g) => g.id).sort((a, b) => a - b) };
}

/** Drops every Verse-sourced post the gates do not allow (the last filter, applied
 *  outside every cache, whatever the query already filtered). */
export function gateVersePosts<T extends { kind: PostKind; group: Pick<P8Group, 'slug'> | null }>(posts: readonly T[]): T[] {
  return posts.filter((p) => !isVerseKind(p.kind) || verseSpaceShown(p.group?.slug));
}

/** Badge watch: while the Verse is hidden only Play badges show (Verse and cross-world
 *  badges are earned through, or name, Verse activity). */
export function badgeShown(badgeId: string, verseOpen: boolean): boolean {
  return verseOpen || badgeCategory(badgeId) === 'play';
}
