// Bunnyverse Cards lot 7: writes docs/pending-migrations/cards/118-group-parts.sql and its rollback from the text of 117, 114 and 110 (the
// functions it replaces) and from docs/design/cards/data/lot7/parts.json (the verdicts of the group photos). Refuses when parts.json is missing.
// No network, no database.   tsx scripts/cards/gen-parts-sql.mts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PARTS_DAY, buildParts, type PartsData } from '../../src/lib/cards/parts-sql';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const OUT = path.join(REPO, 'docs/pending-migrations/cards');
export const PARTS_JSON = path.join(REPO, 'docs/design/cards/data/lot7/parts.json');

/** What the committed 118 files must equal: read the sources and the data, build. Throws when parts.json is missing. */
export function generate118(): ReturnType<typeof buildParts> {
  if (!existsSync(PARTS_JSON)) throw new Error(`gen-parts-sql: ${PARTS_JSON} is missing (the data lane writes it); nothing written`);
  const data = JSON.parse(readFileSync(PARTS_JSON, 'utf8')) as PartsData;
  const read = (f: string): string => readFileSync(path.join(OUT, f), 'utf8');
  return buildParts({ text117: read('117-catalog-safeupdate.sql'), text114: read('114-catalog-append.sql'), text110: read('110-core.sql') }, data, PARTS_DAY);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = generate118();
  writeFileSync(path.join(OUT, '118-group-parts.sql'), out.sql);
  writeFileSync(path.join(OUT, '118-group-parts.rollback.sql'), out.rollback);
  console.log(`wrote 118 (${out.photos} photos, ${out.sql.length} bytes; rollback ${out.rollback.length} bytes)`);
}
