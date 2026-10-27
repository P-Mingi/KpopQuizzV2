import { NextResponse } from 'next/server';

import { getQuizBySlug } from '@/lib/db/queries/quizzes';
import { GONE_HTML, battleQuizRef } from '@/lib/seo/legacy-urls';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// GET /api/legacy/battle?quiz=<slug or id>: the answer to the retired /battle?quiz= URL,
// which the middleware rewrites here (lib/seo/legacy-urls.ts). SEO (owner, 2026-10-14 and
// 2026-10-27): 301 to /q/<slug> when a published quiz has that slug, or that id (a UUID:
// the id is read to its slug first); else 410, the duel is retired and has no successor.
// The last read is always getQuizBySlug, the very one /q/[slug] uses, so a 301 never lands
// on a 404. A failed read answers 503, never a 410 that would tell crawlers a live quiz is
// gone.

export const dynamic = 'force-dynamic';

const GONE_HEADERS = { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } as const;

/** The slug of the published quiz with this id, or null. Throws when the read fails. */
async function publishedSlugById(id: string): Promise<string | null> {
  const { data, error } = await createPublicReadClient()
    .from('quizzes')
    .select('slug')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new Error(`quiz id read failed: ${error.message}`);
  return (data as { slug: string | null } | null)?.slug ?? null;
}

export async function GET(request: NextRequest): Promise<Response> {
  const gone = (): Response => new NextResponse(GONE_HTML, { status: 410, headers: GONE_HEADERS });
  const ref = battleQuizRef(request.nextUrl.searchParams.get('quiz'));
  if (!ref) return gone();
  let slug: string | null;
  try {
    slug = ref.kind === 'id' ? await publishedSlugById(ref.value) : ref.value;
    if (slug !== null && (await getQuizBySlug(slug)) === null) slug = null;
  } catch (err) {
    console.error('[legacy/battle] quiz read failed:', (err as Error)?.message ?? err);
    return new NextResponse(null, { status: 503, headers: { 'retry-after': '60' } });
  }
  if (!slug) return gone();
  return NextResponse.redirect(new URL(`/q/${encodeURIComponent(slug)}`, request.url), 301);
}
