// W5.2 - photocard catalog + personal owned/wanted checklist + collection progress.
// Catalog is public (published only, RLS). Collection is private (service-role, per user).
// Collection badges reuse the existing user_badges spine.
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';

export interface Photocard { id: number; name: string; card_type: string | null; era: string | null; version: string | null; rarity: string | null; image_url: string | null; idol_id: number | null; album_id: number | null; source_url: string | null }
export type CardState = 'owned' | 'wanted';

// Collection badges (seeded into badge_definitions by scripts/seed-collection-badges.mjs).
export const COLLECTION_BADGES = { first: 'pc_first', collector: 'pc_collector', set: 'pc_set' } as const;
const COLLECTOR_THRESHOLD = 25;

/** Count of published photocards for a space - drives the conditional Photocards tab. */
export async function photocardCount(groupId: number): Promise<number> {
  const db = createPublicReadClient();
  const { count } = await db.from('photocards').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'published');
  return count ?? 0;
}

/** Published photocards for a space (public / ISR). */
export async function getPhotocards(groupId: number): Promise<Photocard[]> {
  const db = createPublicReadClient();
  const { data } = await db.from('photocards').select('id, name, card_type, era, version, rarity, image_url, idol_id, album_id, source_url').eq('group_id', groupId).order('era', { ascending: false, nullsFirst: false }).order('name');
  return (data ?? []) as Photocard[];
}

/** A user's card_id -> state map for a space (private). */
export async function getUserCollection(userId: string, groupId: number): Promise<Record<number, CardState>> {
  const db = createServiceRoleClient();
  const { data } = await db.from('photocard_collection')
    .select('photocard_id, state, photocards!inner(group_id)')
    .eq('user_id', userId).eq('photocards.group_id', groupId);
  const out: Record<number, CardState> = {};
  for (const r of (data ?? []) as Array<{ photocard_id: number; state: CardState }>) out[r.photocard_id] = r.state;
  return out;
}

export interface CollectionProgress { owned: number; wanted: number; totalCards: number; perGroup: Array<{ groupId: number; name: string; slug: string; owned: number; total: number }> }

/** Global collection progress for the passport: total owned + per-group owned/total. */
export async function getCollectionProgress(userId: string): Promise<CollectionProgress> {
  const db = createServiceRoleClient();
  const { data: mine } = await db.from('photocard_collection').select('state, photocards!inner(group_id)').eq('user_id', userId);
  const rows = (mine ?? []) as Array<{ state: CardState; photocards: { group_id: number } | { group_id: number }[] }>;
  const owned = rows.filter((r) => r.state === 'owned');
  const wanted = rows.filter((r) => r.state === 'wanted').length;

  const ownedByGroup = new Map<number, number>();
  for (const r of owned) { const g = Array.isArray(r.photocards) ? r.photocards[0] : r.photocards; if (g) ownedByGroup.set(g.group_id, (ownedByGroup.get(g.group_id) ?? 0) + 1); }
  if (ownedByGroup.size === 0) return { owned: owned.length, wanted, totalCards: 0, perGroup: [] };

  const ids = [...ownedByGroup.keys()];
  const { data: groups } = await db.from('groups').select('id, name, slug').in('id', ids);
  const totals = await Promise.all(ids.map(async (gid) => [gid, (await db.from('photocards').select('id', { count: 'exact', head: true }).eq('group_id', gid).eq('status', 'published')).count ?? 0] as const));
  const totalMap = new Map(totals);
  const gMap = new Map((groups ?? []).map((g: { id: number; name: string; slug: string }) => [g.id, g]));

  const perGroup = ids.map((gid) => ({ groupId: gid, name: gMap.get(gid)?.name ?? '', slug: gMap.get(gid)?.slug ?? '', owned: ownedByGroup.get(gid) ?? 0, total: totalMap.get(gid) ?? 0 })).sort((a, b) => b.owned - a.owned);
  return { owned: owned.length, wanted, totalCards: perGroup.reduce((s, g) => s + g.total, 0), perGroup };
}

/** Award collection milestone badges (user_badges spine). Idempotent. */
export async function checkCollectionBadges(userId: string): Promise<void> {
  const db = createServiceRoleClient();
  const { count: ownedCount } = await db.from('photocard_collection').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('state', 'owned');
  const owned = ownedCount ?? 0;
  const grant = async (badge_id: string) => { await db.from('user_badges').upsert({ user_id: userId, badge_id }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true }); };

  if (owned >= 1) await grant(COLLECTION_BADGES.first);
  if (owned >= COLLECTOR_THRESHOLD) await grant(COLLECTION_BADGES.collector);

  // Full set: owns every published card of some group.
  const prog = await getCollectionProgress(userId);
  if (prog.perGroup.some((g) => g.total > 0 && g.owned >= g.total)) await grant(COLLECTION_BADGES.set);
}
