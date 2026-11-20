// Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK: writes docs/pending-migrations/cards/119-photocheck.sql and its rollback from the plan of
// the photo check and the export of production it was made from (both under out/, git-ignored: they never enter the repository). No network,
// no database.
//   tsx scripts/cards/gen-photocheck-sql.mts [--plan out/launch-prep/pc/plan.json] [--export out/launch-prep/cards-live-2026-11-17.json]
// The plan holds one unit per subject (the photo rows, card rows, panorama rows and lock reasons it changes, with the values of the export);
// this script only shapes it and counts what the Verify lines expect once every unit is applied.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkPlan, dataOf, type Export } from '../../src/lib/cards/photocheck-data';
import { buildPhotocheck } from '../../src/lib/cards/photocheck-sql';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const OUT = path.join(REPO, 'docs/pending-migrations/cards');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name: string, def: string): string => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1]! : def; };
  const planFile = path.resolve(REPO, arg('--plan', 'out/launch-prep/pc/plan.json'));
  const exportFile = path.resolve(REPO, arg('--export', 'out/launch-prep/cards-live-2026-11-17.json'));
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  const exp = JSON.parse(readFileSync(exportFile, 'utf8'));
  console.log(`plan checked against planSubject: ${checkPlan(plan, exp)} subjects`);
  const data = dataOf(plan, exp as Export);
  const out = buildPhotocheck(data);
  writeFileSync(path.join(OUT, '119-photocheck.sql'), out.sql);
  writeFileSync(path.join(OUT, '119-photocheck.rollback.sql'), out.rollback);
  console.log(`wrote 119 (${out.units} subjects, ${out.sql.length} bytes; rollback ${out.rollback.length} bytes)`, JSON.stringify(data.expect));
}
