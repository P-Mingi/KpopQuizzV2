import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';
import { notifyRating } from '@/lib/notifications';

import type { NextRequest } from 'next/server';

const VALID_REACTIONS = ['too_easy', 'perfect', 'too_hard', 'banger'] as const;
type Reaction = (typeof VALID_REACTIONS)[number];

type ReactionCounts = Record<Reaction, number>;

const EMPTY_COUNTS: ReactionCounts = {
  too_easy: 0,
  perfect: 0,
  too_hard: 0,
  banger: 0,
};

/**
 * GET /api/quiz/[id]/react
 * Returns reaction counts for a quiz and the current user's reaction (or null).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  if (!COMMUNITY_FEATURES_ENABLED) {
    return NextResponse.json({ counts: EMPTY_COUNTS, userReaction: null });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('quiz_reactions')
    .select('reaction, user_id')
    .eq('quiz_id', id);

  if (error) {
    console.error('Failed to fetch reactions:', error);
    return NextResponse.json({ counts: EMPTY_COUNTS, userReaction: null });
  }

  const counts: ReactionCounts = { ...EMPTY_COUNTS };
  let userReaction: Reaction | null = null;

  for (const row of data ?? []) {
    const r = row.reaction as Reaction;
    if (r in counts) counts[r] += 1;
    if (user && row.user_id === user.id) userReaction = r;
  }

  return NextResponse.json({ counts, userReaction });
}

/**
 * POST /api/quiz/[id]/react
 * Body: { reaction: 'too_easy' | 'perfect' | 'too_hard' | 'banger' }
 * Upserts the user's reaction, returns updated counts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  if (!COMMUNITY_FEATURES_ENABLED) {
    return NextResponse.json(
      { error: 'Community features are not yet enabled' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { reaction } = body as Record<string, unknown>;
  if (typeof reaction !== 'string' || !VALID_REACTIONS.includes(reaction as Reaction)) {
    return NextResponse.json(
      { error: `reaction must be one of: ${VALID_REACTIONS.join(', ')}` },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Detect if this is a NEW banger (not a re-upsert of an existing one) so we
  // don't spam the creator every time someone edits their reaction.
  let wasAlreadyBanger = false;
  if (reaction === 'banger') {
    const { data: existing } = await supabase
      .from('quiz_reactions')
      .select('reaction')
      .eq('quiz_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    wasAlreadyBanger = existing?.reaction === 'banger';
  }

  const { error: upsertError } = await supabase
    .from('quiz_reactions')
    .upsert(
      { quiz_id: id, user_id: user.id, reaction },
      { onConflict: 'quiz_id,user_id' },
    );

  if (upsertError) {
    console.error('Failed to upsert reaction:', upsertError);
    return NextResponse.json({ error: 'Failed to save reaction' }, { status: 500 });
  }

  // Fire a rating notification for new bangers (but not self-reactions and
  // not re-upserts of an already-banger reaction).
  if (reaction === 'banger' && !wasAlreadyBanger) {
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('creator_id, title')
      .eq('id', id)
      .single();

    if (quiz && quiz.creator_id && quiz.creator_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      await notifyRating({
        creatorId: quiz.creator_id as string,
        quizId: id,
        quizTitle: (quiz.title as string) ?? '',
        username: (profile?.username as string | undefined) ?? 'someone',
      });
    }
  }

  // Return updated counts
  const { data, error } = await supabase
    .from('quiz_reactions')
    .select('reaction')
    .eq('quiz_id', id);

  if (error) {
    console.error('Failed to recount reactions:', error);
    return NextResponse.json({ counts: EMPTY_COUNTS, userReaction: reaction });
  }

  const counts: ReactionCounts = { ...EMPTY_COUNTS };
  for (const row of data ?? []) {
    const r = row.reaction as Reaction;
    if (r in counts) counts[r] += 1;
  }

  return NextResponse.json({ counts, userReaction: reaction });
}
