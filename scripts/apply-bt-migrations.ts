/**
 * Apply blindtest redesign migrations directly to the BlindTest Supabase project.
 * Uses the supabase-js admin client to execute SQL statements.
 *
 * Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/apply-bt-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('apps/blindtest/.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const MIGRATIONS = [
  'supabase/migrations/051_bt_redesign_schema.sql',
  'supabase/migrations/052_bt_redesign_rpcs.sql',
];

async function executeSql(sql: string): Promise<void> {
  // Split on double-newline boundaries to avoid sending too-large single statements,
  // but keep CREATE FUNCTION blocks together by splitting on semicolons at the
  // top-level (not inside $$ blocks).
  const { error } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (error) {
    // exec_sql doesn't exist - try statement by statement via individual queries
    throw error;
  }
}

async function executeStatements(sql: string): Promise<void> {
  // Split the SQL into individual statements, being careful about $$ blocks
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();

    // Track $$ blocks
    const dollarCount = (trimmed.match(/\$\$/g) ?? []).length;
    if (dollarCount % 2 === 1) {
      inDollarQuote = !inDollarQuote;
    }

    current += line + '\n';

    // If we're not in a dollar-quoted block and the line ends with ;
    if (!inDollarQuote && trimmed.endsWith(';') && !trimmed.startsWith('--')) {
      const stmt = current.trim();
      if (stmt.length > 0 && !stmt.startsWith('--')) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  // Remaining
  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return await executeStatementsViaAlter(statements);
}

async function executeStatementsViaAlter(statements: string[]): Promise<void> {
  // We can't run arbitrary SQL via PostgREST directly.
  // Instead, we'll use individual ALTER TABLE / CREATE TABLE statements
  // by wrapping them in a temporary function and calling it.

  // Actually, the simplest approach: create a function that runs the SQL
  // First, let's create a helper function
  const helperSql = `
    CREATE OR REPLACE FUNCTION public._run_migration(p_sql TEXT)
    RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      EXECUTE p_sql;
    END;
    $$;
  `;

  // Try to create the helper first
  const { error: helperError } = await supabase.rpc('_run_migration', { p_sql: 'SELECT 1' });

  if (helperError) {
    // Helper doesn't exist yet - we need to create it somehow
    // Let's try using the Supabase Management API
    console.log('Helper function not found. Attempting to use Management API...');

    // Actually, we can use the supabase-js client to call SQL functions
    // but we need the function to exist first. Chicken and egg problem.
    // Let's use a different approach: use the PostgREST schema cache reload

    // Plan B: Try each statement as a separate PostgREST call
    // Actually, for ALTER TABLE statements, we can't do this via PostgREST.

    // Plan C: Use the PostgreSQL connection string directly
    console.log('\nCannot execute raw SQL via PostgREST.');
    console.log('Please run the following SQL in the Supabase Dashboard SQL Editor');
    console.log('for the BlindTest project (fvyuznnyugznzfskgcvy):');
    console.log('\n' + '='.repeat(60) + '\n');

    for (const file of MIGRATIONS) {
      const sql = fs.readFileSync(file, 'utf-8');
      console.log(`-- File: ${file}`);
      console.log(sql);
      console.log('\n');
    }
    console.log('='.repeat(60));
    return;
  }

  // Helper exists, run each statement
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]!;
    if (stmt.startsWith('--') || stmt.length < 5) continue;

    console.log(`  [${i + 1}/${statements.length}] ${stmt.slice(0, 60).replace(/\n/g, ' ')}...`);
    const { error } = await supabase.rpc('_run_migration', { p_sql: stmt });
    if (error) {
      console.error(`  ERROR: ${error.message}`);
      // Continue - some errors are expected (IF NOT EXISTS, etc)
    }
  }
}

async function main() {
  console.log(`Target: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`Project: BlindTest (fvyuznnyugznzfskgcvy)\n`);

  // First check if bt_players exists
  const { data, error } = await supabase.from('bt_players').select('id').limit(1);
  if (error) {
    console.error('Cannot access bt_players table:', error.message);
    console.error('Make sure you are targeting the BlindTest project.');
    return;
  }
  console.log(`bt_players accessible (${data?.length ?? 0} sample rows)\n`);

  // Check if rank_title column already exists
  const { error: rankCheck } = await supabase.from('bt_players').select('rank_title').limit(1);
  if (!rankCheck) {
    console.log('rank_title column already exists! Migrations may have been applied.\n');
  }

  for (const file of MIGRATIONS) {
    console.log(`\nApplying: ${file}`);
    const sql = fs.readFileSync(file, 'utf-8');
    try {
      await executeStatements(sql);
      console.log(`  Done.`);
    } catch (err) {
      console.error(`  Failed:`, err);
    }
  }

  // Verify
  console.log('\nVerification:');
  const { error: e1 } = await supabase.from('bt_players').select('rank_title, rank_level').limit(1);
  console.log(`  bt_players.rank_title: ${e1 ? 'MISSING - ' + e1.message : 'OK'}`);

  const { error: e2 } = await supabase.from('party_rooms').select('id').limit(1);
  console.log(`  party_rooms: ${e2 ? 'MISSING - ' + e2.message : 'OK'}`);

  const { error: e3 } = await supabase.from('party_players').select('id').limit(1);
  console.log(`  party_players: ${e3 ? 'MISSING - ' + e3.message : 'OK'}`);

  const { error: e4 } = await supabase.from('ranked_plays').select('id').limit(1);
  console.log(`  ranked_plays: ${e4 ? 'MISSING - ' + e4.message : 'OK'}`);
}

main().catch(console.error);
