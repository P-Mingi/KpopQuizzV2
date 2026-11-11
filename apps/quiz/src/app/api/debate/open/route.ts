import { NextResponse } from 'next/server';

import { SITE } from '@/lib/site/registry';
import { createPublicReadClient, createServerClient } from '@/lib/supabase/server';

// GET /api/debate/open -> today's open debate and whether the viewer voted it, for the debate block under a quiz
// result. Read only (never ensure_daily_debate, which writes). { signedIn, voted, debate }.
// The debate tables have no site_id: they are the K-pop debate, so any other site answers `debate: null`.
// A guest gets today's debate too ({ signedIn: false, voted: false, debate }): the block offers them a sign-in to vote.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const none = (signedIn: boolean) => NextResponse.json({ signedIn, voted: false, debate: null }, { headers: NO_STORE });

export async function GET(): Promise<NextResponse> {
  if (SITE.id !== 'kpop') return none(false);
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // cast_debate_vote only takes today's debate (UTC day): so only today's is open
  const today = new Date().toISOString().slice(0, 10);
  const db = createPublicReadClient();
  const { data: dd } = await db.from('daily_debates').select('date, question_id').eq('date', today).maybeSingle();
  if (!dd) return none(Boolean(user));
  const { data: q } = await db.from('debate_questions').select('question, side_a, side_b').eq('id', (dd as { question_id: string }).question_id).maybeSingle();
  const row = q as { question: string; side_a: string; side_b: string } | null;
  if (!row || !row.question.trim()) return none(Boolean(user));

  const { data: mine } = user ? await supabase.from('debate_votes').select('side').eq('date', today).eq('user_id', user.id).maybeSingle() : { data: null };
  return NextResponse.json({
    signedIn: Boolean(user),
    voted: Boolean(mine),
    debate: { date: today, question: row.question.trim(), sideA: row.side_a, sideB: row.side_b },
  }, { headers: NO_STORE });
}
