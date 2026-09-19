import { NextResponse } from 'next/server';

import { createPublicReadClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// REFONTE P1 - the ONE dynamic redirect resolver the kill needs.
//
// The tier list feature was removed, but published public lists (/tier-list/l/[slug])
// were indexed and carry a group's fandom intent. Their slug is a per-LIST slug, not
// a group slug, so it cannot be mapped in next.config's static redirects (those
// handle every other tier-list URL). This route reads the list's subject group and
// 301s the fan to that group's kept hub /{group}-quiz, falling back to /quizzes when
// the list is unknown or has no subject group.
//
// Cookie-free (createPublicReadClient) so it stays on the middleware fast path and
// caches. It only READS tier_lists / groups; it never writes (the DB is untouched in
// this mission). A permanent redirect (308) so the equity moves for good.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const fallback = new URL('/quizzes', request.url);

  try {
    const db = createPublicReadClient();
    const { data: list } = await db
      .from('tier_lists')
      .select('subject_group_id')
      .eq('slug', slug)
      .maybeSingle<{ subject_group_id: number | null }>();

    if (list?.subject_group_id != null) {
      const { data: group } = await db
        .from('groups')
        .select('slug')
        .eq('id', list.subject_group_id)
        .maybeSingle<{ slug: string }>();
      if (group?.slug) {
        return NextResponse.redirect(new URL(`/${group.slug}-quiz`, request.url), 308);
      }
    }
  } catch {
    // Fall through to /quizzes on any read error - a redirect must never 500.
  }

  return NextResponse.redirect(fallback, 308);
}
