// V-CARDS-MAX step 4 - the profile SHELF: a fan's top pinned cards, shown on
// their public profile ONLY after an explicit opt-in (default OFF). The pins live
// in verse_profile_shelf; the opt-in in verse_profile_shelf_settings. Counts-only
// / no-names rules do not apply here (these are the user's OWN pins on their OWN
// profile), but the cap and the opt-in are enforced server-side.
import { createServiceRoleClient } from '@/lib/supabase/server';

// Owner-locked: the showcase holds at most this many (the "3-5" cap; a 6th pin is rejected).
export const SHELF_CAP = 5;

export interface ShelfItem { item_type: 'photocard' | 'collectible'; item_id: number; position: number }
export interface ShelfCard { item_type: 'photocard' | 'collectible'; item_id: number; name: string; era: string | null; version: string | null; groupSlug: string; groupName: string; href: string }

export async function getShelf(userId: string): Promise<{ items: ShelfItem[]; isPublic: boolean }> {
  const svc = createServiceRoleClient();
  const [{ data: items }, { data: settings }] = await Promise.all([
    svc.from('verse_profile_shelf').select('item_type, item_id, position').eq('user_id', userId).order('position'),
    svc.from('verse_profile_shelf_settings').select('is_public').eq('user_id', userId).maybeSingle(),
  ]);
  return { items: (items ?? []) as ShelfItem[], isPublic: !!(settings as { is_public: boolean } | null)?.is_public };
}

/** Resolve pinned photocards to display cards (collectibles join in step 5). */
export async function resolveShelfCards(items: ShelfItem[]): Promise<ShelfCard[]> {
  const pcIds = items.filter((i) => i.item_type === 'photocard').map((i) => i.item_id);
  if (!pcIds.length) return [];
  const svc = createServiceRoleClient();
  const { data } = await svc.from('photocards').select('id, name, era, version, status, groups(slug, name)').in('id', pcIds).eq('status', 'published');
  const rows = (data ?? []) as Array<{ id: number; name: string; era: string | null; version: string | null; groups: { slug: string; name: string } | { slug: string; name: string }[] }>;
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  const out: ShelfCard[] = [];
  for (const it of items) {
    if (it.item_type !== 'photocard') continue;
    const r = byId.get(it.item_id);
    if (!r) continue;
    const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
    if (!g) continue;
    out.push({ item_type: 'photocard', item_id: r.id, name: r.name, era: r.era, version: r.version, groupSlug: g.slug, groupName: g.name, href: `/verse/${g.slug}/photocards/${r.id}` });
  }
  return out;
}

/** A profile's public shelf: empty unless the user opted in. */
export async function getPublicShelfCards(userId: string): Promise<ShelfCard[]> {
  const { items, isPublic } = await getShelf(userId);
  if (!isPublic || !items.length) return [];
  return resolveShelfCards(items);
}
