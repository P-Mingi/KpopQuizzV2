import { NextResponse } from 'next/server';

import { GONE_HTML } from '@/lib/seo/legacy-urls';

// GET /api/legacy/gone: the 410 of a quiz removed with no successor. next.config.ts rewrites the /q/<slug> of each row of
// QUIZ_GONE (lib/seo/quiz-redirects.ts) here, so the address keeps its URL and answers 410 Gone, noindex (rulebook 9.3), never a 404.
export const dynamic = 'force-static';

export function GET(): Response {
  return new NextResponse(GONE_HTML, { status: 410, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } });
}
