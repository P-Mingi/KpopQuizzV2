// Bunnyverse Cards lot 6: writes docs/pending-migrations/cards/116c-approve-personality-rights.sql and its rollback from
// docs/design/cards/data/lot6/photos.json (verify-harvest.mts). No network, no database. OPTIONAL file: the owner decides.
//   tsx scripts/cards/gen-approve-sql.mts
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildApprove, personalityOnlyPages } from '../../src/lib/cards/approve-sql';
import type { HarvestPhotosFile } from '../../src/lib/cards/harvest-checks';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');
const LOT6_PHOTOS = path.join(REPO, 'docs/design/cards/data/lot6/photos.json');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = JSON.parse(readFileSync(LOT6_PHOTOS, 'utf8')) as HarvestPhotosFile;
  const pages = personalityOnlyPages(file);
  const out = buildApprove(pages, file.checked_on);
  writeFileSync(path.join(OUT, '116c-approve-personality-rights.sql'), out.sql);
  writeFileSync(path.join(OUT, '116c-approve-personality-rights.rollback.sql'), out.rollback);
  console.log(`wrote 116c (${pages.length} photos)`);
}
