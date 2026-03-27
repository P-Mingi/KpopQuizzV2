import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  if (typeof input.reason !== 'string' || input.reason.trim().length === 0) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('game_reports')
    .insert({
      game_id: id,
      reporter_id: user?.id ?? null,
      reason: input.reason,
      details: typeof input.details === 'string' ? input.details.slice(0, 500) : null,
    });

  if (error) {
    console.error('Failed to create game report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }

  // Increment report count
  try {
    const { data: game } = await supabase.from('games').select('report_count').eq('id', id).single();
    const newCount = (game?.report_count ?? 0) + 1;
    await supabase.from('games').update({
      report_count: newCount,
      status: newCount >= 5 ? 'flagged' : undefined,
    }).eq('id', id);
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true });
}
