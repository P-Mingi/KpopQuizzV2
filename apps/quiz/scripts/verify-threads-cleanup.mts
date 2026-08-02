/**
 * V-COMM-3 proof (mirrors the essay-series policy): account deletion NULLS a
 * thread's created_by but keeps the thread (community content persists).
 * Exercises the shipped cleanupUserThreadsData() function.
 *
 * Run from apps/quiz:  npx tsx scripts/verify-threads-cleanup.mts
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

const { cleanupUserThreadsData } = await import('@/lib/verse/account-cleanup');

let failed = false;
const ok = (m: string) => console.log('  ok   ' + m);
const fail = (m: string) => { console.log('  FAIL ' + m); failed = true; };

const uid = randomUUID();
const { data: g } = await svc.from('groups').select('id').limit(1).maybeSingle();
const groupId = (g as { id: number } | null)?.id;
if (!groupId) { fail('no group to anchor the thread'); process.exit(1); }

const slug = `zseed-cleanup-${uid.slice(0, 8)}`;
const { data: s, error: se } = await svc.from('verse_threads').insert({ group_id: groupId, slug, title: 'ZSEED cleanup thread', created_by: uid, entity_type: 'group', entity_id: String(groupId), status: 'visible' }).select('id').single();
if (se) { fail('seed thread: ' + se.message); process.exit(1); }
const threadId = (s as { id: number }).id;
ok('seeded a thread with created_by = the user');

// Run the SHIPPED cleanup function (the account-deletion path).
const res = await cleanupUserThreadsData(uid);
(res.threadsNulled === 1) ? ok('cleanupUserThreadsData nulled 1 thread') : fail(`expected 1 nulled, got ${res.threadsNulled}`);

// Prove the thread ROW still exists, now with created_by NULL.
const { data: after } = await svc.from('verse_threads').select('id, created_by, title').eq('id', threadId).maybeSingle();
const row = after as { id: number; created_by: string | null; title: string } | null;
if (!row) fail('thread row was deleted (content did NOT persist)');
else if (row.created_by !== null) fail('created_by is not null: ' + row.created_by);
else ok('thread persists with created_by = NULL (content kept, author nulled)');

// Cleanup the test row.
await svc.from('verse_threads').delete().eq('id', threadId);

console.log(failed ? '\nTHREADS CLEANUP PROOF: FAILED' : '\nTHREADS CLEANUP PROOF: PASSED (thread persists, author nulled)');
process.exit(failed ? 1 : 0);
