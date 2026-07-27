// Workstream V1 - "Sort It" (binary classification game).
//
// This module is CLIENT-SAFE: it holds only types + the playlist registry
// (metadata), and imports nothing server-only, so the player component and the
// pages can both import it. The real item SETs are derived from live DB columns
// in lib/db/queries/sort-it.ts (server) and baked at ISR by each page's
// revalidate window.
//
// REAL DATA ONLY: every playlist is generated from real groups/songs columns and
// min-volume gated at >= SORT_IT_MIN_ITEMS. A playlist whose live query returns
// fewer than that is treated as unavailable (never padded).

export const SORT_IT_MIN_ITEMS = 30;

/** One card in the sort stack: a real entity and the bucket it belongs in. */
export interface SortItItem {
  /** Stable id (the group slug) - used as the React key and shuffle identity. */
  id: string;
  label: string;
  /** 'left' maps to buckets[0], 'right' maps to buckets[1]. */
  bucket: 'left' | 'right';
  imageUrl?: string | null;
}

export interface SortItPlaylist {
  slug: string;
  /** The sort prompt shown above the stack, e.g. "Boy group or girl group?". */
  question: string;
  /** Bucket labels. buckets[0] = left, buckets[1] = right. */
  buckets: [string, string];
  /** Page H1 + hub card name. */
  title: string;
  /** One-line intro under the title. */
  blurb: string;
  /** Pre-brand SEO title (the site template appends " | KpopQuiz"). */
  seoTitle: string;
  seoDescription: string;
}

// Only playlists whose data gates were verified against the live DB ship here.
// Verified 2026-07-27: boy/girl = 59 clean groups (28 boy, 31 girl). The
// 3rd-vs-4th-gen playlist (33 items) is added in V1.2. "Title track or b-side?"
// and company sorts were gated out (no b-side labels; no company column).
export const SORT_IT_PLAYLISTS: SortItPlaylist[] = [
  {
    slug: 'boy-group-or-girl-group',
    question: 'Boy group or girl group?',
    buckets: ['Boy group', 'Girl group'],
    title: 'Boy Group or Girl Group?',
    blurb: 'Sort real K-pop acts into boy group or girl group before the clock adds up. Tap a side or swipe.',
    seoTitle: 'Boy Group or Girl Group? K-pop Sorting Quiz',
    seoDescription:
      'Can you sort real K-pop acts into boy group or girl group? A fast tap-or-swipe sorting quiz over dozens of groups. Free, no sign-up, instant score.',
  },
];

export function getSortItPlaylist(slug: string): SortItPlaylist | undefined {
  return SORT_IT_PLAYLISTS.find((p) => p.slug === slug);
}
