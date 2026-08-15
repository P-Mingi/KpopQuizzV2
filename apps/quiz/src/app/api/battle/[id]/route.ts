import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getLevelInfo } from '@/lib/constants';

import type { NextRequest } from 'next/server';

type ProfileRow = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string | null;
  avatar_text: string | null;
  avatar_kind: string | null;
  avatar_ref: string | null;
  xp: number | null;
  bias: string | null;
  battles_played: number | null;
  battles_won: number | null;
  name_accent: string | null;
};

/** What the accept screen needs to show a real person instead of a hash. */
export type ChallengerProfile = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarBg: string | null;
  avatarText: string | null;
  avatarKind: string | null;
  avatarRef: string | null;
  level: number;
  bias: string | null;
  battlesPlayed: number;
  battlesWon: number;
  nameAccent: string | null;
};

// E5 - load a battle so a challenged FRIEND can play the challenger's exact 7
// questions and see the real head-to-head (not a random ghost). Returns the
// snapshot questions + the challenger's finished run (score + per_question).
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: battle } = await supabase
    .from('battles')
    .select('id, quiz_id, group_slug, questions, challenger_hash, challenger_score')
    .eq('id', id)
    .maybeSingle();

  if (!battle || !battle.questions) {
    return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  }

  // The challenger's originating run (for the real head-to-head). Null if they
  // somehow have not finished yet - the client then falls back to a ghost.
  let challenger: {
    score: number;
    per_question: boolean[];
    handle: string;
    profile: ChallengerProfile | null;
  } | null = null;

  if (battle.challenger_score !== null) {
    const { data: cr } = await supabase
      .from('battle_results')
      .select('score, per_question, user_id')
      .eq('battle_id', id)
      .eq('player_hash', battle.challenger_hash)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // W2: a real face when the challenger was signed in. Anon challengers are the
    // common case (94% of battle results), so this degrades to the @fan_XXXX handle
    // rather than inventing an identity. profiles has no FK to battle_results
    // (both point at auth.users), so this is a second keyed read, not an embed.
    let profile: ChallengerProfile | null = null;
    const challengerUserId = (cr?.user_id as string | null) ?? null;
    if (challengerUserId) {
      const { data: p } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, avatar_bg, avatar_text, avatar_kind, avatar_ref, xp, bias, battles_played, battles_won, name_accent')
        .eq('id', challengerUserId)
        .maybeSingle<ProfileRow>();
      if (p) {
        profile = {
          username: p.username,
          displayName: p.display_name ?? p.username,
          avatarUrl: p.avatar_url,
          avatarBg: p.avatar_bg,
          avatarText: p.avatar_text,
          avatarKind: p.avatar_kind,
          avatarRef: p.avatar_ref,
          level: getLevelInfo(p.xp ?? 0).level,
          bias: p.bias,
          battlesPlayed: p.battles_played ?? 0,
          battlesWon: p.battles_won ?? 0,
          nameAccent: p.name_accent,
        };
      }
    }

    challenger = {
      score: battle.challenger_score as number,
      per_question: (cr?.per_question as boolean[]) ?? [],
      handle: profile ? `@${profile.username}` : `@fan_${(battle.challenger_hash as string).slice(-4)}`,
      profile,
    };
  }

  // The real stake, for honest copy on the accept screen.
  let quizTitle: string | null = null;
  if (battle.quiz_id) {
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('title')
      .eq('id', battle.quiz_id as string)
      .maybeSingle<{ title: string }>();
    quizTitle = quiz?.title ?? null;
  }

  return NextResponse.json({
    battleId: battle.id,
    questions: battle.questions,
    challenger,
    quizId: battle.quiz_id,
    quizTitle,
    groupSlug: battle.group_slug,
  });
}
