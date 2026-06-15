import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';

import type { NextRequest } from 'next/server';

// E6 - crowd-confirm loop for fan-submitted battle questions.
// POST { questionId, action: 'confirm' | 'flag' }
//  - confirm -> confirms++; promote to 'live' at CONFIRM_THRESHOLD with a healthy
//    confirm:flag ratio. On promotion, award the signed-in author +20 XP (once).
//  - flag -> flags++; kill at KILL_FLAGS.
// Service-role only (clients never write pending_questions counters directly).
// L6 - per-user dedup: each voter (signed-in user OR anon ip+day hash) can
// confirm at most once and flag at most once per pending_question. Enforced by
// inserting into pending_question_votes with a unique (question, voter, action)
// primary key; a duplicate is treated as a no-op.
export const dynamic = 'force-dynamic';

const CONFIRM_THRESHOLD = 15;
const KILL_FLAGS = 5;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { questionId?: unknown; action?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const questionId = typeof body.questionId === 'string' ? body.questionId : '';
  const action = body.action === 'confirm' || body.action === 'flag' ? body.action : null;
  if (!questionId || !action) {
    return NextResponse.json({ error: 'questionId and action (confirm|flag) required' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from('pending_questions')
    .select('id, confirms, flags, status, author_user_id')
    .eq('id', questionId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }
  // Already decided -> no-op (cannot confirm/flag a live/killed question).
  if (row.status !== 'pending') {
    return NextResponse.json({ status: row.status, confirms: row.confirms, flags: row.flags, promoted: false });
  }

  // L6 dedup: identify the voter (authed: 'user:<id>'; anon: sha256(ip+day))
  // and try to record the (question, voter, action) tuple. The PK rejects a 2nd
  // confirm or 2nd flag from the same voter on the same question -> no-op.
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  const voterHash = user ? 'user:' + user.id : anonHash(req);
  const { error: voteError } = await supabase
    .from('pending_question_votes')
    .insert({ question_id: questionId, voter_hash: voterHash, action });
  if (voteError) {
    // Unique-violation = already voted that action on this question.
    return NextResponse.json({
      status: row.status, confirms: row.confirms, flags: row.flags,
      promoted: false, already_voted: true,
    });
  }

  let confirms = row.confirms as number;
  let flags = row.flags as number;
  let status = 'pending';
  let promoted = false;

  if (action === 'confirm') {
    confirms += 1;
    if (confirms >= CONFIRM_THRESHOLD && confirms >= flags * 2) { status = 'live'; promoted = true; }
  } else {
    flags += 1;
    if (flags >= KILL_FLAGS) status = 'killed';
  }

  await supabase.from('pending_questions').update({ confirms, flags, status }).eq('id', questionId);

  // Promotion reward: the author (if signed in) earns +20 XP, exactly once.
  let authorXp = 0;
  if (promoted && row.author_user_id) {
    await supabase.rpc('award_xp', { p_user_id: row.author_user_id, p_amount: 20, p_reason: 'question_confirmed' });
    authorXp = 20;
  }

  return NextResponse.json({ status, confirms, flags, promoted, author_xp: authorXp });
}
