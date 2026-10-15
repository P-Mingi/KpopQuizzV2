import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { gatherWeeklyInput, supabaseWeeklyReader } from '@/lib/seo/weekly/report-data';
import { buildReport } from '@/lib/seo/weekly/report';
import { missingSendConfig, renderEmail, sendConfig, sendReportEmail } from '@/lib/seo/weekly/email';
import { readCalendarMd, readTargetsMd } from '@/lib/seo/weekly/repo-docs';
import { logRun } from '@/lib/seo/weekly/store';

import type { FetchLike } from '@/lib/seo/weekly/google-auth';
import type { NextRequest } from 'next/server';

// SEO Mission 3, part C: the Monday e-mail, to the owner only (SEO_REPORT_TO, one address),
// 15 lines at most, in simple French (lib/seo/weekly/report.ts). Runs after the Monday pull
// (/api/cron/seo-weekly-data). Bearer CRON_SECRET, as every cron.
//   ?dry=1    build and return the e-mail as JSON, send nothing (the preview in production)
//   ?force=1  send even if a report already went out in the last 20 hours
// Without RESEND_API_KEY, SEO_REPORT_FROM or SEO_REPORT_TO it builds, logs which variable is
// missing (never a value) and sends nothing.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1';
  const force = req.nextUrl.searchParams.get('force') === '1';
  const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const db = hasDb ? createServiceRoleClient() : null;
  const fetchImpl = fetch as unknown as FetchLike;
  const now = new Date();

  const input = await gatherWeeklyInput({
    reader: db ? supabaseWeeklyReader(db) : null,
    env: process.env,
    today: now.toISOString().slice(0, 10),
    fetchImpl,
    readTargets: readTargetsMd,
    readCalendar: readCalendarMd,
  });
  const model = buildReport(input);
  const email = renderEmail(model);
  console.log(`[seo-weekly-report] built ${model.lines.length} lines, ${model.redCount} red`);

  if (dry) return NextResponse.json({ ok: true, sent: false, dry: true, subject: email.subject, text: email.text, html: email.html });

  const cfg = sendConfig(process.env);
  if (!cfg) {
    const missing = missingSendConfig(process.env);
    console.log(`[seo-weekly-report] not sent, missing: ${missing.join(', ')}`);
    if (db) await logRun(db, 'report', 'skipped', model.lines.length, `missing ${missing.join(', ')}`);
    return NextResponse.json({ ok: true, sent: false, missing });
  }

  // One e-mail a week: a retried cron does not send it twice.
  if (db && !force) {
    const since = new Date(now.getTime() - 20 * 3_600_000).toISOString();
    const { data } = await db.from('seo_weekly_runs').select('id').eq('source', 'report').eq('status', 'ok').gte('ran_at', since).limit(1);
    if (data && data.length > 0) {
      console.log('[seo-weekly-report] already sent in the last 20 hours, skipped');
      return NextResponse.json({ ok: true, sent: false, skipped: 'already_sent' });
    }
  }

  const result = await sendReportEmail(cfg, email, fetchImpl);
  console.log(`[seo-weekly-report] ${result.detail}`);
  if (db) await logRun(db, 'report', result.ok ? 'ok' : 'error', model.lines.length, result.detail);
  return NextResponse.json({ ok: result.ok, sent: result.ok, detail: result.detail, lines: model.lines.length, red: model.redCount });
}
