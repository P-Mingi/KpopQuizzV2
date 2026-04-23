import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/** Short URL handler that redirects through the click tracker. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';

  // Forward to the click tracking API, preserving headers for referrer detection
  return NextResponse.redirect(`${siteUrl}/api/share/click/${code}`, { status: 302 });
}
