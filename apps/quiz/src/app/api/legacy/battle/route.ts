import { NextResponse } from 'next/server';

import { getQuizBySlug } from '@/lib/db/queries/quizzes';
import { NOT_FOUND_HTML, battleQuizSlug } from '@/lib/seo/legacy-urls';

import type { NextRequest } from 'next/server';

// GET /api/legacy/battle?quiz=<slug>: the answer to the retired /battle?quiz=<slug> URL,
// which the middleware rewrites here (lib/seo/legacy-urls.ts). SEO (owner, 2026-10-14):
// 301 to /q/<slug> when a published quiz has that slug, else a real 404. The read is
// getQuizBySlug, the very one /q/[slug] uses, so a 301 never lands on a 404. A failed
// read answers 503, never a 404 that would tell crawlers a live quiz is gone.

export const dynamic = 'force-dynamic';

const HTML = { 'content-type': 'text/html; charset=utf-8' } as const;

export async function GET(request: NextRequest): Promise<Response> {
  const slug = battleQuizSlug(request.nextUrl.searchParams.get('quiz'));
  if (!slug) return new NextResponse(NOT_FOUND_HTML, { status: 404, headers: HTML });
  let exists: boolean;
  try {
    exists = (await getQuizBySlug(slug)) !== null;
  } catch (err) {
    console.error('[legacy/battle] quiz read failed:', (err as Error)?.message ?? err);
    return new NextResponse(null, { status: 503, headers: { 'retry-after': '60' } });
  }
  if (!exists) return new NextResponse(NOT_FOUND_HTML, { status: 404, headers: HTML });
  return NextResponse.redirect(new URL(`/q/${slug}`, request.url), 301);
}
