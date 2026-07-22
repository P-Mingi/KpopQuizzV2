import { createServiceRoleClient } from '@/lib/supabase/server';

import type { PersonCardData } from '@/components/profile/person-card';

// Daily Debate read path (Workstream F2b, B3). Mirrors getQuizOfTheDay: uses the
// service-role client to ensure today's debate exists (idempotent RPC, no cron),
// then reads the question, the live split, and the top comments per side.
//
// Baked at ISR from the leaderboard page. The split is a starting snapshot; the
// voter's own vote gets fresh counts back from cast_debate_vote, and the island
// updates optimistically, so a few minutes of staleness on the baked number is
// fine (same honesty stance as cheer counts).

const PROFILE_COLS =
  'id, username, display_name, avatar_url, avatar_bg, avatar_text, xp, follower_count, name_accent, name_font, bias, pinned_badge_id, avatar_kind, avatar_ref';

interface ProfileRow {
  id: string; username: string; display_name: string | null;
  avatar_url: string | null; avatar_bg: string; avatar_text: string;
  xp: number; follower_count: number;
  name_accent: string | null; name_font: string | null; bias: string | null;
  pinned_badge_id: string | null; avatar_kind: string | null; avatar_ref: string | null;
}

function toPerson(p: ProfileRow): PersonCardData {
  return {
    username: p.username, displayName: p.display_name,
    avatarUrl: p.avatar_url, avatarBg: p.avatar_bg, avatarText: p.avatar_text,
    xp: p.xp ?? 0, followerCount: p.follower_count ?? 0,
    nameAccent: p.name_accent, nameFont: p.name_font, bias: p.bias,
    pinnedBadgeId: p.pinned_badge_id,
    avatarKind: (p.avatar_kind as PersonCardData['avatarKind']) ?? 'photo', avatarRef: p.avatar_ref,
  };
}

export interface DebateComment {
  voteId: string;
  person: PersonCardData;
  comment: string;
}

export interface DailyDebate {
  date: string;
  question: string;
  sideA: string;
  sideB: string;
  votesA: number;
  votesB: number;
  /** Up to CAP recent comments per side; the island shows 5 then expands inline. */
  commentsA: DebateComment[];
  commentsB: DebateComment[];
  totalCommentsA: number;
  totalCommentsB: number;
}

// How many comments per side we bake. The island reveals 5 at a time. A daily
// debate does not accrue more than this in a day at current scale; if it ever
// does, the older ones simply are not shown (never fabricated).
const CAP = 25;

export async function getDailyDebate(): Promise<DailyDebate | null> {
  const db = createServiceRoleClient();

  // Ensure today's debate exists (idempotent). Returns null when the bank is
  // empty, in which case there is no debate and the card hides.
  const { data: ensured } = await db.rpc('ensure_daily_debate');
  const today = (ensured as string | null) ?? null;
  if (!today) return null;

  const { data: dd } = await db
    .from('daily_debates')
    .select('date, question_id')
    .eq('date', today)
    .maybeSingle();
  if (!dd) return null;

  const { data: q } = await db
    .from('debate_questions')
    .select('question, side_a, side_b')
    .eq('id', (dd as { question_id: string }).question_id)
    .maybeSingle();
  if (!q) return null;
  const question = q as { question: string; side_a: string; side_b: string };

  const { data: voteRows } = await db
    .from('debate_votes')
    .select('id, user_id, side, comment, created_at')
    .eq('date', today)
    .order('created_at', { ascending: false });
  const votes = (voteRows ?? []) as Array<{
    id: string; user_id: string; side: 'a' | 'b'; comment: string | null; created_at: string;
  }>;

  let votesA = 0;
  let votesB = 0;
  const commentedA: typeof votes = [];
  const commentedB: typeof votes = [];
  for (const v of votes) {
    if (v.side === 'a') votesA++; else votesB++;
    if (v.comment && v.comment.trim()) {
      (v.side === 'a' ? commentedA : commentedB).push(v);
    }
  }

  // Resolve the commenters' profiles in one IN read (user_id references
  // auth.users, so it cannot be embedded via PostgREST).
  const commenterIds = [...new Set([...commentedA, ...commentedB].map((v) => v.user_id))];
  const profById = new Map<string, ProfileRow>();
  if (commenterIds.length > 0) {
    const { data: profs } = await db.from('profiles').select(PROFILE_COLS).in('id', commenterIds);
    for (const p of (profs ?? []) as ProfileRow[]) profById.set(p.id, p);
  }

  const toComments = (rows: typeof votes): DebateComment[] =>
    rows
      .map((v) => {
        const p = profById.get(v.user_id);
        return p ? { voteId: v.id, person: toPerson(p), comment: v.comment!.trim() } : null;
      })
      .filter((c): c is DebateComment => c !== null);

  const allA = toComments(commentedA);
  const allB = toComments(commentedB);

  return {
    date: today,
    question: question.question,
    sideA: question.side_a,
    sideB: question.side_b,
    votesA,
    votesB,
    commentsA: allA.slice(0, CAP),
    commentsB: allB.slice(0, CAP),
    totalCommentsA: allA.length,
    totalCommentsB: allB.length,
  };
}
