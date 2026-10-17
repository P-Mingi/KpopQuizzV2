// Run O1, owner gate G2: fixture users and the 31 editorial accounts on ONE dev branch (o1-scratch or o1-dev).
// Run by the owner through scripts/o1/fixtures.sh (both branches), never by an agent (rule 7).
//   scripts/o1/env.sh scratch|dev -- node_modules/.bin/tsx apps/quiz/scripts/o1/fixtures/run.mts [--dry-run]
// Refuses unless the environment is a dev branch: O1_ENV is scratch or dev, the URL and the service role key name
// O1_BRANCH_REF, and nothing names the production project. Creates auth users with the admin API, email_confirm
// true (no email is sent, no password is set), then their profiles rows. Idempotent: an existing fixture is reused.
// Emails are under example.com (reserved, never deliverable). Writes docs/o1/fixtures-<branch>.json (ids,
// usernames, emails: the cleanup list of the definition of done). Prints no key, no URL.
// Not done here, on purpose: editorial_accounts rows, world_memberships and sites.system_user_id need the site_id
// columns of B2 and the tables of B3; their SQL lanes add those rows on the branches later.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const PROD_REF = 'rdkgouofytwfdpbxbzio';
const dry = process.argv.includes('--dry-run');
const env = process.env;
const branch = env.O1_ENV;
const ref = env.O1_BRANCH_REF ?? '';
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
function refuse(why: string): never { console.error(`fixtures: refused: ${why}`); process.exit(5); }
if (branch !== 'scratch' && branch !== 'dev') refuse('run through scripts/o1/env.sh scratch|dev');
if (!/^[a-z0-9]{20}$/.test(ref) || ref === PROD_REF) refuse('O1_BRANCH_REF is missing or names production');
if (!url.includes(ref) || url.includes(PROD_REF)) refuse('the URL is not the branch');
let claims: { role?: string; ref?: string } = {};
try { claims = JSON.parse(Buffer.from(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { refuse('the service role key is not a JWT'); }
if (claims.role !== 'service_role' || claims.ref !== ref) refuse('the service role key is not the branch service role');

const emailOf = (f: { key: string }) => `o1-fixture-${f.key.replace(/_/g, '-')}@example.com`;
type Fixture = { key: string; username: string; display: string; kind: 'user' | 'editorial' | 'system'; confirmed: boolean;
  profile: Record<string, unknown>; note: string };
const F = (key: string, display: string, note: string, profile: Record<string, unknown> = {}, confirmed = true): Fixture =>
  ({ key, username: `o1_${key}`, display, kind: 'user', confirmed, profile, note });
const fixtures: Fixture[] = [
  F('kpop_only', 'Fixture Kpop Only', 'kpopquiz.org only; memberships from B3 SQL'),
  F('kpop_heavy', 'Fixture Kpop Heavy', 'bias, bio, header slot, high XP; groups once the branch has group rows',
    { bio: 'Fixture account of run O1.', bias: 'Fixture bias', xp: 12000, stan_since: 2019 }),
  F('dual', 'Fixture Dual Member', 'kpop and anime member (anime membership from B3 SQL)'),
  F('anime_new', 'Fixture Anime New', 'anime only, new (anime membership from B3 SQL)'),
  F('banned', 'Fixture Banned', 'banned_at set', { banned_at: new Date('2026-10-01T00:00:00Z').toISOString() }),
  F('unconfirmed', 'Fixture Unconfirmed', 'email not confirmed, no profile (as a real unconfirmed sign-up)', {}, false),
  F('admin_reviewer', 'Fixture Admin Reviewer', 'admin through ADMIN_USER_IDS of the dev servers (env.sh adds it)'),
];
for (let i = 1; i <= 30; i++) {
  const n = String(i).padStart(2, '0');
  fixtures.push({ key: `creator_${n}`, username: `oq_creator_${n}`, display: `OtakuQuiz Creator ${n}`, kind: 'editorial',
    confirmed: true, profile: { bio: 'Editorial account of OtakuQuiz (placeholder until K2 personas).' },
    note: 'Team creator placeholder; K2 writes the persona, B2 and B3 SQL add editorial_accounts and the membership' });
}
fixtures.push({ key: 'otakuquiz_team', username: 'otakuquiz_team', display: 'OtakuQuiz Team', kind: 'system', confirmed: true,
  profile: { bio: 'Editorial account of OtakuQuiz.' }, note: 'system account: daily quiz and Anime Mix (sites.system_user_id via B5 SQL)' });

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
// Existing fixtures, read with psql (read only) instead of the admin listUsers API: on both branches, three users
// created directly in auth.users on 2026-10-17 carry NULL token columns, and GoTrue's listUsers then fails with
// "Database error finding users". Only the fixture emails are read.
const existing = new Map<string, string>();
{
  const dbUrl = env.O1_DB_URL ?? '';
  if (!dbUrl.includes(ref) || dbUrl.includes(PROD_REF)) refuse('the database URL is not the branch');
  const emails = fixtures.map((f) => `'${emailOf(f)}'`).join(',');
  const sql = `SET default_transaction_read_only = on; SELECT lower(email) || '|' || id FROM auth.users WHERE lower(email) IN (${emails});`;
  let rows = '';
  try { rows = execFileSync('/opt/homebrew/opt/postgresql@18/bin/psql', [dbUrl, '-X', '-q', '-At', '-c', sql], { encoding: 'utf8' }); }
  catch { refuse('reading the existing fixtures with psql failed'); }
  for (const line of rows.split('\n')) { const [e, id] = line.trim().split('|'); if (e && id) existing.set(e, id); }
}
const out: Array<Record<string, unknown>> = [];
let created = 0, reused = 0, profiles = 0;
for (const f of fixtures) {
  const email = emailOf(f);
  let id = existing.get(email);
  if (id) reused++;
  else if (dry) { console.log(`would create ${f.username} (${f.kind})`); }
  else {
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: f.confirmed,
      user_metadata: { preferred_username: f.username, name: f.display, o1_fixture: true, o1_kind: f.kind } });
    if (error || !data.user) { console.error(`fixtures: createUser ${f.username} failed: ${error?.message}`); process.exit(1); }
    id = data.user.id; created++;
  }
  if (id && f.confirmed && !dry) {
    const row = { id, username: f.username, display_name: f.display, ...f.profile };
    const { error } = await db.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) { console.error(`fixtures: profile ${f.username} failed: ${error.message}`); process.exit(1); }
    profiles++;
  }
  out.push({ key: f.key, kind: f.kind, username: f.username, email, id: id ?? null, confirmed: f.confirmed, note: f.note });
}
const file = path.resolve(path.dirname(new URL(import.meta.url).pathname), `../../../../../docs/o1/fixtures-${branch}.json`);
if (!dry) fs.writeFileSync(file, JSON.stringify({ branch: `o1-${branch}`, users: out }, null, 2) + '\n');
console.log(`fixtures o1-${branch}: ${fixtures.length} accounts, ${created} created, ${reused} already there, ${profiles} profiles written${dry ? ' (dry run, nothing written)' : `, list in docs/o1/fixtures-${branch}.json`}`);
