import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * GET /api/rankings/{group}/{type}
 *
 * Full ranking for a question: every entity sorted by Elo desc with wins/losses,
 * plus the question's total REAL vote count and a `public` flag (Section 4c):
 * public = (real duel_votes >= min_votes). Always returns the data; `public`
 * just signals whether the page should be indexable. Uses the service-role
 * client because the real vote count needs duel_votes (no public SELECT) and
 * the seeded wins/losses are not a substitute for it.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ group: string; type: string }> },
): Promise<NextResponse> {
  const { group, type } = await params;
  const supabase = createServiceRoleClient();

  const { data: question } = await supabase
    .from('duel_questions')
    .select('id, prompt, entity_kind, group_slug, question_type, min_votes')
    .eq('group_slug', group)
    .eq('question_type', type)
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ error: 'No such ranking' }, { status: 404 });
  }

  const { data: ratings } = await supabase
    .from('duel_ratings')
    .select('entity_id, entity_name, entity_image, elo, wins, losses')
    .eq('question_id', question.id)
    .order('elo', { ascending: false });

  const { count: totalVotes } = await supabase
    .from('duel_votes')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', question.id);

  const total = totalVotes ?? 0;

  return NextResponse.json({
    question: {
      id: question.id,
      prompt: question.prompt,
      entity_kind: question.entity_kind,
      group_slug: question.group_slug,
      question_type: question.question_type,
      min_votes: question.min_votes,
    },
    total_votes: total,
    public: total >= (question.min_votes as number),
    entities: (ratings ?? []).map((r, i) => ({
      rank: i + 1,
      entity_id: r.entity_id,
      name: r.entity_name,
      image: r.entity_image,
      elo: r.elo,
      wins: r.wins,
      losses: r.losses,
    })),
  });
}
