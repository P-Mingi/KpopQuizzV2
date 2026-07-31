// DEV-ONLY: seed the SECOND local test account (V-ROLES step 1): a CONTRIBUTOR
// on the founding spaces with real XP above the real threshold, for two-account
// journey testing. Mirrors dev-seed-account.mjs exactly: refuses in production,
// RFC-2606 non-deliverable email from env, no admin rights ever (contributor is
// a per-space row, not an env grant). Sign in via /api/dev/login?as=contributor.
//
// Run: node apps/quiz/scripts/dev-seed-contributor.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run with NODE_ENV=production. This is a dev-only seed.');
  process.exit(1);
}

const envPath = new URL('../.env.local', import.meta.url);
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const email = env.DEV_LOGIN_CONTRIBUTOR_EMAIL;
if (!email) {
  console.error('Set DEV_LOGIN_CONTRIBUTOR_EMAIL in apps/quiz/.env.local first (RFC-2606, e.g. verse-contributor@example.com).');
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let userId;
const { data: created, error } = await db.auth.admin.createUser({
  email, email_confirm: true, user_metadata: { dev_local_test_account: true },
});
if (error) {
  if (/already been registered|already exists/i.test(error.message)) {
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    userId = list.users.find((u) => u.email === email)?.id;
    if (!userId) { console.error('User exists but could not be found in list.'); process.exit(1); }
    console.log('Reusing existing contributor dev user.');
  } else { console.error('createUser failed:', error.message); process.exit(1); }
} else {
  userId = created.user.id;
  console.log('Created contributor dev auth user.');
}

const { error: pErr } = await db.from('profiles').upsert(
  { id: userId, username: 'testfan', display_name: 'Test Fan', bio: 'Local-only test account (contributor).' },
  { onConflict: 'id' },
);
if (pErr) { console.error('profile upsert failed:', pErr.message); process.exit(1); }

// Contributor on the founding spaces with REAL XP above the REAL threshold
// (contributor promotion is 100; 120 = tier Regular, honestly earned-looking
// numbers for the affordance/progression screenshots).
for (const slug of ['bts', 'blackpink', 'stray-kids']) {
  const { data: g } = await db.from('groups').select('id').eq('slug', slug).single();
  if (!g) { console.log(`${slug}: group missing, skipped`); continue; }
  const { data: existing } = await db.from('space_members').select('id, role').eq('group_id', g.id).eq('user_id', userId).maybeSingle();
  if (existing) { console.log(`${slug}: membership exists (${existing.role}), left untouched`); continue; }
  const { error: mErr } = await db.from('space_members').insert({
    group_id: g.id, user_id: userId, role: 'contributor', status: 'active',
    contrib_xp: 120, contrib_streak: 1, last_contrib_date: new Date().toISOString().slice(0, 10),
  });
  console.log(`${slug}: ${mErr ? 'ERR ' + mErr.message : 'contributor seeded (120 XP)'}`);
}

console.log('\nContributor account ready.');
console.log('USER_ID=' + userId);
console.log('EMAIL=' + email);
console.log('Sign in: /api/dev/login?as=contributor (dev only; 404 in prod).');
