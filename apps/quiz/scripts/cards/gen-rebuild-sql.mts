// Bunnyverse Cards lot 2: writes docs/pending-migrations/cards/102-catalog-rebuild.sql and its rollback from docs/design/cards/data/subjects.json
// (with the age verdicts of age-check.json and the pairs of the group photos). No network, no database.
//   tsx scripts/cards/gen-subjects.mts && tsx scripts/cards/gen-rebuild-sql.mts
// Refuses to write while a subject has no age verdict (the age rule decides first, every time).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build, type Subject } from '../../src/lib/cards/rebuild-sql';
import { SUBJECTS_JSON } from './gen-subjects.mts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const subjects = JSON.parse(readFileSync(SUBJECTS_JSON, 'utf8')) as Subject[];
  const out = build(subjects);
  writeFileSync(path.join(OUT, '102-catalog-rebuild.sql'), out.sql);
  writeFileSync(path.join(OUT, '102-catalog-rebuild.rollback.sql'), out.rollback);
  console.log(`wrote 102 (${out.kept.length} subjects pass the age rule, ${out.left.length} left out: ${out.left.map((l) => `${l.slug} (${l.reason})`).join(', ') || 'none'})`);
}
