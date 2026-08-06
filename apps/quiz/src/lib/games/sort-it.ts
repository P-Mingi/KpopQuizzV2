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
    seoTitle: 'Boy Group or Girl Group? Sort {n} K-pop Groups',
    seoDescription:
      'Can you sort real K-pop acts into boy group or girl group? A fast tap-or-swipe sorting quiz over dozens of groups. Free, no sign-up, instant score.',
  },
  {
    slug: '3rd-gen-or-4th-gen',
    question: '3rd gen or 4th gen?',
    buckets: ['3rd gen', '4th gen'],
    title: '3rd Gen or 4th Gen?',
    blurb: 'Sort K-pop groups into third generation or fourth generation. How sharp is your timeline?',
    seoTitle: '3rd Gen or 4th Gen? Sort {n} K-pop Groups',
    seoDescription:
      'Can you tell 3rd gen from 4th gen K-pop groups? Sort real groups into their generation in this fast tap-or-swipe quiz. Free, no sign-up, instant score.',
  },
  {
    slug: 'solo-act-or-group',
    question: 'Solo act or group?',
    buckets: ['Solo act', 'Group'],
    title: 'Solo Act or Group?',
    blurb: 'Soloist or group? Sort real K-pop artists against the clock. Tap a side or swipe.',
    seoTitle: 'Solo Act or Group? Sort {n} K-pop Acts',
    seoDescription:
      'Can you tell K-pop soloists from groups? Sort real artists into solo act or group in this fast tap-or-swipe quiz. Free, no sign-up, instant score.',
  },
  {
    slug: 'older-gen-or-newer-gen',
    question: 'Older gen or newer gen?',
    buckets: ['Older gen', 'Newer gen'],
    title: 'Older Gen or Newer Gen?',
    blurb: 'Older generation (2nd/3rd) or newer (4th/5th)? Sort real K-pop groups by era against the clock.',
    seoTitle: 'Older Gen or Newer Gen? Sort {n} K-pop Groups',
    seoDescription:
      'Can you sort K-pop groups into older (2nd/3rd gen) or newer (4th/5th gen)? A fast tap-or-swipe era quiz over real groups. Free, no sign-up, instant score.',
  },
];

export function getSortItPlaylist(slug: string): SortItPlaylist | undefined {
  return SORT_IT_PLAYLISTS.find((p) => p.slug === slug);
}
