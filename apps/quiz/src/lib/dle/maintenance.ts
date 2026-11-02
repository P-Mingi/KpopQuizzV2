// Daily games: the nightly step of 019 (dle_daily_maintenance), run by the hub's cron ensure-daily-quiz after the quiz of the
// day. Snapshot of the pools, rebuild when the targets changed, today's row, purge of the rate limit and the old salts. It is
// idempotent and returns counts only, never a target. Server code only (service role client): 019 grants it to service_role.
//
// It never throws and never changes the cron's answer: the games write today's row themselves on the first play, so a failure
// here costs a log line, not a game, and never the quiz of the day. A game that fails is named in the function's result (CR-019):
// the other games still ran, and it gets its own error line.

import { SITE } from '@/lib/site/registry';

import type { SupabaseClient } from '@supabase/supabase-js';

const LOG = '[ensure-daily-quiz] dle_daily_maintenance';

/** One game of the function's result: its counts, or its error when that game alone failed. */
interface GameResult { game?: string; error?: string; code?: string }

/**
 * True only when the function itself does not exist yet (019 not applied): PostgREST's PGRST202, or a 42883 that names it. A
 * 42883 naming another function, or a missing table, comes from inside an applied function: that is a real failure.
 */
function isNotApplied(error: { code?: string; message?: string }): boolean {
  if (error.code === 'PGRST202') return true;
  return error.code === '42883' && (error.message ?? '').includes('dle_daily_maintenance');
}

/** The hub only: the three projects share vercel.json, so ensure-daily-quiz fires on all of them, and one run is enough. */
export async function runDleMaintenance(db: SupabaseClient, now: Date = new Date()): Promise<void> {
  if (SITE.id !== 'hub') return;
  try {
    const { data, error } = await db.rpc('dle_daily_maintenance', { p_now: now.toISOString() });
    if (!error) {
      const games: GameResult[] = Array.isArray(data) ? data : [];
      const failed = games.filter((g) => g.error);
      for (const g of failed) console.error(`${LOG} failed for game ${g.game}: ${g.code ?? 'no code'} ${g.error}`);
      if (failed.length === 0 || failed.length < games.length) console.log(`${LOG}: ${JSON.stringify(games.filter((g) => !g.error))}`);
    } else if (isNotApplied(error)) {
      console.log(`${LOG}: not applied on this database yet, expected before 019`);
    } else {
      console.error(`${LOG} failed: ${error.code ?? 'no code'} ${error.message}`);
    }
  } catch (err) {
    console.error(`${LOG} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
