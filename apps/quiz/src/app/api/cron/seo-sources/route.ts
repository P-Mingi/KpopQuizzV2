import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { dryRunRequested } from '@/lib/seo/watch/env';
import { productionSourceDeps, runSourceCheck } from '@/lib/seo/watch/sources';

import type { NextRequest } from 'next/server';

// SEO Mission 3, part D, point 2: the monthly check of the fact source URLs
// (lib/seo/watch/sources.ts). Dead sources (404, 410, host gone) are one Discord ops alert.
// Polite: HEAD first, 6 requests at once, 2 per host. Bearer CRON_SECRET only. ?dry=1 (or
// SEO_WATCH_DRY_RUN=1) checks and reports without alerting or logging.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUDGET_MS = 250_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const dryRun = dryRunRequested(req.url);
  const report = await runSourceCheck(productionSourceDeps(dryRun), { dryRun, budgetMs: BUDGET_MS });
  if (report.error) console.error('[seo-sources]', report.error);
  console.log('[seo-sources]', JSON.stringify({ ...report, unverified: report.unverified.length }));
  return NextResponse.json(report, { status: report.error ? 500 : 200 });
}
