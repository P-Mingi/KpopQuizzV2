import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const adminDb = createServiceRoleClient();
  const { data, error } = await adminDb
    .from('quizzes')
    .select('*, groups(id, name, slug)')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  return NextResponse.json({ quiz: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === 'string') update.title = body.title;
  if (typeof body.difficulty === 'string') update.difficulty = body.difficulty;
  if (typeof body.status === 'string') update.status = body.status;

  // Manual cover override - when present in the body, always wins.
  // Pass null/empty string to clear the cover and fall back to auto.
  const hasManualCover = Object.prototype.hasOwnProperty.call(body, 'cover_image_url');
  if (hasManualCover) {
    const raw = body.cover_image_url;
    if (raw === null || (typeof raw === 'string' && raw.trim().length === 0)) {
      update.cover_image_url = null;
    } else if (typeof raw === 'string') {
      update.cover_image_url = raw.trim();
    }
  }

  // Update questions (JSONB column)
  if (Array.isArray(body.questions)) {
    update.questions = body.questions;
    update.question_count = body.questions.length;

    // Auto-update cover_image_url from first question - but only if the
    // admin didn't explicitly set or clear it in this PATCH.
    if (!hasManualCover) {
      const firstQ = body.questions[0] as Record<string, unknown> | undefined;
      if (firstQ) {
        if (typeof firstQ.image_url === 'string' && firstQ.image_url) {
          update.cover_image_url = firstQ.image_url;
        } else if (Array.isArray(firstQ.options)) {
          const firstOpt = firstQ.options[0] as Record<string, unknown> | undefined;
          if (firstOpt && typeof firstOpt.image_url === 'string' && firstOpt.image_url) {
            update.cover_image_url = firstOpt.image_url;
          }
        }
      }
    }
  }

  const { error } = await adminDb.from('quizzes').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
