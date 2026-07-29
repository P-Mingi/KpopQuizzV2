// DEV-ONLY: seed a full-rights local test account for the owner.
// Creates (or reuses) a Supabase auth user for DEV_LOGIN_EMAIL with a confirmed,
// non-deliverable address and a profiles row, then prints its user id. It does NOT
// grant admin: admin is env-driven (ADMIN_USER_IDS), added to .env.local only, so the
// account is never admin in production. No secrets are embedded here (email from env).
//
// Run: node apps/quiz/scripts/dev-seed-account.mjs   (refuses under NODE_ENV=production)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run with NODE_ENV=production. This is a dev-only seed.');
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const email = env.DEV_LOGIN_EMAIL;
if (!email) { console.error('Set DEV_LOGIN_EMAIL in apps/quiz/.env.local first.'); process.exit(1); }

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
    console.log('Reusing existing dev user.');
  } else { console.error('createUser failed:', error.message); process.exit(1); }
} else {
  userId = created.user.id;
  console.log('Created dev auth user.');
}

const { error: pErr } = await db.from('profiles').upsert(
  { id: userId, username: 'localdev', display_name: 'Local Dev (Owner)', bio: 'Local-only test account.' },
  { onConflict: 'id' },
);
if (pErr) { console.error('profile upsert failed:', pErr.message); process.exit(1); }

console.log('\nDev account ready.');
console.log('USER_ID=' + userId);
console.log('EMAIL=' + email);
console.log('\nNext: append this USER_ID to ADMIN_USER_IDS in apps/quiz/.env.local (local only), then sign in at /api/dev/login.');
