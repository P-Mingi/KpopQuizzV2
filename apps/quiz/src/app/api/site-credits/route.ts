import { NextResponse } from 'next/server';

import { siteHasCredits } from '@/lib/credits/site-credits';

// CR-021 (owner decision of 2026-11-02): GET /api/site-credits answers { show: boolean }, "does this site have an image in use that needs a credit
// (CC BY, CC BY-SA)?", for the small Credits link of the footer (components/layout/ux-v1/ux-credits-link.tsx). The footer asks after the page has
// loaded, so the served HTML of a page does not depend on it (kpopquiz.org with no credited image serves the HTML it served before). Public,
// cookie-free, the same for everyone: cached six hours at the edge and in the data cache (lib/credits/site-credits.ts), fail closed (show false).
export const revalidate = 21600;

export async function GET(): Promise<NextResponse> {
  const show = await siteHasCredits();
  return NextResponse.json({ show }, { status: 200, headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } });
}
