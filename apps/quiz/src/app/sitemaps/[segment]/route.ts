import { NextResponse } from 'next/server';

import sitemap from '@/app/sitemap';
import { SITE_ID } from '@/lib/site/registry';
import { isSitemapSegment, sitemapXml, splitSitemap } from '@/lib/seo/sitemap-segments';

// O1 audit 03 P2-1: GET /sitemaps/<segment>.xml, one sitemap per page template (lib/seo/sitemap-segments.ts), cut from the entries of
// /sitemap.xml itself, which stays whole. Same hourly revalidation as the whole sitemap. kpopquiz.org only.
export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ segment: string }> },
): Promise<Response> {
  const { segment: raw } = await params;
  const segment = raw.replace(/\.xml$/, '');
  if (SITE_ID !== 'kpop' || !raw.endsWith('.xml') || !isSitemapSegment(segment)) {
    return new NextResponse('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  const xml = sitemapXml(splitSitemap(await sitemap())[segment]);
  return new NextResponse(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } });
}
