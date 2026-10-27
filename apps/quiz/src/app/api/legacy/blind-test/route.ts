import { NextResponse } from 'next/server';

import { blindtestPageRenders } from '@/lib/blind-test/mode-page';
import { GONE_HTML, LEGACY_PATH_HEADER, LEGACY_SEARCH_HEADER, blindTestAnswer } from '@/lib/seo/legacy-urls';

import type { NextRequest } from 'next/server';

// GET /api/legacy/blind-test: the answer to a retired /blind-test URL, which the middleware
// rewrites here with its path and query string in two request headers (lib/seo/legacy-urls.ts).
// SEO (owner, 2026-10-27): 301 to the exact /blindtest page, query kept, only when that page
// renders; else 410. The check is blindtestPageRenders, the reads /blindtest/[mode] itself
// decides its 404 with, so a 301 never lands on a 404. A failed read answers 503, never a 410
// that would tell crawlers a live page is gone.

export const dynamic = 'force-dynamic';

const GONE_HEADERS = { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } as const;

export async function GET(request: NextRequest): Promise<Response> {
  let answer: Awaited<ReturnType<typeof blindTestAnswer>>;
  try {
    answer = await blindTestAnswer(request.headers.get(LEGACY_PATH_HEADER) ?? '', blindtestPageRenders);
  } catch (err) {
    console.error('[legacy/blind-test] page check failed:', (err as Error)?.message ?? err);
    answer = { status: 503 };
  }
  if (answer === null) return new NextResponse(null, { status: 404 });
  if (answer.status === 503) return new NextResponse(null, { status: 503, headers: { 'retry-after': '60' } });
  if (answer.status === 410) return new NextResponse(GONE_HTML, { status: 410, headers: GONE_HEADERS });
  const to = new URL(answer.location, request.url);
  const search = request.headers.get(LEGACY_SEARCH_HEADER) ?? '';
  if (search.startsWith('?')) to.search = search;
  return NextResponse.redirect(to, 301);
}
