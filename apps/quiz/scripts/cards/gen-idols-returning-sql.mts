// Bunnyverse Cards lot 3: writes docs/pending-migrations/cards/099b-idols-returning.sql and its rollback: the current members of the groups
// lot 2 left out ONLY because someone was under 18 on their old photo's date, and that lot 3 brings back with newer photos
// (docs/design/cards/data/photos.json). 103 checks every group's members in public.idols at apply time (the adult rule of decision 17);
// these groups were not in 099 (they failed the age rule then), so without this file 103 would leave them out ("no_active_member").
// Only the groups with two photos at least that are not out: a group that cannot enter the packs gets no row.
// Same rules as 099: only a group whose groups row has no active idols row; a birth date only when two permitted sources give it to the
// day (lot 2's research file and the lot 3 confirmations, both LOCAL, never in the repository); every active row waits out of Kpopdle
// (needs_review) and the file refuses if the Kpopdle source count moves.
//   tsx scripts/cards/gen-idols-returning-sql.mts <lineups.json> <birth-confirm.json>
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { peopleOf, type Confirmation, type ResearchRow } from '../../src/lib/cards/photo-checks';
import { buildReturningSql, type ReturningRow } from '../../src/lib/cards/idols-returning-sql';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');
const PHOTOS = path.join(REPO, 'docs/design/cards/data/photos.json');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [lineupsFile, confirmFile] = process.argv.slice(2);
  if (!lineupsFile || !confirmFile) {
    console.error('usage: tsx scripts/cards/gen-idols-returning-sql.mts <lineups.json> <birth-confirm.json>');
    process.exit(2);
  }
  for (const f of [lineupsFile, confirmFile]) {
    if (path.resolve(f).startsWith(REPO + path.sep)) throw new Error(`refused: ${f} holds birth dates and must stay outside the repository`);
  }
  const lineups = JSON.parse(readFileSync(lineupsFile, 'utf8')) as Array<ResearchRow & { name: string; people: Array<ResearchRow['people'][number] & { qid?: string; name?: string }> }>;
  const confirm = JSON.parse(readFileSync(confirmFile, 'utf8')) as Confirmation[];
  const photos = JSON.parse(readFileSync(PHOTOS, 'utf8')) as { checked_on: string; subjects: Array<{ slug: string; returning?: boolean; photos: Array<{ status: string }> }> };
  const rows: ReturningRow[] = [];
  // Only a group that can enter the packs: two photos at least that are not out (approved, auto, or waiting for the owner's review).
  for (const s of photos.subjects.filter((x) => x.returning && x.photos.filter((p) => p.status !== 'out').length >= 2)) {
    const l = lineups.find((x) => x.slug === s.slug);
    if (!l) throw new Error(`${s.slug}: no lineup row`);
    const people = peopleOf(l, confirm).filter((p) => p.current);
    if (people.some((p) => !p.qid)) throw new Error(`${s.slug}: a member has no wikidata id`);
    rows.push({
      slug: s.slug,
      members: people.map((p, i) => ({
        name: p.name as string, qid: p.qid as string, ord: i + 1,
        birth_date: p.birth_confirmed && p.birth_precision === 'day' && p.birth_date ? p.birth_date : null,
      })),
    });
  }
  const out = buildReturningSql(rows, photos.checked_on);
  writeFileSync(path.join(OUT, '099b-idols-returning.sql'), out.sql);
  writeFileSync(path.join(OUT, '099b-idols-returning.rollback.sql'), out.rollback);
  console.log(`099b-idols-returning: ${rows.length} groups (${rows.map((r) => `${r.slug} ${r.members.length}`).join(', ')}), ${rows.reduce((n, r) => n + r.members.filter((m) => !m.birth_date).length, 0)} people without a confirmed day`);
}
