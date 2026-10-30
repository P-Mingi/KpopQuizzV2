import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';
import { forSite, withSite } from '@/lib/site/scope';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { quiz_id, date } = body as Record<string, unknown>;

  if (typeof quiz_id !== 'string' || typeof date !== 'string') {
    return NextResponse.json({ error: 'quiz_id and date are required' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Clear any existing QOTD for that date (this site's: one quiz of the day per site and date)
  await forSite(adminDb
    .from('quizzes')
    .update({ is_quiz_of_the_day: false, quiz_of_the_day_date: null }))
    .eq('quiz_of_the_day_date', date);

  // Set the new one
  const { error } = await forSite(adminDb
    .from('quizzes')
    .update({ is_quiz_of_the_day: true, quiz_of_the_day_date: date }))
    .eq('id', quiz_id);

  if (error) {
    return NextResponse.json({ error: 'Failed to set QOTD' }, { status: 500 });
  }

  // Log to qotd_log
  await adminDb.from('qotd_log').upsert(
    withSite({
      quiz_id,
      featured_date: date,
      selection_method: 'manual',
      score: null,
    }),
    { onConflict: 'site_id,featured_date' },
  );

  return NextResponse.json({ success: true });
}
