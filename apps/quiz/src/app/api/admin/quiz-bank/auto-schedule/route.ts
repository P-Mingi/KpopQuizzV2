import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { autoSchedule } from '@/lib/quiz-bank-scheduling';

import type { NextRequest } from 'next/server';
import type { QuizBankEntry } from '@/lib/quiz-bank-scheduling';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    // body is optional
  }

  // Start date defaults to tomorrow
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const startDate = typeof body.start_date === 'string'
    ? body.start_date
    : tomorrow.toISOString().split('T')[0]!;

  const adminDb = createServiceRoleClient();

  const { data: all, error } = await adminDb
    .from('quiz_bank')
    .select('*')
    .neq('status', 'published');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const force = body.force === true;

  const entries = (all ?? []) as QuizBankEntry[];

  // In force mode, reschedule everything (including already-scheduled quizzes).
  // Published quizzes are never touched.
  const unscheduled = force
    ? entries.filter((q) => q.status !== 'published')
    : entries.filter((q) => !q.scheduled_date && (q.status === 'verified' || q.status === 'scheduled'));
  const existing = force
    ? []  // treat as clean slate
    : entries.filter((q) => q.scheduled_date);

  const assignments = autoSchedule(unscheduled, existing, startDate);

  if (assignments.size === 0) {
    return NextResponse.json({ scheduled: 0, message: 'No unscheduled verified quizzes to schedule' });
  }

  // Apply assignments in bulk
  const updates = [...assignments.entries()].map(([id, date]) =>
    adminDb
      .from('quiz_bank')
      .update({ scheduled_date: date, status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('id', id),
  );

  await Promise.all(updates);

  return NextResponse.json({ scheduled: assignments.size, assignments: Object.fromEntries(assignments) });
}
