import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// POST /api/debate/report  { vote_id: uuid, reason: string }
// Reports a debate comment through the SAME reports table as quiz reports (mig
// 108 added the debate_vote_id target). Reuses the shared admin report queue.
const VALID_REASONS = ['spam', 'inappropriate', 'other'] as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { vote_id, reason } = (body ?? {}) as { vote_id?: unknown; reason?: unknown };
  if (typeof vote_id !== 'string' || vote_id.length < 10) {
    return NextResponse.json({ error: 'bad_vote_id' }, { status: 400 });
  }
  if (typeof reason !== 'string' || !VALID_REASONS.includes(reason as typeof VALID_REASONS[number])) {
    return NextResponse.json({ error: 'bad_reason' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { error } = await supabase.from('reports').insert({
    debate_vote_id: vote_id,
    reporter_id: user.id,
    reason,
    details: '',
  });
  if (error) {
    console.error('[debate/report]', error.message);
    return NextResponse.json({ error: 'report_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
