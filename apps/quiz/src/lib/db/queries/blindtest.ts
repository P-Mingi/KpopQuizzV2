import { createServerClient } from '@/lib/supabase/server';

// Blindtest setup group list, derived from ACTUAL catalog counts using the SAME
// match the generate route uses (songs.group_id), so the picker can never drift
// from runtime. Only groups with comfortable headroom over the 10 needed per
// game are offered, so every offered group yields a full 10-song game.

export interface BlindtestGroup {
  slug: string;
  name: string;
  count: number;
}

// Headroom over the 10 songs a game needs, so the tier mix always fills to 10.
const MIN_SONGS_FOR_GROUP = 15;

export async function getBlindtestGroups(): Promise<BlindtestGroup[]> {
  const supabase = await createServerClient();

  // Count active, non-junk songs per group_id (mirrors the generate pool: same
  // status + title guards, matched by group_id rather than artist_name).
  const rows: Array<{ group_id: number }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('songs')
      .select('group_id')
      .eq('status', 'active')
      .not('group_id', 'is', null)
      .not('title', 'ilike', '%remix%')
      .not('title', 'ilike', '%instrumental%')
      .not('title', 'ilike', '%inst.%')
      .not('title', 'ilike', '%karaoke%')
      .range(from, from + 999);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Array<{ group_id: number }>));
    if (data.length < 1000) break;
  }

  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r.group_id, (counts.get(r.group_id) ?? 0) + 1);

  const eligible = [...counts.entries()].filter(([, c]) => c >= MIN_SONGS_FOR_GROUP);
  if (eligible.length === 0) return [];

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, slug')
    .in('id', eligible.map(([id]) => id));

  const byId = new Map((groups ?? []).map((g) => [g.id as number, g as { name: string; slug: string }]));

  return eligible
    .map(([id, count]) => {
      const g = byId.get(id);
      return g ? { slug: g.slug, name: g.name, count } : null;
    })
    .filter((x): x is BlindtestGroup => x !== null)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
