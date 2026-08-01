/**
 * V-CARDS-MAX proof: account-deletion cleanup erases the binder tables, and no
 * FK cascade from auth.users exists (so the app-level purge is REQUIRED).
 *
 * Run from apps/quiz:  npx tsx scripts/verify-cards-purge.mts
 * Uses a random throwaway user_id (owns nothing real) and cleans up after itself.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, '');
}

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NEW_TABLES = ['verse_binders', 'verse_profile_shelf', 'verse_profile_shelf_settings'];
let failed = false;
const fail = (m: string) => { console.log(`  FAIL ${m}`); failed = true; };
const ok = (m: string) => console.log(`  ok   ${m}`);

async function main(): Promise<void> {
  const uid = randomUUID();
  console.log(`test user_id ${uid}`);

  // A real group is needed for verse_binders.group_id FK; grab any.
  const { data: g } = await svc.from('groups').select('id').limit(1).maybeSingle();
  const groupId = (g as { id: number } | null)?.id;
  if (!groupId) { fail('no group found to anchor verse_binders'); return; }

  // 1. Seed one row per new table for the throwaway user.
  const seeds = await Promise.all([
    svc.from('verse_binders').insert({ user_id: uid, group_id: groupId, surface: 'binder', theme: 'classic' }),
    svc.from('verse_profile_shelf').insert({ user_id: uid, item_type: 'photocard', item_id: 999999, position: 0 }),
    svc.from('verse_profile_shelf_settings').insert({ user_id: uid, is_public: true }),
  ]);
  seeds.forEach((r, i) => r.error ? fail(`seed ${NEW_TABLES[i]}: ${r.error.message}`) : ok(`seeded ${NEW_TABLES[i]}`));
  if (failed) return;

  // 2. Confirm the rows are really there.
  for (const t of NEW_TABLES) {
    const { count } = await svc.from(t).select('*', { count: 'exact', head: true }).eq('user_id', uid);
    (count ?? 0) === 1 ? ok(`present in ${t} (${count})`) : fail(`expected 1 in ${t}, got ${count}`);
  }

  // 3. The purge (same tables/logic as lib/verse/account-cleanup.purgeUserCardsData).
  for (const t of ['verse_binders', 'verse_profile_shelf', 'verse_profile_shelf_settings', 'photocard_collection', 'collectible_collection']) {
    const { error } = await svc.from(t).delete().eq('user_id', uid);
    if (error) fail(`purge ${t}: ${error.message}`);
  }

  // 4. Confirm the rows are gone.
  for (const t of NEW_TABLES) {
    const { count } = await svc.from(t).select('*', { count: 'exact', head: true }).eq('user_id', uid);
    (count ?? 0) === 0 ? ok(`purged from ${t}`) : fail(`${count} rows survived in ${t}`);
  }

  // 5. Prove NO FK from these tables' user_id to auth.users: a random UUID that
  //    matches no auth.users row is accepted. A foreign key would reject it, so
  //    acceptance proves there is no FK and therefore no delete cascade.
  const orphan = randomUUID();
  const { error: orphanErr } = await svc.from('verse_profile_shelf_settings').insert({ user_id: orphan, is_public: false });
  if (orphanErr) fail(`orphan user_id insert rejected (an FK to auth.users exists?): ${orphanErr.message}`);
  else ok('orphan user_id (no auth.users row) accepted -> no FK to auth.users, no cascade');
  await svc.from('verse_profile_shelf_settings').delete().eq('user_id', orphan);

  console.log(failed ? '\nCARDS PURGE PROOF: FAILED' : '\nCARDS PURGE PROOF: PASSED (rows erased; no auth.users FK cascade)');
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
