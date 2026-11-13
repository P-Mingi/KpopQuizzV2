// Bunnyverse Cards lot 3: writes docs/pending-migrations/cards/103-catalog-photos.sql and its rollback from
// docs/design/cards/data/photos.json (verify-photos.mts). No network, no database.
//   tsx scripts/cards/verify-photos.mts --candidates <dir> --lineups <file> --confirm <file> && tsx scripts/cards/gen-catalog3-sql.mts
// The photos left out (licence, author, deletion request, age rule, a repeated occasion) never reach the SQL.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build3, type Catalog3Input, type Photo3 } from '../../src/lib/cards/catalog3-sql';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');
export const PHOTOS_JSON = path.join(REPO, 'docs/design/cards/data/photos.json');

interface PhotosFile {
  checked_on: string;
  subjects: Array<{ slug: string; kind: 'idol' | 'group'; end_year: number | null; photos: Array<Photo3 & { status: Photo3['status'] | 'out' }> }>;
  left_out: Array<{ slug: string; reason: string }>;
}

/** photos.json to the builder's input: the photos that are not out, with their review reasons. */
export function inputOf(file: PhotosFile): Catalog3Input {
  return {
    checked_on: file.checked_on,
    left_out: file.left_out,
    subjects: file.subjects
      .map((s) => ({
        slug: s.slug, kind: s.kind, end_year: s.end_year,
        photos: s.photos.filter((p): p is Photo3 => p.status !== 'out').map((p) => ({
          slot: p.slot, status: p.status, source: p.source, page: p.page, url: p.url, width: p.width, height: p.height, sha1: p.sha1,
          author: p.author, author_url: p.author_url, licence: p.licence, licence_url: p.licence_url, share_alike: p.share_alike,
          date: p.date, date_precision: p.date_precision, event: p.event, stage: p.stage, quality: p.quality, focal: p.focal,
          source_path: p.source_path, news_only: p.news_only, review: p.review,
        })),
      }))
      .filter((s) => s.photos.length > 0),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = JSON.parse(readFileSync(PHOTOS_JSON, 'utf8')) as PhotosFile;
  const out = build3(inputOf(file));
  writeFileSync(path.join(OUT, '103-catalog-photos.sql'), out.sql);
  writeFileSync(path.join(OUT, '103-catalog-photos.rollback.sql'), out.rollback);
  console.log(`wrote 103 (${inputOf(file).subjects.length} subjects with photos, ${file.left_out.length} left out)`);
}
