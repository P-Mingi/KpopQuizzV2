// W5.3 - merch + lightstick gallery + personal owned/wanted checklist.
// Mirrors photocards (W5.2): public catalog (published only, RLS) + private per-user
// collection (service-role). One table, `kind` discriminates merch vs lightstick.
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';

export type CollectibleKind = 'merch' | 'lightstick';
export type CollectibleState = 'owned' | 'wanted';
export interface Collectible {
  id: number; kind: CollectibleKind; name: string; category: string | null;
  era: string | null; version: string | null; image_url: string | null; source_url: string | null;
}

/** Count of published collectibles for a space - drives the conditional Collectibles tab. */
export async function collectibleCount(groupId: number): Promise<number> {
  const db = createPublicReadClient();
  const { count } = await db.from('collectibles').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'published');
  return count ?? 0;
}

/** Published collectibles for a space (public / ISR), ordered merch-then-lightstick, newest era first. */
export async function getCollectibles(groupId: number): Promise<Collectible[]> {
  const db = createPublicReadClient();
  const { data } = await db.from('collectibles')
    .select('id, kind, name, category, era, version, image_url, source_url')
    .eq('group_id', groupId).eq('status', 'published')
    .order('kind').order('era', { ascending: false, nullsFirst: false }).order('name');
  return (data ?? []) as Collectible[];
}

// V-CARDS-MAX step 5 - the SHELF groups collectibles into rows by kind (the
// lightsticks first: the signature object). Its own metaphor, not a binder.
export interface ShelfRow { key: string; label: string; items: Collectible[] }

export async function getCollectibleShelf(groupId: number): Promise<ShelfRow[]> {
  const items = await getCollectibles(groupId);
  if (!items.length) return [];
  const rows = new Map<string, ShelfRow>();
  for (const it of items) {
    if (!rows.has(it.kind)) rows.set(it.kind, { key: it.kind, label: it.kind === 'lightstick' ? 'Lightsticks' : 'Merch', items: [] });
    rows.get(it.kind)!.items.push(it);
  }
  return [...rows.values()].sort((a) => (a.key === 'lightstick' ? -1 : 1));
}

/** A user's collectible_id -> state map for a space (private). */
export async function getUserCollectibles(userId: string, groupId: number): Promise<Record<number, CollectibleState>> {
  const db = createServiceRoleClient();
  const { data } = await db.from('collectible_collection')
    .select('collectible_id, state, collectibles!inner(group_id)')
    .eq('user_id', userId).eq('collectibles.group_id', groupId);
  const out: Record<number, CollectibleState> = {};
  for (const r of (data ?? []) as Array<{ collectible_id: number; state: CollectibleState }>) out[r.collectible_id] = r.state;
  return out;
}
