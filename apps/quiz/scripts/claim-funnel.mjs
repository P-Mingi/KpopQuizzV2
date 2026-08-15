// W3b PART 1 - the claim funnel, read from the DATABASE (read-only).
//
//   node apps/quiz/scripts/claim-funnel.mjs
//
// Analytics can see impressions and taps; only the database can see what actually
// MOVED. This reports both halves of the ownership question so the two can be
// compared after a deploy.
//
// DEFINITIONS, stated so they can be re-derived independently:
//   stamped   = rows carrying a browser id            (anon_id IS NOT NULL)
//   claimed   = stamped rows that now have an owner   (anon_id IS NOT NULL AND owner IS NOT NULL)
//   unclaimed = stamped rows still ownerless          (anon_id IS NOT NULL AND owner IS NULL)
//   unstampable = pre-155 rows with no browser id and no owner. These can NEVER be
//                 claimed by anyone, by any means, and are reported separately so
//                 they are never mistaken for an opportunity.
// owner is plays.player_id / battle_results.user_id.
//
// COVENANT: counts only. Nothing here writes, invents, rounds or floors.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const count = async (table, build) => {
  let q = db.from(table).select('*', { count: 'exact', head: true });
  if (build) q = build(q);
  const { count: n, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
};

const pct = (a, b) => (b === 0 ? 'n/a' : `${((a / b) * 100).toFixed(1)}%`);

console.log('# CLAIM FUNNEL (database side)');
console.log(`# ${new Date().toISOString()}`);
console.log('');

for (const [table, ownerCol] of [['plays', 'player_id'], ['battle_results', 'user_id']]) {
  const total = await count(table);
  const stamped = await count(table, (q) => q.not('anon_id', 'is', null));
  const claimed = await count(table, (q) => q.not('anon_id', 'is', null).not(ownerCol, 'is', null));
  const unclaimed = await count(table, (q) => q.not('anon_id', 'is', null).is(ownerCol, null));
  const unstampable = await count(table, (q) => q.is('anon_id', null).is(ownerCol, null));

  console.log(`## ${table}`);
  console.log(`  total rows                 : ${total}`);
  console.log(`  stamped (has browser id)   : ${stamped}`);
  console.log(`    of those, claimed        : ${claimed}  (${pct(claimed, stamped)} of stamped)`);
  console.log(`    of those, still ownerless: ${unclaimed}`);
  console.log(`  UNSTAMPABLE (pre-155)      : ${unstampable}  <- can never be claimed, by anyone`);
  console.log('');
}

console.log('Read this next to the analytics funnel (event claim_funnel: shown ->');
console.log('started -> completed | refused). Analytics sees intent; this sees effect.');
