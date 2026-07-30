// Verse public read queries. Cookie-free (createPublicReadClient) so /verse
// pages stay ISR-cacheable. Every query is NANO-cheap and min-gated: a group
// with no seeded data simply does not appear as a space.
import { createPublicReadClient } from '@/lib/supabase/server';

export interface SpaceTile {
  group_id: number;
  name: string;
  slug: string;
  fandom_name: string;
  display_color: string | null;
  text_color: string | null;
  logo_url: string | null;
  memberCount: number;
  albumCount: number;
  is_launch: boolean;
  est_year: number | null;
}

/**
 * Whole-catalog totals for the V-HOME numbers. Head counts (count:'exact',
 * head:true) so they are ROBUST past the 1000-row select cap and cheap (no rows
 * fetched). releases = every catalogued album (the catalog claim, not tile scope).
 */
export async function getCatalogTotals(): Promise<{ idols: number; releases: number }> {
  const db = createPublicReadClient();
  const [{ count: idols }, { count: releases }] = await Promise.all([
    db.from('idols').select('*', { count: 'exact', head: true }).eq('active', true),
    db.from('albums').select('*', { count: 'exact', head: true }),
  ]);
  return { idols: idols ?? 0, releases: releases ?? 0 };
}

/**
 * The spaces directory: every group that has seeded Verse data (>=1 published
 * idol). Launch spaces first, then by member richness. Real data only.
 */
export async function getVerseDirectory(): Promise<SpaceTile[]> {
  const db = createPublicReadClient();

  const [{ data: idols }, { data: albums }, { data: groups }, { data: spaces }] = await Promise.all([
    db.from('idols').select('group_id').eq('active', true),
    db.from('albums').select('group_id'),
    db.from('groups').select('id, name, slug, fandom_name, display_color, text_color, logo_url'),
    db.from('verse_spaces').select('group_id, is_launch, est_year'),
  ]);

  const memberBy = new Map<number, number>();
  for (const r of (idols ?? []) as { group_id: number }[]) memberBy.set(r.group_id, (memberBy.get(r.group_id) ?? 0) + 1);
  const albumBy = new Map<number, number>();
  for (const r of (albums ?? []) as { group_id: number }[]) albumBy.set(r.group_id, (albumBy.get(r.group_id) ?? 0) + 1);
  const spaceBy = new Map<number, { is_launch: boolean; est_year: number | null }>();
  for (const r of (spaces ?? []) as { group_id: number; is_launch: boolean; est_year: number | null }[]) spaceBy.set(r.group_id, r);
  const groupBy = new Map<number, { id: number; name: string; slug: string; fandom_name: string; display_color: string | null; text_color: string | null; logo_url: string | null }>();
  for (const g of (groups ?? []) as never[]) groupBy.set((g as { id: number }).id, g);

  const tiles: SpaceTile[] = [];
  for (const [gid, count] of memberBy) {
    const g = groupBy.get(gid);
    if (!g) continue;
    const sp = spaceBy.get(gid);
    tiles.push({
      group_id: gid, name: g.name, slug: g.slug, fandom_name: g.fandom_name,
      display_color: g.display_color, text_color: g.text_color, logo_url: g.logo_url,
      memberCount: count, albumCount: albumBy.get(gid) ?? 0,
      is_launch: sp?.is_launch ?? false, est_year: sp?.est_year ?? null,
    });
  }
  tiles.sort((a, b) =>
    (b.is_launch ? 1 : 0) - (a.is_launch ? 1 : 0)
    || b.memberCount - a.memberCount
    || a.name.localeCompare(b.name));
  return tiles;
}
