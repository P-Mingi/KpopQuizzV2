import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { getNameThemAllPlaylist, NAME_THEM_ALL_MIN, type NameThemAllItem } from '@/lib/games/name-them-all';

// Server-side item derivation for "Name Them All" datasets (Workstream V3).
//
// Built from live DB columns, never hand-authored, gated at NAME_THEM_ALL_MIN.
// Uses the cookie-free public read client (ISR-safe). Groups flagged custom /
// needs_review and the "general-kpop" catch-all are excluded. Aliases are empty:
// no alternate-name column exists, so we never invent them.

interface GroupRow {
  name: string;
  slug: string;
  generation: string | null;
  is_custom: boolean | null;
  needs_review: boolean | null;
}

const EXCLUDED_GROUP_SLUGS = new Set(['general-kpop']);

export const getNameThemAllItems = cache(async (slug: string): Promise<NameThemAllItem[]> => {
  const playlist = getNameThemAllPlaylist(slug);
  if (!playlist) return [];

  const db = createPublicReadClient();
  const { data } = await db.from('groups').select('name, slug, generation, is_custom, needs_review');
  const clean = ((data ?? []) as GroupRow[]).filter(
    (g) => !g.is_custom && !g.needs_review && !EXCLUDED_GROUP_SLUGS.has(g.slug),
  );

  let rows: GroupRow[] = [];
  if (slug === 'name-all-kpop-groups') {
    rows = clean;
  } else if (slug === 'name-all-3rd-gen-groups') {
    rows = clean.filter((g) => g.generation === '3rd Gen');
  } else if (slug === 'name-all-4th-gen-groups') {
    rows = clean.filter((g) => g.generation === '4th Gen');
  }

  const items: NameThemAllItem[] = rows.map((g) => ({ name: g.name, aliases: [] }));
  if (items.length < NAME_THEM_ALL_MIN) return [];
  return items;
});
