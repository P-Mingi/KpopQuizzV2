import { NextResponse } from 'next/server';

import { createPublicReadClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

/**
 * SEO indexguard PART 4 - the title-dedup nudge backend.
 *
 * Returns whether an EXACT (case-insensitive) title already exists among
 * PUBLISHED quizzes, so the builder can show a soft, non-blocking hint nudging
 * the creator to add their angle (era, difficulty, B-sides). Read-only, no auth:
 * it leaks nothing beyond "a public quiz with this exact title exists".
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const title = (req.nextUrl.searchParams.get('title') ?? '').trim();
  if (title.length < 5) return NextResponse.json({ exists: false });

  const supabase = createPublicReadClient();
  // Escape LIKE wildcards so ilike is an exact case-insensitive match, not a pattern.
  const escaped = title.replace(/[%_\\]/g, '\\$&');
  const { data, error } = await supabase
    .from('quizzes')
    .select('slug')
    .eq('status', 'published')
    .ilike('title', escaped)
    .limit(1);

  if (error) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: (data?.length ?? 0) > 0 });
}
