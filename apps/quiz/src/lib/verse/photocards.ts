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

// V-CARDS-MAX - the binder groups the catalog into SETS (the real-binder mental
// model: one page per set). A set is the album a card shipped with; cards with no
// album fall back to their era, then a single "Other cards" page. Auto-by-set is
// the zero-effort default; manual arrangement (verse_binders.layout) reorders on top.
export interface BinderSet {
  key: string; label: string; albumId: number | null; mbid: string | null;
  releaseYear: string | null; cards: Photocard[];
}

export async function getPhotocardSets(groupId: number): Promise<BinderSet[]> {
  const cards = await getPhotocards(groupId);
  if (!cards.length) return [];
  const albumIds = [...new Set(cards.map((c) => c.album_id).filter((x): x is number => !!x))];
  const albumMap = new Map<number, { title: string; mbid: string | null; release_date: string | null }>();
  if (albumIds.length) {
    const db = createPublicReadClient();
    const { data } = await db.from('albums').select('id, title, mbid, release_date').in('id', albumIds);
    for (const a of (data ?? []) as Array<{ id: number; title: string; mbid: string | null; release_date: string | null }>) albumMap.set(a.id, a);
  }
  const sets = new Map<string, BinderSet>();
  for (const c of cards) {
    const a = c.album_id ? albumMap.get(c.album_id) : undefined;
    const key = a ? `album:${c.album_id}` : c.era ? `era:${c.era}` : 'other';
    const label = a ? a.title : c.era ?? 'Other cards';
    if (!sets.has(key)) sets.set(key, { key, label, albumId: a ? c.album_id : null, mbid: a?.mbid ?? null, releaseYear: a?.release_date?.slice(0, 4) ?? null, cards: [] });
    sets.get(key)!.cards.push(c);
  }
  // Album sets newest-year first, then era sets, then the Other page last.
  return [...sets.values()].sort((x, y) => {
    if (x.key === 'other') return 1;
    if (y.key === 'other') return -1;
    const xy = x.releaseYear ? Number(x.releaseYear) : -1;
    const yy = y.releaseYear ? Number(y.releaseYear) : -1;
    return yy - xy || x.label.localeCompare(y.label);
  });
}

// V-CARDS-MAX step 3 - the per-card community signal is COUNTS ONLY, and only
// once a card clears this floor (never a small number that could deanonymize a
// tiny collector pool). Single source of truth, like RANKING_UNLOCK_VOTES.
export const COMMUNITY_FLOOR = 5;

export interface PhotocardRow extends Photocard { source_note: string | null; group_id: number }

/** One published card by id for its detail page. Throws on query error so a
 *  transient failure does not bake a 404 into ISR; returns null for missing/draft. */
export async function getPhotocardById(cardId: number, groupId: number): Promise<PhotocardRow | null> {
  const db = createPublicReadClient();
  const { data, error } = await db.from('photocards')
    .select('id, name, card_type, era, version, rarity, image_url, idol_id, album_id, source_url, source_note, group_id, status')
    .eq('id', cardId).eq('group_id', groupId).maybeSingle();
  if (error) throw new Error(`getPhotocardById(${cardId}): ${error.message}`);
  const row = data as (PhotocardRow & { status: string }) | null;
  if (!row || row.status !== 'published') return null;
  return row;
}

/** Community own/want counts for a card (aggregate, no identities). */
export async function getCardCommunityCounts(cardId: number): Promise<{ owned: number; wanted: number }> {
  const db = createServiceRoleClient();
  const [{ count: owned }, { count: wanted }] = await Promise.all([
    db.from('photocard_collection').select('id', { count: 'exact', head: true }).eq('photocard_id', cardId).eq('state', 'owned'),
    db.from('photocard_collection').select('id', { count: 'exact', head: true }).eq('photocard_id', cardId).eq('state', 'wanted'),
  ]);
  return { owned: owned ?? 0, wanted: wanted ?? 0 };
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
