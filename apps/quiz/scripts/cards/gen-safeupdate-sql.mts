// Bunnyverse Cards: writes docs/pending-migrations/cards/117-catalog-safeupdate.sql and its rollback from 103's own text. No network, no
// database.   tsx scripts/cards/gen-safeupdate-sql.mts
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAFEUPDATE_DAY, buildSafeupdate } from '../../src/lib/cards/safeupdate-sql';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = buildSafeupdate(readFileSync(path.join(OUT, '103-catalog-photos.sql'), 'utf8'), SAFEUPDATE_DAY);
  writeFileSync(path.join(OUT, '117-catalog-safeupdate.sql'), out.sql);
  writeFileSync(path.join(OUT, '117-catalog-safeupdate.rollback.sql'), out.rollback);
  console.log(`wrote 117 (md5 ${out.md5Old} -> ${out.md5New})`);
}
