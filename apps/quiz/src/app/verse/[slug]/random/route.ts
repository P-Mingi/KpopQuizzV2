import { NextResponse } from 'next/server';

import { getSpace } from '@/lib/verse/space';

import type { NextRequest } from 'next/server';

// V-SPACE-FLOW (go deeper) - "Surprise me": redirect to a random REAL page within
// this space (member and album pages, plus the timeline). Real destinations only;
// an unknown slug falls back to the space home. Dynamic by nature (no ISR).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return NextResponse.redirect(new URL('/verse', req.url));
  const hrefs: string[] = [
    ...space.idols.map((i) => `/verse/${space.group.slug}/members/${i.slug}`),
    ...space.albums.map((a) => `/verse/${space.group.slug}/albums/${a.slug}`),
    `/verse/${space.group.slug}/timeline`,
  ];
  const pick = hrefs[Math.floor(Math.random() * hrefs.length)] ?? `/verse/${space.group.slug}`;
  return NextResponse.redirect(new URL(pick, req.url), 307);
}
