import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * GET /api/duels/next?group={slug}&type={type}
 *
 * Resolves the active duel_question for (group_slug, question_type) and returns
 * the next matchup. Selection bias (Section 3a): pick one entity weighted toward
 * LOW prior coverage (fewer wins+losses = under-shown), then pair it with one of
 * the few nearest-Elo entities (close = more informative + more fun). Reads the
 * public questions + ratings tables via the anon client.
 */
export const dynamic = 'force-dynamic';

interface Entity {
  entity_id: string;
  entity_name: string;
  entity_image: string | null;
  elo: number;
  wins: number;
  losses: number;
}

function toOption(e: Entity) {
  return { entity_id: e.entity_id, name: e.entity_name, image: e.entity_image, elo: e.elo };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const group = searchParams.get('group');
  const type = searchParams.get('type');

  if (!group || !type) {
    return NextResponse.json({ error: 'group and type are required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data: question } = await supabase
    .from('duel_questions')
    .select('id, prompt, entity_kind')
    .eq('group_slug', group)
    .eq('question_type', type)
    .eq('is_active', true)
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ error: 'No active duel for that group/type' }, { status: 404 });
  }

  const { data: ratings } = await supabase
    .from('duel_ratings')
    .select('entity_id, entity_name, entity_image, elo, wins, losses')
    .eq('question_id', question.id);

  const entities = (ratings ?? []) as Entity[];
  if (entities.length < 2) {
    return NextResponse.json({ error: 'Not enough entities for a matchup' }, { status: 404 });
  }

  // Weighted pick toward low coverage (wins + losses).
  const weights = entities.map((e) => 1 / (1 + e.wins + e.losses));
  const totalW = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * totalW;
  let aIdx = 0;
  for (let i = 0; i < entities.length; i += 1) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) {
      aIdx = i;
      break;
    }
  }
  const a = entities[aIdx]!;

  // Pair with one of the nearest-Elo entities (a little variety, still close).
  const nearest = entities
    .filter((_, i) => i !== aIdx)
    .sort((x, y) => Math.abs(x.elo - a.elo) - Math.abs(y.elo - a.elo));
  const pool = nearest.slice(0, Math.min(4, nearest.length));
  const b = pool[Math.floor(Math.random() * pool.length)]!;

  // Randomize display side so position carries no bias.
  const [left, right] = Math.random() < 0.5 ? [a, b] : [b, a];

  return NextResponse.json({
    question: { id: question.id, prompt: question.prompt, entity_kind: question.entity_kind },
    a: toOption(left),
    b: toOption(right),
  });
}
