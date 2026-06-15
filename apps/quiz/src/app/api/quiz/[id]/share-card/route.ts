import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// H6: persist the share-card customizer config on the quiz. Creator-only.
const OVERLAYS = ['dark-bottom', 'full-dark', 'brand', 'purple'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  // Sanitize - only persist the four known fields, clamped/capped.
  const share_card = {
    overlay: OVERLAYS.includes(input.overlay as string) ? (input.overlay as string) : 'dark-bottom',
    opacity: Math.min(100, Math.max(0, Number.isFinite(Number(input.opacity)) ? Math.round(Number(input.opacity)) : 40)),
    hook: typeof input.hook === 'string' ? input.hook.trim().slice(0, 60) : '',
    title: typeof input.title === 'string' ? input.title.trim().slice(0, 120) : '',
  };

  // Creator-only: update is scoped to the signed-in user's own quiz.
  const { data, error } = await supabase
    .from('quizzes')
    .update({ share_card })
    .eq('id', id)
    .eq('creator_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to save', detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found or not yours' }, { status: 403 });
  }

  return NextResponse.json({ success: true, share_card });
}
