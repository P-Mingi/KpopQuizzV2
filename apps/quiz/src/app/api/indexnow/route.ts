import { NextResponse } from 'next/server';

import { pingIndexNow, sitemapUrls } from '@/lib/indexnow';

import type { NextRequest } from 'next/server';

// On-deploy IndexNow submission (SEO indexation, audit v2). Resubmits the full
// sitemap so Bing/Yandex recrawl after a deploy. Guarded by a shared token so it
// cannot be triggered by randoms (each call fans out a full-site crawl hint).
// Wire it to a Vercel Deploy Hook / cron:  POST /api/indexnow?token=<INDEXNOW_TRIGGER_TOKEN>
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: NextRequest): Promise<NextResponse> {
  const token = process.env.INDEXNOW_TRIGGER_TOKEN;
  if (!token || request.nextUrl.searchParams.get('token') !== token) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const urls = await sitemapUrls();
    const result = await pingIndexNow(urls);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[indexnow] deploy submit failed:', err);
    return NextResponse.json({ error: 'Submit failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

// GET allowed too so a plain deploy hook / cron URL works without a body.
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
