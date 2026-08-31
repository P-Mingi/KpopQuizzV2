import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// W5 PART 1 - the dataset, published in full beside the report.
//
// The report says "Full figures, queries and sample sizes are published alongside", so that
// sentence has to be true and a Tier 1 journalist will click it. This serves
// docs/data/w5-dataset.md verbatim as text/markdown, read at BUILD time (force-static), so
// there is exactly one copy of the file in the repo and no drift between the doc and the
// page. If the file ever moves, this route fails the build rather than serving a stale copy.
//
// Deliberately NOT in the sitemap: it is a raw data file, not a page competing for a query,
// and keeping it out means it cannot become an orphan-gate or metadata-dupes problem. It is
// reachable, which is what the report promises, via two links on the report page itself.

export const dynamic = 'force-static';

const DATASET_PATH = join(process.cwd(), '..', '..', 'docs', 'data', 'w5-dataset.md');

export function GET(): Response {
  const body = readFileSync(DATASET_PATH, 'utf8');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'inline; filename="kpopquiz-knowledge-report-2026-dataset.md"',
      'X-Robots-Tag': 'noindex, follow',
    },
  });
}
