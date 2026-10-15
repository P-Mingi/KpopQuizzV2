import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runWeeklyPull } from '@/lib/seo/weekly/pull';

import type { FetchLike } from '@/lib/seo/weekly/google-auth';
import type { NextRequest } from 'next/server';

// SEO Mission 3, part C: every Monday, Search Console (query x page x country x device) and
// Bing Webmaster (queries, pages, query x page, inbound links) into the weekly tables
// (docs/pending-migrations/seo-weekly-data.sql). Vercel Cron sends Bearer CRON_SECRET; a manual
// run uses the same header. Fail soft: no key, no table or an API error is logged and the route
// answers 200 with a summary of counts (never a query, a key or a token).
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const summary = await runWeeklyPull({
    db: hasDb ? createServiceRoleClient() : null,
    fetchImpl: fetch as unknown as FetchLike,
    now: new Date(),
    env: process.env,
  });
  return NextResponse.json({ ok: summary.gsc.status !== 'error' && summary.bing.status !== 'error', ...summary });
}
