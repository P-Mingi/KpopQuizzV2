/**
 * DATA GUARD (UX v1 data-safety contract rule 8).
 *
 * Read-only. Prints one row per user-data table: exact row count + the newest
 * timestamp (max updated_at, falling back to created_at). The redesign is a new
 * skin over existing data, so between a "before" and an "after" run every count
 * may only GROW and no timestamp may go backwards. Paste both runs into the PR.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     pnpm --filter quiz data-guard            # markdown table
 *   ... pnpm --filter quiz data-guard --json   # machine-diffable JSON
 *
 * The service-role key is read from the env and used only to construct the
 * client; it is NEVER printed, logged, or written to a file. This script only
 * SELECTs counts and one timestamp per table - it never writes.
 */

import { createClient } from '@supabase/supabase-js';

// The user-data tables named in contract rule 8, mapped to their real names
// (the contract's "notifications" is the `creator_notifications` table). Counts
// here are the invariant the redesign must never shrink.
const TABLES: ReadonlyArray<string> = [
  'profiles',
  'quizzes',
  'plays',
  'quiz_comments',
  'quiz_reactions',
  'likes',
  'follows',
  'user_badges',
  'creator_notifications', // contract calls this "notifications"
  'notification_prefs',
  'daily_blindtest_scores',
  'daily_challenge_plays',
  'blind_test_plays',
  'activity_events',
  'debate_votes',
];

// Timestamp columns to probe, in order. Not every table has updated_at.
const TS_COLUMNS: ReadonlyArray<string> = ['updated_at', 'created_at'];

type Row = { table: string; rows: number | null; newest: string | null; tsColumn: string | null; error: string | null };

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Do not echo any value - only say which name is missing.
    const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !key && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean).join(', ');
    console.error(`data-guard: missing env (${missing}). Set them in the shell; they are never printed.`);
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const asJson = process.argv.includes('--json');
  const results: Row[] = [];

  for (const table of TABLES) {
    const row: Row = { table, rows: null, newest: null, tsColumn: null, error: null };

    // Exact count, no rows returned (head:true).
    const { count, error: countErr } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (countErr) {
      row.error = countErr.message;
      results.push(row);
      continue;
    }
    row.rows = count ?? 0;

    // Newest timestamp: try updated_at, then created_at. A table without either
    // reports null (its count is still the guarded invariant).
    for (const col of TS_COLUMNS) {
      const { data, error } = await supabase.from(table).select(col).order(col, { ascending: false }).limit(1);
      if (!error && data && data.length > 0) {
        row.newest = (data[0] as unknown as Record<string, unknown>)[col] as string | null;
        row.tsColumn = col;
        break;
      }
    }
    results.push(row);
  }

  if (asJson) {
    console.log(JSON.stringify({ takenAt: new Date().toISOString(), tables: results }, null, 2));
    return;
  }

  const takenAt = new Date().toISOString();
  console.log(`\nData guard - ${takenAt}\n`);
  console.log('| Table | Rows | Newest (col) |');
  console.log('|---|---:|---|');
  for (const r of results) {
    if (r.error) {
      console.log(`| ${r.table} | ERROR | ${r.error} |`);
    } else {
      const ts = r.newest ? `${r.newest} (${r.tsColumn})` : '-';
      console.log(`| ${r.table} | ${r.rows} | ${ts} |`);
    }
  }
  const errs = results.filter((r) => r.error);
  if (errs.length > 0) {
    console.log(`\n${errs.length} table(s) errored (name drift or permissions): ${errs.map((e) => e.table).join(', ')}`);
    process.exit(2);
  }
  console.log('\nRule 8: between a before/after pair, every Rows value may only grow and no Newest may move backwards.');
}

main().catch((err) => {
  // Never surface the connection string / key - only the message.
  console.error('data-guard failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
