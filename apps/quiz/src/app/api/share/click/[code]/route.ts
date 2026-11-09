import { NextResponse } from 'next/server';

import { recordShareClick, withShareCookie } from '@/lib/share/record-click';

import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code: shareCode } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';

  const click = await recordShareClick(request, shareCode);
  if (!click.found) return NextResponse.redirect(`${siteUrl}/`, { status: 302 });

  const redirectUrl = click.slug ? `${siteUrl}/q/${click.slug}` : `${siteUrl}/`;
  return withShareCookie(NextResponse.redirect(redirectUrl, { status: 302 }), shareCode, click.slug);
}
