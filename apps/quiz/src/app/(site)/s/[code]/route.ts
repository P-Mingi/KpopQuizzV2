import { NextResponse } from 'next/server';

import { recordShareClick, withShareCookie } from '@/lib/share/record-click';

import type { NextRequest } from 'next/server';

/**
 * Short URL of a creator share link. O1 audit 03 P1-2: it counts the click itself and answers ONE 302 to the quiz,
 * where it used to bounce through /api/share/click/{code}, which robots.txt disallows (a shared link dead-ended for
 * Google). An unknown code, or a link whose quiz is gone, is a real 404, never a redirect to the home page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';

  const click = await recordShareClick(request, code);
  if (!click.found || !click.slug) {
    return new NextResponse('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' } });
  }
  return withShareCookie(NextResponse.redirect(`${siteUrl}/q/${click.slug}`, { status: 302 }), code, click.slug);
}
