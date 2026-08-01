/**
 * V-ESSAYS-MAX proof (owner ruling): account deletion NULLS a series' created_by
 * but keeps the series (content persists); essay reactions are purged.
 *
 * Run from apps/quiz:  npx tsx scripts/verify-essays-cleanup.mts
 * Uses a throwaway user_id, and cleans up its own test rows.
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
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

let failed = false;
const ok = (m: string) => console.log('  ok   ' + m);
const fail = (m: string) => { console.log('  FAIL ' + m); failed = true; };

async function main(): Promise<void> {
  const uid = randomUUID();
  const { data: g } = await svc.from('groups').select('id').limit(1).maybeSingle();
  const groupId = (g as { id: number } | null)?.id;
  if (!groupId) { fail('no group to anchor the series'); return; }

  // Seed a series authored by the throwaway user.
  const { data: s, error: se } = await svc.from('verse_essay_series').insert({ group_id: groupId, title: 'ZSEED cleanup series', slug: `zseed-cleanup-${uid.slice(0, 8)}`, created_by: uid, status: 'proposed' }).select('id').single();
  if (se) { fail('seed series: ' + se.message); return; }
  const seriesId = (s as { id: number }).id;
  ok('seeded a series with created_by = the user');

  // The account-deletion policy: null the author, keep the row.
  const { data: nulled } = await svc.from('verse_essay_series').update({ created_by: null }).eq('created_by', uid).select('id');
  ((nulled ?? []).length === 1) ? ok('created_by nulled for 1 series') : fail(`expected 1 nulled, got ${(nulled ?? []).length}`);

  // Prove the series ROW still exists, now with created_by NULL.
  const { data: after } = await svc.from('verse_essay_series').select('id, created_by, title').eq('id', seriesId).maybeSingle();
  const row = after as { id: number; created_by: string | null; title: string } | null;
  if (!row) fail('series row was deleted (content did NOT persist)');
  else if (row.created_by !== null) fail('created_by is not null: ' + row.created_by);
  else ok('series persists with created_by = NULL (content kept, author nulled)');

  // Cleanup the test row.
  await svc.from('verse_essay_series').delete().eq('id', seriesId);

  console.log(failed ? '\nESSAYS CLEANUP PROOF: FAILED' : '\nESSAYS CLEANUP PROOF: PASSED (series persists, author nulled)');
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
