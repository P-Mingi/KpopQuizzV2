import { createServiceRoleClient } from '@/lib/supabase/server';
import { RANKING_UNLOCK_VOTES } from '@/lib/db/queries/duels';
import { DuelGame, type QuestionItem } from '@/components/duel/duel-game';

import type { Metadata } from 'next';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'This or That - K-pop Fan Rankings | KpopQuiz',
  description:
    'Vote in head-to-head K-pop matchups and watch the live fan ranking reorder in real time. Pick your bias, your favorite song, the best group. Tap and go.',
  alternates: { canonical: '/games/this-or-that' },
};

interface RankRow {
  question_id: string;
  entity_id: string;
  entity_name: string;
  entity_image: string | null;
  elo: number;
}

// Group-specific matchups first (recognizable), then the cross-group buckets.
function pickerOrder(a: QuestionItem, b: QuestionItem): number {
  const ga = a.group_slug === 'general' ? 1 : 0;
  const gb = b.group_slug === 'general' ? 1 : 0;
  if (ga !== gb) return ga - gb;
  if (a.group_slug !== b.group_slug) return a.group_slug.localeCompare(b.group_slug);
  return a.question_type.localeCompare(b.question_type);
}

export default async function ThisOrThatPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; type?: string }>;
}): Promise<React.ReactElement> {
  const sp = await searchParams;
  const supabase = createServiceRoleClient();

  const [{ data: questionRows }, { data: ratingRows }] = await Promise.all([
    supabase
      .from('duel_questions')
      .select('id, group_slug, question_type, prompt, entity_kind, min_votes'),
    supabase
      .from('duel_ratings')
      .select('question_id, entity_id, entity_name, entity_image, elo')
      .order('elo', { ascending: false }),
  ]);

  // Exact per-question vote counts (a single duel_votes select is capped at 1000
  // rows and undercounts once total votes exceed that; see getRankingsIndex).
  const voteEntries = await Promise.all(
    (questionRows ?? []).map(async (q) => {
      const { count } = await supabase
        .from('duel_votes')
        .select('id', { count: 'exact', head: true })
        .eq('question_id', q.id as string);
      return [q.id as string, count ?? 0] as const;
    }),
  );
  const voteCounts = new Map<string, number>(voteEntries);

  const questions: QuestionItem[] = (questionRows ?? [])
    .map((q) => {
      const total = voteCounts.get(q.id as string) ?? 0;
      return {
        group_slug: q.group_slug as string,
        question_type: q.question_type as string,
        prompt: q.prompt as string,
        entity_kind: q.entity_kind as string,
        total_votes: total,
        public: total >= RANKING_UNLOCK_VOTES,
      };
    })
    .sort(pickerOrder);

  if (questions.length === 0) {
    return <div className="duel-wrap"><p className="duel-meta">No matchups yet. Check back soon.</p></div>;
  }

  // Default to a recognizable group matchup (bts members) when present.
  const idByKey = new Map<string, string>();
  for (const q of questionRows ?? []) {
    idByKey.set(`${q.group_slug}:${q.question_type}`, q.id as string);
  }
  // Loop-back from a ranking page (?group=&type=) preselects that matchup.
  const requested =
    sp.group && sp.type
      ? questions.find((q) => q.group_slug === sp.group && q.question_type === sp.type)
      : undefined;
  const def =
    requested ??
    questions.find((q) => q.group_slug === 'bts' && q.question_type === 'members') ??
    questions[0]!;
  const defKey = `${def.group_slug}:${def.question_type}`;
  const defId = idByKey.get(defKey)!;

  const initialRanking = ((ratingRows ?? []) as RankRow[])
    .filter((r) => r.question_id === defId)
    .map((r) => ({
      entity_id: r.entity_id,
      name: r.entity_name,
      image: r.entity_image,
      elo: r.elo,
    }));

  return (
    <DuelGame
      questions={questions}
      initialKey={defKey}
      initialPrompt={def.prompt}
      initialTotalVotes={def.total_votes}
      initialRanking={initialRanking}
    />
  );
}
