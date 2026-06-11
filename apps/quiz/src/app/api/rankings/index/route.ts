import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/rankings/index
 *
 * Lists every duel question for the rankings index page: group_slug,
 * question_type, prompt, entity_kind, total real votes, the `public` flag
 * (votes >= min_votes), and the current top entity. Service-role client (needs
 * the real duel_votes count). Vote totals are tallied in one pass; if the vote
 * log grows large this should move to a denormalized counter or a view.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = createServiceRoleClient();

  const [{ data: questions }, { data: votes }, { data: ratings }] = await Promise.all([
    supabase
      .from('duel_questions')
      .select('id, group_slug, question_type, prompt, entity_kind, min_votes'),
    supabase.from('duel_votes').select('question_id'),
    supabase
      .from('duel_ratings')
      .select('question_id, entity_name, entity_image, elo')
      .order('elo', { ascending: false }),
  ]);

  // votes per question
  const voteCounts = new Map<string, number>();
  for (const v of votes ?? []) {
    const id = v.question_id as string;
    voteCounts.set(id, (voteCounts.get(id) ?? 0) + 1);
  }

  // top entity per question (ratings already sorted by elo desc -> first wins)
  const topEntity = new Map<string, { name: string; image: string | null; elo: number }>();
  for (const r of ratings ?? []) {
    const id = r.question_id as string;
    if (!topEntity.has(id)) {
      topEntity.set(id, {
        name: r.entity_name as string,
        image: (r.entity_image as string | null) ?? null,
        elo: r.elo as number,
      });
    }
  }

  const items = (questions ?? []).map((q) => {
    const total = voteCounts.get(q.id as string) ?? 0;
    return {
      group_slug: q.group_slug,
      question_type: q.question_type,
      prompt: q.prompt,
      entity_kind: q.entity_kind,
      total_votes: total,
      public: total >= (q.min_votes as number),
      top_entity: topEntity.get(q.id as string) ?? null,
    };
  });

  return NextResponse.json({ count: items.length, rankings: items });
}
