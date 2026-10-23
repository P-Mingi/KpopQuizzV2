import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { dryRunRequested } from '@/lib/seo/watch/env';
import { productionGuardDeps, runLinkedGuard } from '@/lib/seo/watch/linked-guard';
import { makeFetcher } from '@/lib/seo/watch/page-check';

import type { NextRequest } from 'next/server';

// SEO Mission 3, part D, point 1: the nightly linked-URL guard (lib/seo/watch/linked-guard.ts).
// Every URL that earned a link must still answer 200 and be indexable, or keep its exact 301;
// otherwise one Discord ops alert. Bearer CRON_SECRET only. ?dry=1 (or SEO_WATCH_DRY_RUN=1)
// checks and reports without alerting or logging. Read-only on production pages.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const dryRun = dryRunRequested(req.url);
  const report = await runLinkedGuard(productionGuardDeps(makeFetcher(), dryRun), { dryRun });
  if (report.ok) console.log('[seo-linked-urls]', JSON.stringify(report));
  else console.error('[seo-linked-urls] FAILURES', JSON.stringify(report));
  return NextResponse.json(report);
}
