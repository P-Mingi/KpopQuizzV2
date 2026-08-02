// V-PROFILE-ONE step 2 - THE ACTIVITY MODEL (shared plumbing; V-COMM-3's feeds
// reuse this). A unified, typed read of what a user has DONE, DERIVED live from
// existing tables - no new write-log. Real data only: every item is a real row at
// a real time. Sources: page edits (verse_revisions), published essays
// (verse_essays), quiz plays (game_plays), space joins (space_members), showcase
// pins (verse_profile_shelf). Quest completions are intentionally absent: there is
// NO quest-completion table in the schema (quests are computed live), so inventing
// one would violate real-data-only.

import { createServiceRoleClient } from '@/lib/supabase/server';

export type ActivityKind = 'page_edit' | 'essay' | 'quiz_play' | 'space_join' | 'card_add';

export interface ActivityItem {
  kind: ActivityKind;
  at: string;                 // ISO timestamp (sort key)
  userId: string;
  title: string;              // honest human label
  href: string | null;       // link to the thing, when one exists
  groupSlug: string | null;
  groupName: string | null;
}

const PER_SOURCE = 40;        // cap each source before merge; the final limit trims

/** A user's recent activity across both worlds, newest first, derived + merged. */
export async function getUserActivity(userId: string, opts?: { limit?: number; kinds?: ActivityKind[] }): Promise<ActivityItem[]> {
  const limit = opts?.limit ?? 20;
  const want = opts?.kinds ? new Set(opts.kinds) : null;
  const on = (k: ActivityKind): boolean => !want || want.has(k);
  const svc = createServiceRoleClient();

  const [revs, essays, joins, plays, cards] = await Promise.all([
    on('page_edit') ? svc.from('verse_revisions').select('entity_id, created_at').eq('author', userId).eq('entity_type', 'page').order('created_at', { ascending: false }).limit(PER_SOURCE) : Promise.resolve({ data: [] }),
    on('essay') ? svc.from('verse_essays').select('id, title, group_id, featured_at, created_at').eq('author', userId).eq('status', 'featured').order('featured_at', { ascending: false, nullsFirst: false }).limit(PER_SOURCE) : Promise.resolve({ data: [] }),
    on('space_join') ? svc.from('space_members').select('group_id, joined_at, status').eq('user_id', userId).order('joined_at', { ascending: false }).limit(PER_SOURCE) : Promise.resolve({ data: [] }),
    on('quiz_play') ? svc.from('game_plays').select('game_id, created_at').eq('player_id', userId).order('created_at', { ascending: false }).limit(PER_SOURCE) : Promise.resolve({ data: [] }),
    on('card_add') ? svc.from('verse_profile_shelf').select('item_type, item_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(PER_SOURCE) : Promise.resolve({ data: [] }),
  ]);

  const revRows = (revs.data ?? []) as Array<{ entity_id: string; created_at: string }>;
  const essayRows = (essays.data ?? []) as Array<{ id: number; title: string; group_id: number; featured_at: string | null; created_at: string }>;
  const joinRows = (joins.data ?? []) as Array<{ group_id: number; joined_at: string; status: string }>;
  const playRows = (plays.data ?? []) as Array<{ game_id: string; created_at: string }>;
  const cardRows = (cards.data ?? []) as Array<{ item_type: string; item_id: number; created_at: string }>;

  // Batch-resolve the referenced rows (pages, games, cards, groups).
  const pageIds = [...new Set(revRows.map((r) => Number(r.entity_id)).filter(Number.isFinite))];
  const gameIds = [...new Set(playRows.map((p) => p.game_id))];
  const pcIds = [...new Set(cardRows.filter((c) => c.item_type === 'photocard').map((c) => c.item_id))];
  const colIds = [...new Set(cardRows.filter((c) => c.item_type === 'collectible').map((c) => c.item_id))];

  const [pagesR, gamesR, pcR, colR] = await Promise.all([
    pageIds.length ? svc.from('verse_pages').select('id, slug, title, group_id, status').in('id', pageIds).eq('status', 'published') : Promise.resolve({ data: [] }),
    gameIds.length ? svc.from('games').select('id, title, game_type').in('id', gameIds) : Promise.resolve({ data: [] }),
    pcIds.length ? svc.from('photocards').select('id, name').in('id', pcIds) : Promise.resolve({ data: [] }),
    colIds.length ? svc.from('collectibles').select('id, name').in('id', colIds) : Promise.resolve({ data: [] }),
  ]);
  const pageById = new Map((pagesR.data ?? []).map((p) => [(p as { id: number }).id, p as { id: number; slug: string; title: string; group_id: number }]));
  const gameById = new Map((gamesR.data ?? []).map((g) => [(g as { id: string }).id, g as { id: string; title: string | null; game_type: string | null }]));
  const cardName = new Map<string, string>();
  for (const c of (pcR.data ?? []) as Array<{ id: number; name: string }>) cardName.set(`photocard:${c.id}`, c.name);
  for (const c of (colR.data ?? []) as Array<{ id: number; name: string }>) cardName.set(`collectible:${c.id}`, c.name);

  // Resolve every referenced group (from pages, essays, joins) in one read.
  const groupIds = [...new Set([...essayRows.map((e) => e.group_id), ...joinRows.map((j) => j.group_id), ...[...pageById.values()].map((p) => p.group_id)])];
  const groupsR = groupIds.length ? await svc.from('groups').select('id, slug, name, fandom_name').in('id', groupIds) : { data: [] };
  const groupById = new Map((groupsR.data ?? []).map((g) => [(g as { id: number }).id, g as { id: number; slug: string; name: string; fandom_name: string }]));
  const grp = (id: number | undefined): { slug: string; name: string } | null => {
    const g = id != null ? groupById.get(id) : undefined;
    return g ? { slug: g.slug, name: g.fandom_name || g.name } : null;
  };

  const items: ActivityItem[] = [];

  for (const r of revRows) {
    const page = pageById.get(Number(r.entity_id));
    if (!page) continue; // edit on a non-published/removed page -> not public activity
    const g = grp(page.group_id);
    items.push({ kind: 'page_edit', at: r.created_at, userId, title: `Edited ${page.title}`, href: g ? `/verse/${g.slug}/wiki/${page.slug}` : null, groupSlug: g?.slug ?? null, groupName: g?.name ?? null });
  }
  for (const e of essayRows) {
    const g = grp(e.group_id);
    items.push({ kind: 'essay', at: e.featured_at ?? e.created_at, userId, title: `Published ${e.title}`, href: g ? `/verse/${g.slug}/essays/${e.id}` : null, groupSlug: g?.slug ?? null, groupName: g?.name ?? null });
  }
  for (const j of joinRows) {
    if (j.status === 'blocked') continue;
    const g = grp(j.group_id);
    if (!g) continue;
    items.push({ kind: 'space_join', at: j.joined_at, userId, title: `Joined ${g.name}`, href: `/verse/${g.slug}`, groupSlug: g.slug, groupName: g.name });
  }
  for (const p of playRows) {
    const game = gameById.get(p.game_id);
    items.push({ kind: 'quiz_play', at: p.created_at, userId, title: game?.title ? `Played ${game.title}` : 'Played a quiz', href: null, groupSlug: null, groupName: null });
  }
  for (const c of cardRows) {
    const name = cardName.get(`${c.item_type}:${c.item_id}`);
    items.push({ kind: 'card_add', at: c.created_at, userId, title: name ? `Added ${name} to their showcase` : 'Added a card to their showcase', href: null, groupSlug: null, groupName: null });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items.slice(0, limit);
}
