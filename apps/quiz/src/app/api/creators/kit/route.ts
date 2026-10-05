import { NextResponse } from 'next/server';

import { isUuid } from '@/lib/anon-claim';
import { readLinkPlays } from '@/lib/creators/link-plays';
import { createPublicReadClient, createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { realFandomName } from '@/lib/ux-v1/p3/model';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest } from 'next/server';

// GET /api/creators/kit?quiz=<uuid>  (V12 G8, the share kit after publish).
//
// What the kit needs about ONE published quiz, read from the database (never
// from the client's draft): title, slug, question count, the group and its real
// fandom name, and the plays that came through the creator's own link.
//
// READ ONLY. The public part (title, group) is what /q/<slug> already shows.
// `linkPlays` is the viewer's own number: it is read only for the signed-in
// creator of that quiz, and it is null when it does not exist yet (the pending
// SQL v12-g8-share-link-plays.sql is not applied) so the kit shows no number.
// Flag off: 404, like any unknown path today.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export interface KitResponse {
  quiz: { id: string; slug: string; title: string; questions: number };
  group: { name: string; slug: string; fandom: string | null } | null;
  /** Plays through the viewer's links of this quiz. Null = not available. */
  linkPlays: number | null;
}

interface QuizRow {
  id: string;
  slug: string;
  title: string;
  question_count: number | null;
  creator_id: string | null;
  groups: { name: string; slug: string; fandom_name: string | null } | null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const quizId = req.nextUrl.searchParams.get('quiz');
  if (!isUuid(quizId)) return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE });

  try {
    const { data, error } = await createPublicReadClient()
      .from('quizzes')
      .select('id, slug, title, question_count, creator_id, groups(name, slug, fandom_name)')
      .eq('id', quizId)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const q = data as unknown as QuizRow | null;
    if (!q) return NextResponse.json({ error: 'quiz_not_found' }, { status: 404, headers: NO_STORE });

    let linkPlays: number | null = null;
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user && q.creator_id === user.id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      linkPlays = await readLinkPlays(createServiceRoleClient(), user.id, q.id);
    }

    const body: KitResponse = {
      quiz: { id: q.id, slug: q.slug, title: q.title, questions: q.question_count ?? 0 },
      group: q.groups ? { name: q.groups.name, slug: q.groups.slug, fandom: realFandomName(q.groups.fandom_name) } : null,
      linkPlays,
    };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (err) {
    console.warn('[api/creators/kit] degraded:', (err as Error)?.message ?? err);
    return NextResponse.json({ error: 'kit_unavailable' }, { status: 503, headers: NO_STORE });
  }
}
