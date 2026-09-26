import { NextResponse } from 'next/server';

import { getAllGroups } from '@/lib/db/queries/groups';
import { UX_V1 } from '@/lib/ux-v1';
import { getP2FacetRows, getP2Page } from '@/lib/ux-v1/p2/queries';
import { P2_PAGE_SIZE, p2Facets, p2Languages, parseP2Filters, toP2Card } from '@/lib/ux-v1/p2/filters';

import type { NextRequest } from 'next/server';
import type { P2PagePayload } from '@/lib/ux-v1/p2/filters';

// GET /api/ux-v1/p2/quizzes?<the /quizzes params>&page=N - one page of the v11
// browse, for "Load more quizzes" (P2). Same params, same parsing and the same
// server reads as the page itself (so page N here is page N of /quizzes?page=N).
// Public and READ ONLY: published quizzes, card fields only. Flag off: 404, so the
// flag-off site has no new endpoint.

const CACHE = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' };
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
    const now = Date.now();
    const [groups, rows] = await Promise.all([getAllGroups(), getP2FacetRows()]);
    const f = parseP2Filters(sp, { groupSlugs: new Set(groups.map((g) => g.slug)), languages: p2Languages(rows) });
    const groupId = f.group ? groups.find((g) => g.slug === f.group)?.id ?? null : null;
    const quizzes = await getP2Page(f, groupId, rows, now);
    const total = rows.length > 0 ? p2Facets(rows, f, now).total : null;
    const body: P2PagePayload = {
      quizzes: quizzes.map(toP2Card),
      page: f.page,
      hasMore: total !== null ? f.page * P2_PAGE_SIZE < total : quizzes.length >= P2_PAGE_SIZE,
    };
    return NextResponse.json(body, { headers: CACHE });
  } catch (e) {
    console.error('[ux-v1/p2/quizzes]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
