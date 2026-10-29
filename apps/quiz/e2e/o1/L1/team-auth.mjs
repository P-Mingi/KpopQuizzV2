// Run O1, lane L1: creates the 31 auth users the Team accounts of launch file L02 need. Owner-run, once, before L02.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref <ref> [--apply] [--team-email-domain bunnyverse.org]
//
// Without --apply nothing is sent: it prints how many users it would create. With --apply it calls the Auth admin API
// (createUser, email already confirmed, no password, no email sent). A user that exists is left alone, so a second run is a
// no-op. The URL must contain the project ref you pass, so a wrong shell variable cannot hit another project. The two values
// come from your own shell; this file never reads a secrets folder, and it prints counts only (no key, no address, no id).
// Why not SQL: a row inserted straight into auth.users with empty token columns breaks GoTrue's user listing (seen on the
// o1 branches), so the accounts are made by the API, then L02 gives them their profiles.

import { readDataDir, readExtras } from '../../../../../scripts/anime/k1/data-load.mjs';
import { DEFAULT_TEAM_DOMAIN, REPO, teamEmail } from './content-sql.mjs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const ref = val('--project-ref');
const domain = val('--team-email-domain', DEFAULT_TEAM_DOMAIN);
const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const fail = (m) => { console.error(`team-auth: ${m}`); process.exit(2); };

if (!ref || !/^[a-z0-9]{20}$/.test(ref)) fail('pass --project-ref <the 20 character ref of the production project>');
if (!url.includes(ref)) fail('SUPABASE_URL does not contain the project ref you passed');
if (!key) fail('SUPABASE_SERVICE_ROLE_KEY is not set in this shell');

const dataDir = resolve(REPO, val('--data', 'docs/anime/data'));
readDataDir(dataDir);
const creators = readExtras(dataDir).creators;
if (creators.length === 0) fail('no creators in the data folder');
const wanted = creators.map((c) => ({ username: c.username, email: teamEmail(c.username, domain) }));

if (!flag('--apply')) {
  console.log(`team-auth: dry run, would create up to ${wanted.length} users (existing ones are skipped). Add --apply to do it.`);
  process.exit(0);
}

const { createClient } = await import('@supabase/supabase-js');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let created = 0; let existed = 0; let failed = 0;
for (const w of wanted) {
  const { error } = await db.auth.admin.createUser({
    email: w.email, email_confirm: true,
    user_metadata: { preferred_username: w.username, o1_team: true },
  });
  if (!error) created += 1;
  else if (/already|exists|registered/i.test(`${error.code ?? ''} ${error.message ?? ''}`)) existed += 1;
  else { failed += 1; console.error(`team-auth: one user failed (${error.status ?? '?'} ${error.code ?? ''})`); }
}
console.log(`team-auth: ${created} created, ${existed} already there, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
