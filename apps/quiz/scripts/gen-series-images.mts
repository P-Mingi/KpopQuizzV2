/**
 * Run O1 (IMG): writes src/lib/anime/series-images.generated.ts, the free photo of each OtakuQuiz series (slug to file, alt,
 * credit line when the licence asks for one, fallback) and the credit of each photo for /credits. The map comes from
 * docs/anime/images/*.json and from nothing else; the script stops, listing every problem, when an entry lacks source_url,
 * author, license, license_url or retrieved, names a licence outside the allowed ones, or lists a file that is not in
 * public/series/. src/lib/anime/series-images.test.ts fails while the generated file is behind the data.
 *
 * Run from apps/quiz:  npx tsx scripts/gen-series-images.mts          (writes the file)
 *                      npx tsx scripts/gen-series-images.mts --check  (exit 1 when the file is behind the data)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildSeriesImages, readImageRows, readSeriesNames, renderSeriesImages } from '../src/lib/anime/series-images-data.ts';

const DATA = join(process.cwd(), '../../docs/anime/images');
const SERIES = join(process.cwd(), '../../docs/anime/data/series');
const PUBLIC = join(process.cwd(), 'public');
const OUT = join(process.cwd(), 'src/lib/anime/series-images.generated.ts');

const text = renderSeriesImages(buildSeriesImages(readImageRows(DATA), { fileExists: (p) => existsSync(join(PUBLIC, p)), names: readSeriesNames(SERIES) }));
if (process.argv.includes('--check')) {
  if (readFileSync(OUT, 'utf8') !== text) { console.error('series-images.generated.ts is behind docs/anime/images: run scripts/gen-series-images.mts'); process.exit(1); }
} else writeFileSync(OUT, text);
