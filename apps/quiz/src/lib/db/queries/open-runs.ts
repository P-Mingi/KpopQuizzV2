import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db/fetch-all';

import type { SupabaseClient } from '@supabase/supabase-js';

// W2b PART C - the time-shifted supply, counted honestly.
//
// An OPEN run is a battle a real person created and finished, that nobody else has
// beaten or attempted yet. There are ~869 of them site-wide. They are the answer to
// "we need more opponents": the opponents already exist, they were just invisible.
//
// COVENANT: this module only ever COUNTS real rows. It never invents a run, never
// rounds up, never applies a floor, and never returns a "minimum interesting" number.
// If a group has zero open runs the caller renders nothing.

type BattleRow = { id: string; challenger_hash: string };

/**
 * Open runs for one group.
 *
 * Paginated on both reads: a JS-side aggregate that stops at PostgREST's 1000-row
 * default would UNDER-count, and an under-count here would be a number shown to
 * users. Bounded reads are fine for a draw; a published count has to be exact.
 */
export async function countOpenRunsForGroup(groupSlug: string): Promise<number> {
  const db: SupabaseClient = createServiceRoleClient();

  const battles = await fetchAllRows<BattleRow>(() =>
    db
      .from('battles')
      .select('id, challenger_hash')
      .eq('group_slug', groupSlug)
      .not('challenger_score', 'is', null),
  );
  if (battles.length === 0) return 0;

  const ids = battles.map((b) => b.id);
  const played = new Map<string, Set<string>>();

  // Chunked so a group with thousands of battles cannot blow the URL length on .in().
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const rows = await fetchAllRows<{ battle_id: string; player_hash: string }>(() =>
      db.from('battle_results').select('battle_id, player_hash').in('battle_id', slice),
    );
    for (const r of rows) {
      const s = played.get(r.battle_id) ?? new Set<string>();
      s.add(r.player_hash);
      played.set(r.battle_id, s);
    }
  }

  let open = 0;
  for (const b of battles) {
    const players = played.get(b.id);
    // Open while nobody but the challenger has recorded a run against it.
    if (!players || [...players].every((h) => h === b.challenger_hash)) open += 1;
  }
  return open;
}
