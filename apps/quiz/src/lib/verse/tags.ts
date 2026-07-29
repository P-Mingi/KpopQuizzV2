// W3K.7 - category / tag hubs. Auto-index pages derived from existing group columns
// (generation, label, country); no new schema. A hub only exists when >=2 content groups
// share the value (min-gate: no one-item category pages). Hubs interlink group pages
// and give crawlers topic clusters.
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/verse/slug';

export interface TagHub {
  dim: 'gen' | 'label' | 'country';
  dimLabel: string;
  column: 'generation' | 'record_label' | 'origin_country';
  value: string;
  slug: string;
  label: string;
  count: number;
}

export interface HubGroup { slug: string; name: string; fandom_name: string | null; generation: string | null; }

const DIMS: Array<{ dim: TagHub['dim']; dimLabel: string; column: TagHub['column']; label: (v: string) => string }> = [
  { dim: 'gen', dimLabel: 'By generation', column: 'generation', label: (v) => `${v} groups` },
  { dim: 'label', dimLabel: 'By label', column: 'record_label', label: (v) => v },
  { dim: 'country', dimLabel: 'By country', column: 'origin_country', label: (v) => `Groups from ${v}` },
];

const MIN_GROUPS = 2;

// Groups that have a public Verse presence (>=1 album), with their category columns.
const contentGroups = cache(async (): Promise<Array<{ id: number; slug: string; name: string; fandom_name: string | null; generation: string | null; record_label: string | null; origin_country: string | null }>> => {
  const db = createPublicReadClient();
  const { data: albums } = await db.from('albums').select('group_id');
  const ids = [...new Set(((albums ?? []) as Array<{ group_id: number }>).map((a) => a.group_id))];
  if (!ids.length) return [];
  const { data: groups } = await db.from('groups').select('id, slug, name, fandom_name, generation, record_label, origin_country').in('id', ids);
  return (groups ?? []) as never[];
});

/** All category hubs with >=2 groups, ready to render as a directory or chips. */
export const listHubs = cache(async (): Promise<TagHub[]> => {
  const groups = await contentGroups();
  const hubs: TagHub[] = [];
  for (const d of DIMS) {
    const counts = new Map<string, number>();
    for (const g of groups) { const v = (g[d.column] ?? '').trim(); if (v) counts.set(v, (counts.get(v) ?? 0) + 1); }
    for (const [value, count] of counts) {
      if (count < MIN_GROUPS) continue;
      hubs.push({ dim: d.dim, dimLabel: d.dimLabel, column: d.column, value, slug: `${d.dim}-${slugify(value)}`, label: d.label(value), count });
    }
  }
  return hubs.sort((a, b) => b.count - a.count);
});

/** The hubs a single group belongs to (for chips on its page). */
export async function hubsForGroup(g: { generation: string | null; record_label: string | null; origin_country: string | null }): Promise<TagHub[]> {
  const all = await listHubs();
  return all.filter((h) => (g[h.column] ?? '').trim() === h.value);
}

export async function getHub(slug: string): Promise<TagHub | null> {
  return (await listHubs()).find((h) => h.slug === slug) ?? null;
}

/** Groups in a hub, alphabetized. */
export async function hubGroups(hub: TagHub): Promise<HubGroup[]> {
  const groups = await contentGroups();
  return groups
    .filter((g) => (g[hub.column] ?? '').trim() === hub.value)
    .map((g) => ({ slug: g.slug, name: g.name, fandom_name: g.fandom_name, generation: g.generation }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
