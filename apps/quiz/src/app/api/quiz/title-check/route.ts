import { NextResponse } from 'next/server';

import { createPublicReadClient } from '@/lib/supabase/server';
import { forSite } from '@/lib/site/scope';
import { isGenericGroupTitle } from '@/lib/seo/quiz-meta';
import { seriesSiblings } from '@/lib/seo/quiz-series';
import { getHubQuizzes } from '@/lib/ux-v1/p3/data';

import type { NextRequest } from 'next/server';

/**
 * SEO indexguard PART 4 - the title-dedup nudge backend.
 *
 * Returns whether an EXACT (case-insensitive) title already exists among
 * PUBLISHED quizzes, so the builder can show a soft, non-blocking hint nudging
 * the creator to add their angle (era, difficulty, B-sides). Read-only, no auth:
 * it leaks nothing beyond "a public quiz with this exact title exists".
 *
 * SEO phase 1, PR 12: reads only this site's quizzes (forSite), and with `group` (the slug picked in the
 * form) also advises on a close title in the same group (lib/seo/quiz-series.ts) and on a title that is the
 * group page's own ("{group} quiz", "{group} test", "quiz {group}", rulebook 1.5). `kind` says which;
 * `exists` keeps its meaning for the callers that only read it (the flag-off form sends no group).
 */
export const dynamic = 'force-dynamic';

type Kind = 'exact' | 'near' | 'hub';

const answer = (kind: Kind | null): NextResponse => NextResponse.json(kind ? { exists: true, kind } : { exists: false });

export async function GET(req: NextRequest): Promise<NextResponse> {
  const title = (req.nextUrl.searchParams.get('title') ?? '').trim();
  const groupSlug = (req.nextUrl.searchParams.get('group') ?? '').trim();
  if (title.length < 5) return answer(null);

  const supabase = createPublicReadClient();
  // Escape LIKE wildcards so ilike is an exact case-insensitive match, not a pattern.
  const escaped = title.replace(/[%_\\]/g, '\\$&');
  const { data, error } = await forSite(supabase
    .from('quizzes')
    .select('slug'))
    .eq('status', 'published')
    .ilike('title', escaped)
    .limit(1);

  if (!error && (data?.length ?? 0) > 0) return answer('exact');
  if (!groupSlug) return answer(null);

  const { data: group, error: groupError } = await forSite(supabase
    .from('groups')
    .select('id, name, fandom_name'))
    .eq('slug', groupSlug)
    .maybeSingle();
  if (groupError || !group) return answer(null);
  const g = group as { id: number; name: string; fandom_name: string | null };

  if (isGenericGroupTitle(title, g.name, groupSlug)) return answer('hub');
  try {
    const others = await getHubQuizzes(g.id);
    if (seriesSiblings({ slug: '', title }, others, { name: g.name, fandom: g.fandom_name }, 1).length > 0) return answer('near');
  } catch {
    // A failed read gives no advice: the hint is optional.
  }
  return answer(null);
}
