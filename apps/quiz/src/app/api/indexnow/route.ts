import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { pingIndexNow, sitemapUrls } from '@/lib/indexnow';
import { flushOutbox, getIndexNowStore } from '@/lib/seo/indexnow-outbox';
import { runReconcile } from '@/lib/seo/indexnow-reconcile';

import type { NextRequest } from 'next/server';

// Post-deploy IndexNow (SEO indexation, audit v2; SEO Mission 3 part A point 7). Called by
// .github/workflows/indexnow.yml once a push to main is live in production.
//
// With the outbox SQL applied (docs/pending-migrations/seo-indexnow.sql): the post-deploy
// diff. The pages defined in the code (articles, static pages, blind test modes, landings,
// /pt) are fetched and fingerprinted; those that changed since the last check, made on the
// previous deployment, are new, or left the sitemap go to the outbox, then the outbox is
// flushed. Unchanged pages are never resubmitted (rulebook 11.2).
// Before the SQL is applied: the previous behaviour, a resubmit of the whole sitemap.
// INDEXNOW_DRY_RUN=1 sends nothing in either case.
//
// Auth: Authorization: Bearer <INDEXNOW_TRIGGER_TOKEN or CRON_SECRET>, or the older
// ?token=<INDEXNOW_TRIGGER_TOKEN>. ?sha=<commit>: answers 409 until that commit is the one
// serving production (VERCEL_GIT_COMMIT_SHA), so the workflow never diffs the old deployment.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  if (isCronAuthorized(req)) return true;
  const token = process.env.INDEXNOW_TRIGGER_TOKEN;
  if (!token) return false;
  return req.headers.get('authorization') === `Bearer ${token}` || req.nextUrl.searchParams.get('token') === token;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const wanted = req.nextUrl.searchParams.get('sha');
  const live = process.env.VERCEL_GIT_COMMIT_SHA;
  if (wanted && live && wanted !== live) {
    return NextResponse.json({ ok: false, reason: 'not_deployed_yet', live: live.slice(0, 7) }, { status: 409 });
  }

  try {
    const store = getIndexNowStore();
    if (store && (await store.live())) {
      const diff = await runReconcile(store, { scope: 'code', kind: 'deploy_diff', budgetMs: 200000 });
      const flush = await flushOutbox(store);
      return NextResponse.json({ ok: diff.ok, mode: 'deploy_diff', diff, flush }, { status: diff.ok ? 200 : 502 });
    }
    const urls = await sitemapUrls();
    const result = await pingIndexNow(urls);
    return NextResponse.json({ mode: 'full_sitemap', ...result });
  } catch (err) {
    console.error('[indexnow] deploy submit failed:', err);
    return NextResponse.json({ error: 'Submit failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

// GET allowed too so a plain deploy hook / cron URL works without a body.
export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}
