import { NextResponse } from 'next/server';

import { parseVital, webVitalsOn } from '@/lib/vitals';

import type { NextRequest } from 'next/server';

// POST /api/vitals - one Core Web Vital of one page load (audit 02 P0-3, option B).
//
// Follows NEXT_PUBLIC_WEB_VITALS alone: off (the default) = 404, as if the route did not exist.
// Stores nothing: one structured line per metric goes to the runtime logs, the owner reads p75 per
// template there (or drains it). Fields are enums and one number; never the URL, the IP or the user agent.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!webVitalsOn()) return new NextResponse(null, { status: 404 });
  let body: unknown = null;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const v = parseVital(body);
  if (!v) return new NextResponse(null, { status: 400 });
  console.info(`kq_vital ${JSON.stringify(v)}`);
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
