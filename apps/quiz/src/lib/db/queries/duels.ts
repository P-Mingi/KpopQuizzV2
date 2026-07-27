import { cache } from 'react';

import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Shared duel/ranking server queries. Single source of truth for the public
 * ranking data, used by both the /api/rankings/* routes and the SSR /rankings
 * pages (no internal HTTP hop). Service-role because the real vote count comes
 * from duel_votes (no public SELECT) and seeded wins/losses are not a substitute.
 */

/**
 * V closeout - the ONE source of truth for when a fan ranking unlocks. Lowered
 * from the old per-question default of 500 so real votes become visible sooner.
 * Bands: 0 votes = locked; 1..UNLOCK-1 = provisional "early results"; >= UNLOCK =
 * live. This supersedes the duel_questions.min_votes column for every gate
 * (display + the Elo reconcile), so there is no second threshold to keep in sync.
 * Owner rule: never simulate votes - provisional shows REAL current standings.
 */
export const RANKING_UNLOCK_VOTES = 30;

export interface RankingEntity {
  rank: number;
  entity_id: string;
  name: string;
  image: string | null;
  elo: number;
  wins: number;
  losses: number;
}

export interface RankingResult {
  question: {
    id: string;
    prompt: string;
    entity_kind: string;
    group_slug: string;
    question_type: string;
    min_votes: number;
  };
  total_votes: number;
  public: boolean;
  /** 1..UNLOCK-1 votes: real early standings, not yet a settled ranking. */
  provisional: boolean;
  entities: RankingEntity[];
}

// cache() so a page's generateMetadata + render dedupe to one DB read per request.
export const getRanking = cache(async (group: string, type: string): Promise<RankingResult | null> => {
  const supabase = createServiceRoleClient();

  const { data: question } = await supabase
    .from('duel_questions')
    .select('id, prompt, entity_kind, group_slug, question_type, min_votes')
    .eq('group_slug', group)
    .eq('question_type', type)
    .maybeSingle();

  if (!question) return null;

  const { data: ratings } = await supabase
    .from('duel_ratings')
    .select('entity_id, entity_name, entity_image, elo, wins, losses')
    .eq('question_id', question.id)
    // entity_id is a deterministic tiebreak so tied Elo never reorders the list
    // (keeps the ranking + the date-seeded Game-of-the-day pick stable).
    .order('elo', { ascending: false })
    .order('entity_id', { ascending: true });

  const { count } = await supabase
    .from('duel_votes')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', question.id);

  const total = count ?? 0;

  return {
    question: {
      id: question.id as string,
      prompt: question.prompt as string,
      entity_kind: question.entity_kind as string,
      group_slug: question.group_slug as string,
      question_type: question.question_type as string,
      min_votes: question.min_votes as number,
    },
    total_votes: total,
    public: total >= RANKING_UNLOCK_VOTES,
    provisional: total > 0 && total < RANKING_UNLOCK_VOTES,
    entities: (ratings ?? []).map((r, i) => ({
      rank: i + 1,
      entity_id: r.entity_id as string,
      name: r.entity_name as string,
      image: (r.entity_image as string | null) ?? null,
      elo: r.elo as number,
      wins: r.wins as number,
      losses: r.losses as number,
    })),
  };
});

export interface RankingIndexItem {
  group_slug: string;
  question_type: string;
  prompt: string;
  entity_kind: string;
  total_votes: number;
  min_votes: number;
  public: boolean;
  provisional: boolean;
  top_entity: { name: string; image: string | null; elo: number } | null;
}

export const getRankingsIndex = cache(async (): Promise<RankingIndexItem[]> => {
  const supabase = createServiceRoleClient();

  const [{ data: questions }, { data: ratings }] = await Promise.all([
    supabase
      .from('duel_questions')
      .select('id, group_slug, question_type, prompt, entity_kind, min_votes'),
    supabase
      .from('duel_ratings')
      .select('question_id, entity_name, entity_image, elo')
      .order('elo', { ascending: false })
      .order('entity_id', { ascending: true }),
  ]);

  // Accurate per-question vote counts. The old single `.select('question_id')`
  // was capped at 1000 rows by PostgREST, so once total votes exceeded 1000 most
  // questions were undercounted to ~0 and wrongly showed as locked. Use an exact
  // head count per question (matches getRanking); cache() + ISR make it cheap.
  const voteEntries = await Promise.all(
    (questions ?? []).map(async (q) => {
      const { count } = await supabase
        .from('duel_votes')
        .select('id', { count: 'exact', head: true })
        .eq('question_id', q.id as string);
      return [q.id as string, count ?? 0] as const;
    }),
  );
  const voteCounts = new Map<string, number>(voteEntries);

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

  return (questions ?? []).map((q) => {
    const total = voteCounts.get(q.id as string) ?? 0;
    return {
      group_slug: q.group_slug as string,
      question_type: q.question_type as string,
      prompt: q.prompt as string,
      entity_kind: q.entity_kind as string,
      total_votes: total,
      min_votes: q.min_votes as number,
      public: total >= RANKING_UNLOCK_VOTES,
      provisional: total > 0 && total < RANKING_UNLOCK_VOTES,
      top_entity: topEntity.get(q.id as string) ?? null,
    };
  });
});
