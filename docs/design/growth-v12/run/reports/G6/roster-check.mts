// G6: every member list of lib/name-all/spellings.ts against the database.
// READ ONLY: two selects with the anon key (the key the page itself reads with),
// nothing else. Prints no key and no URL.
//
//   cd apps/quiz && node --env-file=.env.local --import tsx \
//     ../../docs/design/growth-v12/run/reports/G6/roster-check.mts
//
// The SQL it stands for (PostgREST selects, written out):
//   select id, slug, name from groups;
//   select group_id, name, name_romanized, name_hangul, active, detached_at, ord from idols order by group_id, ord, id;
//
// Exit code 1 when a list differs from the database.

import { createRequire } from 'node:module';

import { matchName } from '../../../../../../apps/quiz/src/lib/name-all/match';
import { buildRoster } from '../../../../../../apps/quiz/src/lib/name-all/roster';
import { NAME_ALL_GROUPS, NAME_ALL_SPELLINGS } from '../../../../../../apps/quiz/src/lib/name-all/spellings';

const require = createRequire(`${process.cwd()}/package.json`);
const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) { console.log('missing env'); process.exit(2); }
const db = createClient(url, anon, { auth: { persistSession: false } });

interface Idol { group_id: number; name: string; name_romanized: string | null; name_hangul: string | null; active: boolean; detached_at: string | null; ord: number }

const groups = (await db.from('groups').select('id, slug, name')).data as Array<{ id: number; slug: string; name: string }> | null;
const idols = (await db.from('idols').select('group_id, name, name_romanized, name_hangul, active, detached_at, ord').order('group_id').order('ord').order('id')).data as Idol[] | null;
if (!groups || !idols) { console.log('read failed'); process.exit(2); }

const bySlug = new Map(groups.map((g) => [g.slug, g]));
const activeOf = (groupId: number): Idol[] => idols.filter((i) => i.group_id === groupId && i.active && !i.detached_at);

let bad = 0;
let members = 0;
console.log(`checked on ${new Date().toISOString().slice(0, 10)}: ${groups.length} groups, ${idols.length} idols rows (${idols.filter((i) => i.active && !i.detached_at).length} active)`);
console.log('');
console.log('| group | database (active, in order) | table | same list | every spelling leads to its member | Hangul stored in the database accepted |');
console.log('|---|---|---|---|---|---|');
for (const slug of NAME_ALL_GROUPS) {
  const g = bySlug.get(slug);
  if (!g) { bad += 1; console.log(`| ${slug} | NOT IN groups | | NO | | |`); continue; }
  const rows = activeOf(g.id);
  const dbNames = rows.map((r) => r.name);
  const tableNames = Object.keys(NAME_ALL_SPELLINGS[slug]);
  const same = dbNames.length === tableNames.length && dbNames.every((n, i) => n === tableNames[i]);
  const roster = buildRoster(slug, rows);
  let spellingsOk = true;
  for (const m of roster) for (const s of [m.name, ...m.spellings]) if (matchName(s, roster)?.member.name !== m.name) spellingsOk = false;
  const hangulRows = rows.filter((r) => r.name_hangul && /^[가-힣\s]+$/.test(r.name_hangul.trim()));
  const hangulOk = hangulRows.every((r) => matchName(r.name_hangul as string, roster)?.member.name === r.name);
  if (!same || !spellingsOk || !hangulOk) bad += 1;
  members += dbNames.length;
  console.log(`| ${slug} | ${dbNames.length}: ${dbNames.join(', ')} | ${tableNames.length} | ${same ? 'yes' : `NO (table: ${tableNames.join(', ')})`} | ${spellingsOk ? 'yes' : 'NO'} | ${hangulRows.length} of ${rows.length} rows hold Hangul: ${hangulOk ? 'yes' : 'NO'} |`);
}
console.log('');
console.log(`${NAME_ALL_GROUPS.length} groups, ${members} members.`);

const listed = new Set<string>(NAME_ALL_GROUPS);
console.log('');
console.log('Groups with active members in the database and NO page:');
let others = 0;
for (const g of groups) {
  if (listed.has(g.slug)) continue;
  const rows = activeOf(g.id);
  if (rows.length === 0) continue;
  others += 1;
  console.log(`- ${g.slug} (${rows.length} active): ${rows.map((r) => r.name).join(', ')}`);
}
if (others === 0) console.log('- none');

// Inactive rows (members waiting for a review) are hidden from the anon key by RLS,
// so they are not listed here: the page cannot read them either.
console.log('');
console.log(bad === 0 ? 'RESULT: every list equals the database.' : `RESULT: ${bad} list(s) differ.`);
process.exit(bad === 0 ? 0 : 1);
