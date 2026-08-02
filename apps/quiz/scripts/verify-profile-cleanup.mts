/**
 * V-PROFILE-ONE step 6 proof: account deletion purges profile_section_visibility.
 * profile_section_visibility (migration 143) keys on a bare user_id with NO FK
 * cascade from auth.users, so the manual delete-account flow MUST call
 * purgeUserProfileData. This proves it: seed a row, purge, confirm gone.
 *
 * Run from apps/quiz:  npx tsx scripts/verify-profile-cleanup.mts
 * Uses a throwaway user_id and cleans up after itself.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { purgeUserProfileData } from '../src/lib/verse/account-cleanup.ts';

for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, '');
}
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

let failed = false;
const ok = (m: string): void => console.log('  ok   ' + m);
const fail = (m: string): void => { console.log('  FAIL ' + m); failed = true; };

async function main(): Promise<void> {
  const uid = randomUUID();
  // Seed a couple of visibility rows for the throwaway user.
  const { error: se } = await svc.from('profile_section_visibility').insert([
    { user_id: uid, section: 'pages', is_public: true },
    { user_id: uid, section: 'activity', is_public: true },
  ]);
  if (se) { fail('seed: ' + se.message); console.log(failed ? '\nRESULT: FAIL' : ''); process.exit(1); }
  const { count: before } = await svc.from('profile_section_visibility').select('*', { count: 'exact', head: true }).eq('user_id', uid);
  before === 2 ? ok('seeded 2 visibility rows for a throwaway user') : fail(`expected 2 seeded, got ${before}`);

  // Run the account-deletion purge (the actual production function).
  const res = await purgeUserProfileData(uid);
  res.ok ? ok('purgeUserProfileData ran without error') : fail('purge error: ' + res.error);

  // Confirm every row is gone.
  const { count: after } = await svc.from('profile_section_visibility').select('*', { count: 'exact', head: true }).eq('user_id', uid);
  after === 0 ? ok('0 rows remain after purge (account deletion leaves nothing behind)') : fail(`expected 0 after purge, got ${after}`);

  console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
  process.exit(failed ? 1 : 0);
}
void main();
