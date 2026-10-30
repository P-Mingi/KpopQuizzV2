import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { isCronAuthorized } from '@/lib/cron-auth';
import { requireAdmin } from '@/lib/admin/guard';
import { ensureDailyQuizRpc } from '@/lib/daily-quiz';
import { SITE } from '@/lib/site/registry';
import { qotdRotationFixEnabled } from '@/lib/quiz-bank-scheduling';
import { rotateQotd, supabaseQotdStore } from '@/lib/ux-v1/p1/qotd-rotation';

import type { NextRequest } from 'next/server';

// Manual admin trigger. The daily publish runs from the Vercel cron
// /api/cron/ensure-daily-quiz (00:05 UTC), not on a home render. With the server
// env switch QOTD_ROTATION_FIX=1, a date with no bank row is filled the same way
// the cron does it (lib/ux-v1/p1/qotd-rotation.ts); switch OFF (the default) this
// route behaves exactly as before.
export async function GET(req: NextRequest): Promise<NextResponse> {
  // ADMIN-1: Bearer CRON_SECRET, or an admin that requireAdmin lets through (verified, listed, aal2); anyone else gets the admin 404.
  if (!isCronAuthorized(req)) {
    const gate = await requireAdmin('api');
    if (!gate.ok) return gate.res;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const dateParam = req.nextUrl.searchParams.get('date');
  const today = dateParam ?? new Date().toISOString().split('T')[0]!;

  if (qotdRotationFixEnabled()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }
    try {
      const result = await rotateQotd(supabaseQotdStore(supabase, SITE.id), today);
      if (!result.quizId) {
        return NextResponse.json({ error: result.reason ?? 'No quiz available for this date' }, { status: 404 });
      }
      return NextResponse.json({ success: true, quiz_id: result.quizId, date: today, method: result.method });
    } catch (err) {
      console.error('[qotd/publish]', err);
      return NextResponse.json({ error: err instanceof Error ? err.message : 'publish failed' }, { status: 500 });
    }
  }

  const { data: quizId, error } = await ensureDailyQuizRpc(supabase, today, SITE.id);

  if (error) {
    console.error('[qotd/publish]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!quizId) {
    return NextResponse.json({ error: 'No quiz scheduled for today' }, { status: 404 });
  }

  return NextResponse.json({ success: true, quiz_id: quizId, date: today });
}
