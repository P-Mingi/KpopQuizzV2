// Bunnyverse Cards lot 3: writes docs/pending-migrations/cards/103-catalog-photos.sql and its rollback from
// docs/design/cards/data/photos.json (verify-photos.mts). No network, no database.
//   tsx scripts/cards/verify-photos.mts --candidates <dir> --lineups <file> --confirm <file> && tsx scripts/cards/gen-catalog3-sql.mts
// The photos left out (licence, author, deletion request, age rule, a repeated occasion) never reach the SQL.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build3, inputOf, type PhotosFile } from '../../src/lib/cards/catalog3-sql';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');
export const PHOTOS_JSON = path.join(REPO, 'docs/design/cards/data/photos.json');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = JSON.parse(readFileSync(PHOTOS_JSON, 'utf8')) as PhotosFile;
  const out = build3(inputOf(file));
  writeFileSync(path.join(OUT, '103-catalog-photos.sql'), out.sql);
  writeFileSync(path.join(OUT, '103-catalog-photos.rollback.sql'), out.rollback);
  console.log(`wrote 103 (${inputOf(file).subjects.length} subjects with photos, ${file.left_out.length} left out)`);
}
