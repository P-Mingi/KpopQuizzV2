import { createPublicReadClient } from '@/lib/supabase/server';
import { getSortItPlaylist, SORT_IT_MIN_ITEMS, type SortItItem } from '@/lib/games/sort-it';

// Server-side item derivation for "Sort It" playlists (Workstream V1).
//
// Every set is built from live DB columns, never hand-authored, and gated at
// SORT_IT_MIN_ITEMS so a thin playlist ships nothing rather than a padded stack.
// Uses the cookie-free public read client so the pages stay ISR-safe. Groups
// flagged is_custom / needs_review are excluded everywhere for quality.
//
// Note on gender: the groups table has no gender column. Gender is a real,
// group-consistent attribute stored per song on songs.gender (bg = boy group,
// gg = girl group, solo_male/solo_female/coed = not a boy-or-girl-group answer).
// We derive each group's bucket as the dominant label across its active songs.

type DbClient = ReturnType<typeof createPublicReadClient>;

// Some rows carry placeholder / malformed logo_url values (e.g. the literal
// "YOUR_NEW_URL_HERE"). next/image throws on those, so only pass through values
// that are a real absolute URL or a root-relative path; everything else becomes
// null and the player renders the monogram fallback.
function safeLogoUrl(url: string | null): string | null {
  if (!url) return null;
  return /^(https?:\/\/|\/)/.test(url) ? url : null;
}

interface GroupRow {
  id: string;
  name: string;
  slug: string;
  generation: string | null;
  logo_url: string | null;
  is_custom: boolean | null;
  needs_review: boolean | null;
}

async function loadCleanGroups(db: DbClient): Promise<GroupRow[]> {
  const { data } = await db
    .from('groups')
    .select('id, name, slug, generation, logo_url, is_custom, needs_review');
  return ((data ?? []) as GroupRow[]).filter((g) => !g.is_custom && !g.needs_review);
}

/**
 * Map of group id -> dominant songs.gender label, across active songs. Paginated
 * because the PostgREST client caps a single response at 1000 rows and the song
 * table exceeds that; the dominant label is stable per group in practice.
 */
async function deriveGroupGenders(db: DbClient): Promise<Map<string, string>> {
  const counts = new Map<string, Record<string, number>>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data } = await db
      .from('songs')
      .select('group_id, gender')
      .eq('status', 'active')
      .not('group_id', 'is', null)
      .range(from, from + page - 1);
    if (!data || data.length === 0) break;
    for (const s of data as Array<{ group_id: string; gender: string | null }>) {
      if (!s.gender) continue;
      const rec = counts.get(s.group_id) ?? {};
      rec[s.gender] = (rec[s.gender] ?? 0) + 1;
      counts.set(s.group_id, rec);
    }
    if (data.length < page) break;
  }

  const out = new Map<string, string>();
  for (const [gid, rec] of counts) {
    let best: string | null = null;
    let bestVal = -1;
    for (const [label, n] of Object.entries(rec)) {
      if (n > bestVal) {
        best = label;
        bestVal = n;
      }
    }
    if (best) out.set(gid, best);
  }
  return out;
}

/**
 * Build the baked item set for a Sort It playlist from live data. Returns [] if
 * the playlist is unknown or the gate is not met (caller treats [] as notFound).
 */
export async function getSortItItems(slug: string): Promise<SortItItem[]> {
  const playlist = getSortItPlaylist(slug);
  if (!playlist) return [];

  const db = createPublicReadClient();
  const groups = await loadCleanGroups(db);
  const items: SortItItem[] = [];

  if (slug === 'boy-group-or-girl-group') {
    const genders = await deriveGroupGenders(db);
    for (const g of groups) {
      const label = genders.get(g.id);
      if (label === 'bg') items.push({ id: g.slug, label: g.name, bucket: 'left', imageUrl: safeLogoUrl(g.logo_url) });
      else if (label === 'gg') items.push({ id: g.slug, label: g.name, bucket: 'right', imageUrl: safeLogoUrl(g.logo_url) });
    }
  } else if (slug === '3rd-gen-or-4th-gen') {
    for (const g of groups) {
      if (g.generation === '3rd Gen') items.push({ id: g.slug, label: g.name, bucket: 'left', imageUrl: safeLogoUrl(g.logo_url) });
      else if (g.generation === '4th Gen') items.push({ id: g.slug, label: g.name, bucket: 'right', imageUrl: safeLogoUrl(g.logo_url) });
    }
  }

  // Real-data min-volume gate. Never pad below the floor.
  if (items.length < SORT_IT_MIN_ITEMS) return [];
  return items;
}
