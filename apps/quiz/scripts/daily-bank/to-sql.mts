// Writes the SQL of a reviewed daily quiz lot (Mission U, owner 2026-10-15). The owner applies
// it himself, after his review. Nothing is written to the database here.
//
//   npx tsx scripts/daily-bank/to-sql.mts --lot 2 --reviewer Louis --reviewed 2026-11-05 <lot.json> [...]
//
// Output: docs/pending-migrations/daily-bank-<month of the first date>-lot<N>.sql (lot 1:
// daily-bank-2026-10-lot1.sql), and its rollback. Rows are inserted with status 'verified', their
// scheduled_date written in the SQL (so the publish date is the reviewed one), group_id resolved
// from the slug among the kpop groups only (null for a quiz about several groups), and
// verification_notes listing the sources and the review. Lot 1 also clears the date of the
// leftover rows dated 2029 and later, so the rotation pulls them before the lot's dated rows
// and the lot starts on its first date (see the PR for the rotation rule). The statements
// themselves are in src/lib/daily-bank/lot-sql.ts (kpop only, with a site check).

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { kpopGroups } from '../../src/lib/daily-bank/kpop-scope';
import { buildLotSql } from '../../src/lib/daily-bank/lot-sql';

import { loadLots, readClient } from './lib.mts';

const arg = (name: string): string | null => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] ?? null : null;
};

async function main(): Promise<void> {
  const lotN = arg('--lot');
  const reviewer = arg('--reviewer');
  const reviewed = arg('--reviewed');
  const files = process.argv.slice(2).filter((a) => a.endsWith('.json'));
  if (!lotN || files.length === 0) throw new Error('usage: to-sql.mts --lot N [--reviewer NAME --reviewed YYYY-MM-DD] <lot.json> [...]');

  const idOf = new Map((await kpopGroups(readClient())).map((g) => [g.slug, g.id]));
  const lot = loadLots(files);
  const out = buildLotSql(lotN, lot, idOf, reviewer, reviewed);

  const dir = resolve(new URL('.', import.meta.url).pathname, '../../../../docs/pending-migrations');
  writeFileSync(resolve(dir, out.name), out.sql);
  writeFileSync(resolve(dir, out.rollbackName), out.rollback);
  console.log(`wrote ${out.name} (${lot.length} rows) and ${out.rollbackName}`);
}

main().catch((e) => { console.error(e); process.exit(2); });
