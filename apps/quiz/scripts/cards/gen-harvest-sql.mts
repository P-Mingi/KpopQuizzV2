// Bunnyverse Cards lot 6: writes docs/pending-migrations/cards/116-photos-harvest.sql and its rollback from
// docs/design/cards/data/lot6/photos.json (verify-harvest.mts). No network, no database.
//   tsx scripts/cards/verify-harvest.mts --candidates <dir> --people <dir> && tsx scripts/cards/gen-harvest-sql.mts
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { HarvestPhotosFile } from '../../src/lib/cards/harvest-checks';
import { buildHarvest, harvestInputOf } from '../../src/lib/cards/harvest-sql';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');
export const LOT6_PHOTOS = path.join(REPO, 'docs/design/cards/data/lot6/photos.json');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = JSON.parse(readFileSync(LOT6_PHOTOS, 'utf8')) as HarvestPhotosFile;
  const input = harvestInputOf(file);
  const out = buildHarvest(input);
  writeFileSync(path.join(OUT, '116-photos-harvest.sql'), out.sql);
  writeFileSync(path.join(OUT, '116-photos-harvest.rollback.sql'), out.rollback);
  console.log(`wrote 116 (${input.subjects.length} subjects, ${input.subjects.filter((s) => s.locked).length} locked, ${input.subjects.flatMap((s) => s.photos).length} photos)`);
}
