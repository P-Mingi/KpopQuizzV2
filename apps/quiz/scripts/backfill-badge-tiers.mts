// V-UPGRADE-1 Phase A - backfill earned badge tiers for existing users, honestly.
// Runs the SAME award engine used in real time (src/lib/badges/award.ts) against
// every profile, so a user with 60 perfect scores gets the 50 tier, etc. Idempotent
// (upsert ignoreDuplicates), so it is safe to re-run. RUN AFTER migration 145.
//
//   pnpm -C apps/quiz exec tsx scripts/backfill-badge-tiers.mts [--dry]
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { checkTierBadges, computeMetrics } from '../src/lib/badges/award';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const dry = process.argv.includes('--dry');

// Guard: definitions must be seeded first (migration 145) for actual grants.
// A --dry run only computes metrics (read-only), so it can run before the migration.
if (!dry) {
  const { count: defCount } = await db.from('badge_definitions').select('id', { count: 'exact', head: true }).like('id', 'marathoner_%');
  if (!defCount) {
    console.error('ABORT: badge_definitions has no marathoner_* rows. Run migration 145 first.');
    process.exit(1);
  }
}

const { data: profiles } = await db.from('profiles').select('id, username').order('created_at');
const rows = (profiles ?? []) as { id: string; username: string | null }[];
console.log(`backfilling ${rows.length} profiles${dry ? ' (DRY RUN - no writes)' : ''}...`);

let totalGranted = 0;
for (const prof of rows) {
  if (dry) {
    const m = await computeMetrics(db, prof.id);
    const nonzero = Object.entries(m).filter(([, v]) => v > 0);
    if (nonzero.length) console.log(`  ${prof.username ?? prof.id}: ${nonzero.map(([k, v]) => `${k}=${v}`).join(', ')}`);
  } else {
    const fresh = await checkTierBadges(db, prof.id);
    if (fresh.length) { totalGranted += fresh.length; console.log(`  ${prof.username ?? prof.id}: +${fresh.length} [${fresh.join(', ')}]`); }
  }
}
console.log(dry ? 'dry run complete.' : `backfill complete: ${totalGranted} tier grants across ${rows.length} users.`);
