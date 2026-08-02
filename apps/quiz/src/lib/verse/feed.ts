// V-COMM-3 step 3 - the CROSS-SPACE feed. A live, typed read of what is happening
// across the Verse, DERIVED from existing tables (the same real-data-only shape as
// the V-PROFILE-ONE activity model, reused not rebuilt). Per-space opt-in is the
// gate: ONLY spaces with verse_spaces.feed_opt_in = true surface here, so a space
// that has not opted in stays out of the global feed entirely. Min-gated: no
// opted-in activity -> an empty list (the hub renders an invite, not fake data).

import { createPublicReadClient } from '@/lib/supabase/server';

export type FeedKind = 'page' | 'essay' | 'thread' | 'comeback';

export interface FeedItem {
  kind: FeedKind;
  at: string;                 // ISO sort key
  title: string;
  href: string;
  groupSlug: string;
  groupName: string;
}

const PER_SOURCE = 30;

/** The cross-space feed: recent pages, essays, threads and comebacks from spaces
 * that opted in. Newest first, capped. */
export async function getCrossSpaceFeed(limit = 24): Promise<FeedItem[]> {
  const db = createPublicReadClient();

  // The opt-in gate: which spaces surface at all.
  const { data: optedRows } = await db.from('verse_spaces').select('group_id').eq('feed_opt_in', true).limit(500);
  const groupIds = [...new Set(((optedRows ?? []) as Array<{ group_id: number }>).map((r) => r.group_id))];
  if (groupIds.length === 0) return []; // min-gate: nobody opted in

  const { data: groups } = await db.from('groups').select('id, slug, name, fandom_name').in('id', groupIds);
  const grp = new Map((groups ?? []).map((g) => [(g as { id: number }).id, g as { id: number; slug: string; name: string; fandom_name: string }]));
  const g = (id: number): { slug: string; name: string } | null => { const x = grp.get(id); return x ? { slug: x.slug, name: x.fandom_name || x.name } : null; };

  const [pages, essays, threads, comebacks] = await Promise.all([
    db.from('verse_pages').select('slug, title, group_id, published_at').in('group_id', groupIds).eq('status', 'published').order('published_at', { ascending: false, nullsFirst: false }).limit(PER_SOURCE),
    db.from('verse_essays').select('id, title, group_id, featured_at').in('group_id', groupIds).eq('status', 'featured').order('featured_at', { ascending: false, nullsFirst: false }).limit(PER_SOURCE),
    db.from('verse_threads').select('slug, title, group_id, created_at').in('group_id', groupIds).eq('status', 'visible').order('created_at', { ascending: false }).limit(PER_SOURCE),
    db.from('comebacks').select('title, kind, group_id, release_date').in('group_id', groupIds).eq('active', true).gte('release_date', new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)).order('release_date', { ascending: false }).limit(PER_SOURCE),
  ]);

  const items: FeedItem[] = [];
  for (const p of (pages.data ?? []) as Array<{ slug: string; title: string; group_id: number; published_at: string | null }>) {
    const gg = g(p.group_id); if (!gg || !p.published_at) continue;
    items.push({ kind: 'page', at: p.published_at, title: p.title, href: `/verse/${gg.slug}/wiki/${p.slug}`, groupSlug: gg.slug, groupName: gg.name });
  }
  for (const e of (essays.data ?? []) as Array<{ id: number; title: string; group_id: number; featured_at: string | null }>) {
    const gg = g(e.group_id); if (!gg || !e.featured_at) continue;
    items.push({ kind: 'essay', at: e.featured_at, title: e.title, href: `/verse/${gg.slug}/essays/${e.id}`, groupSlug: gg.slug, groupName: gg.name });
  }
  for (const t of (threads.data ?? []) as Array<{ slug: string; title: string; group_id: number; created_at: string }>) {
    const gg = g(t.group_id); if (!gg) continue;
    items.push({ kind: 'thread', at: t.created_at, title: t.title, href: `/verse/${gg.slug}/community/${t.slug}`, groupSlug: gg.slug, groupName: gg.name });
  }
  for (const c of (comebacks.data ?? []) as Array<{ title: string; kind: string; group_id: number; release_date: string }>) {
    const gg = g(c.group_id); if (!gg) continue;
    items.push({ kind: 'comeback', at: c.release_date, title: c.title, href: `/verse/${gg.slug}/timeline`, groupSlug: gg.slug, groupName: gg.name });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items.slice(0, limit);
}
