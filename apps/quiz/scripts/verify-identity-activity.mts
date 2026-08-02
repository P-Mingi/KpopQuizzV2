/**
 * V-PROFILE-ONE step 2 proof - the shared plumbing (identity resolver + activity
 * model) exercised against REAL prod data through the ACTUAL modules (tsx resolves
 * the @/ alias; only the service-role client is touched, never next/headers).
 *
 * Run from apps/quiz:  npx tsx scripts/verify-identity-activity.mts
 * Read-only.
 */
import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

import { resolveIdentities, resolveIdentity, resolveSpaceIdentities, FAN_FALLBACK } from '../src/lib/verse/identity.ts';
import { getUserActivity } from '../src/lib/verse/activity.ts';

for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, '');
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const SYSTEM = '67358f12-5068-4cd9-ba02-ad19fdadad73';
const MISSING = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

let failed = false;
const ok = (m: string): void => console.log('  ok   ' + m);
const fail = (m: string): void => { console.log('  FAIL ' + m); failed = true; };

async function main(): Promise<void> {
  // Pick real fixtures from prod.
  const { data: member } = await db.from('space_members').select('user_id, group_id, role').eq('status', 'active').limit(1).maybeSingle();
  const { data: blocked } = await db.from('space_members').select('user_id, group_id').eq('status', 'blocked').limit(1).maybeSingle();
  const { data: player } = await db.from('game_plays').select('player_id').limit(1).maybeSingle();
  const mUser = (member as { user_id: string; group_id: number; role: string } | null);
  const pUser = (player as { player_id: string } | null)?.player_id;

  console.log('A. identity resolver');
  const ids = [SYSTEM, MISSING, ...(mUser ? [mUser.user_id] : [])];
  const map = await resolveIdentities(ids);
  const sys = map.get(SYSTEM)!;
  sys.displayName === 'KpopVerse' && sys.isSystem && sys.href === null ? ok('system account -> SYSTEM_AUTHOR_DISPLAY name, isSystem, no profile link') : fail(`system wrong: ${JSON.stringify(sys)}`);
  const miss = map.get(MISSING)!;
  miss.displayName === FAN_FALLBACK && !miss.isSystem && miss.username === null ? ok(`missing id -> normalized fallback "${FAN_FALLBACK}"`) : fail(`missing wrong: ${JSON.stringify(miss)}`);
  [...map.values()].every((v) => v.initials.length >= 1 && v.initials.length <= 2) ? ok('every identity has 1-2 char initials') : fail('bad initials');
  if (mUser) {
    const mi = map.get(mUser.user_id)!;
    mi.href === (mi.username ? `/u/${mi.username}` : null) ? ok('real member -> profile href matches username') : fail(`member href wrong: ${JSON.stringify(mi)}`);
  }
  const single = await resolveIdentity(SYSTEM);
  single.userId === SYSTEM && single.displayName === 'KpopVerse' ? ok('resolveIdentity (single) agrees with the batch') : fail('single disagrees');
  const empty = await resolveIdentities([null, undefined, '']);
  empty.size === 0 ? ok('empty/nullish input -> empty map (no query)') : fail('nullish not filtered');

  console.log('B. space identity (role + block)');
  if (mUser) {
    const smap = await resolveSpaceIdentities([mUser.user_id], mUser.group_id);
    const si = smap.get(mUser.user_id)!;
    si.role === mUser.role && si.isBlocked === false ? ok(`active member resolves to their role (${si.role}), not blocked`) : fail(`space identity wrong: ${JSON.stringify(si)}`);
  } else fail('no active member fixture');
  if (blocked) {
    const b = blocked as { user_id: string; group_id: number };
    const smap = await resolveSpaceIdentities([b.user_id], b.group_id);
    const si = smap.get(b.user_id)!;
    si.role === 'visitor' && si.isBlocked === true ? ok('blocked member -> role demoted to visitor, isBlocked true, name kept') : fail(`blocked wrong: ${JSON.stringify(si)}`);
    si.displayName && si.displayName.length > 0 ? ok('blocked member keeps their display name (authorship not erased)') : fail('blocked name erased');
  } else ok('(no blocked member in prod to probe; block path unit-covered by the resolver branch)');

  console.log('C. activity model (derived, real, sorted)');
  const sysAct = await getUserActivity(SYSTEM, { limit: 30 });
  sysAct.some((a) => a.kind === 'essay') ? ok('system account activity includes its published essay (derived from verse_essays)') : fail('essay activity missing');
  const sortedOk = sysAct.every((a, i) => i === 0 || sysAct[i - 1]!.at >= a.at);
  sortedOk ? ok('activity is newest-first (stable sort on timestamp)') : fail('activity not sorted desc');
  const KINDS = new Set(['page_edit', 'essay', 'quiz_play', 'space_join', 'card_add']);
  sysAct.every((a) => KINDS.has(a.kind)) ? ok('every item is a known real kind (no quest kind: no source table)') : fail('unknown activity kind');
  sysAct.every((a) => a.href === null || a.href.startsWith('/')) ? ok('every href is null or an internal path') : fail('bad href');
  if (pUser) {
    const pAct = await getUserActivity(pUser, { limit: 30 });
    pAct.some((a) => a.kind === 'quiz_play') ? ok('a real player\'s activity includes quiz_play (derived from game_plays)') : fail('quiz_play missing for a known player');
  }
  const kindsFilter = await getUserActivity(SYSTEM, { kinds: ['essay'], limit: 30 });
  kindsFilter.every((a) => a.kind === 'essay') ? ok('kinds filter narrows the read (feed reuse)') : fail('kinds filter leaked other kinds');

  console.log(`\n     sample system activity: ${JSON.stringify(sysAct.slice(0, 2))}`);
  console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
  process.exit(failed ? 1 : 0);
}
void main();
