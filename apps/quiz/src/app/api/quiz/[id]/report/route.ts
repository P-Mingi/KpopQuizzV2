import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

const VALID_REASONS = ['wrong_answers', 'spam', 'inappropriate', 'duplicate', 'other'] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { reason, details } = body as Record<string, unknown>;

  if (typeof reason !== 'string' || !VALID_REASONS.includes(reason as typeof VALID_REASONS[number])) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
  }

  if (details !== undefined && typeof details !== 'string') {
    return NextResponse.json({ error: 'Details must be a string' }, { status: 400 });
  }

  if (typeof details === 'string' && details.length > 500) {
    return NextResponse.json({ error: 'Details must be 500 characters or less' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('reports').insert({
    quiz_id: id,
    reporter_id: user?.id ?? null,
    reason,
    details: typeof details === 'string' ? details.trim() : '',
  });

  if (error) {
    console.error('Failed to create report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
