import { NextResponse } from 'next/server';

import { diffSitemaps, parseSitemapEntries, urlsToSubmit } from '@/lib/indexnow-diff';
import { pingIndexNow, sitemapEntries } from '@/lib/indexnow';

import type { NextRequest } from 'next/server';

// On-deploy IndexNow submission. O1 audit 03 P1-8 (rulebook 11.2): it submits only the URLs that were added, removed or whose lastmod
// changed since the previous sitemap, never the whole sitemap again. The caller (.github/workflows/indexnow.yml) keeps the last
// sitemap as an artifact and POSTs it as the body; with no previous sitemap there is nothing to compare, so it submits 0 and the caller
// records the baseline. Guarded by a shared token so it cannot be triggered by randoms.
//   POST /api/indexnow?token=<INDEXNOW_TRIGGER_TOKEN>   body: the previous /sitemap.xml (text)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PREVIOUS_BYTES = 4_000_000;

async function handle(request: NextRequest, previousXml: string | null): Promise<NextResponse> {
  const token = process.env.INDEXNOW_TRIGGER_TOKEN;
  if (!token || request.nextUrl.searchParams.get('token') !== token) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  if (!previousXml || !previousXml.includes('<url>')) {
    return NextResponse.json({ ok: true, submitted: 0, batches: 0, reason: 'no previous sitemap: baseline only' });
  }

  try {
    const diff = diffSitemaps(parseSitemapEntries(previousXml), await sitemapEntries());
    const urls = urlsToSubmit(diff);
    const result = await pingIndexNow(urls);
    return NextResponse.json({ ok: true, ...result, added: diff.added.length, removed: diff.removed.length, changed: diff.changed.length });
  } catch (err) {
    console.error('[indexnow] deploy submit failed:', err);
    return NextResponse.json({ error: 'Submit failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  return handle(request, body.length <= MAX_PREVIOUS_BYTES ? body : null);
}

// GET has no previous sitemap to compare with: it submits nothing (it used to resubmit every URL).
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request, null);
}
