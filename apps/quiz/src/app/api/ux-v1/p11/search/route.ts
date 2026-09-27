import { NextResponse } from 'next/server';

import { UX_V1 } from '@/lib/ux-v1';
import { normalizeQuery } from '@/lib/ux-v1/p11/search-model';
import { popularSearch, searchCatalog } from '@/lib/ux-v1/p11/search';

import type { NextRequest } from 'next/server';

// GET /api/ux-v1/p11/search?q=<text> - the search overlay's results (DESIGN-SPEC
// 16.5): groups, quizzes (incl. the quizzes of a matched group) and blindtest
// songs; without q, the lists shown before typing (popular groups, most played
// quizzes). NEW endpoint (the live /api/search payload is unchanged). READ ONLY,
// public catalog data only (no user field, no cookie read), so a good answer is
// cacheable at the edge; a degraded one (a read failed) is never cached.
// Flag off: 404.
export const dynamic = 'force-dynamic';

const CACHED = { 'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' };
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const q = normalizeQuery(req.nextUrl.searchParams.get('q'));
  try {
    const body = q ? await searchCatalog(q) : await popularSearch();
    return NextResponse.json(body, { headers: body.degraded ? NO_STORE : CACHED });
  } catch (e) {
    console.error('[ux-v1/p11/search]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
