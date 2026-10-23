import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { dryRunRequested } from '@/lib/seo/watch/env';
import { runSpikeJob, spikeJobOptions, supabaseSpikeDeps } from '@/lib/seo/watch/spike-job';

import type { NextRequest } from 'next/server';

// SEO Mission 3, part D, point 3: the hourly play-spike check (lib/seo/watch/spikes.ts and
// spike-job.ts). A group above 5 times its 14-day median: an e-mail to the owner (recipient from
// SEO_ALERT_EMAIL_TO, never in the code) and its hub to IndexNow. Bearer CRON_SECRET only.
// ?dry=1 (or SEO_WATCH_DRY_RUN=1) computes and reports, sends and writes nothing.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const deps = supabaseSpikeDeps();
  if (!deps) return NextResponse.json({ ok: false, skipped: 'no_service_role' });
  const dryRun = dryRunRequested(req.url);
  const report = await runSpikeJob(deps, spikeJobOptions(dryRun));
  if (report.error) console.error('[seo-spikes]', report.error);
  else console.log('[seo-spikes]', JSON.stringify(report));
  return NextResponse.json(report, { status: report.error ? 500 : 200 });
}
