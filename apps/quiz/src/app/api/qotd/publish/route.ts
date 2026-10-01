import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { isCronAuthorized } from '@/lib/cron-auth';
import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { qotdRotationFixEnabled } from '@/lib/quiz-bank-scheduling';
import { rotateQotd, supabaseQotdStore } from '@/lib/ux-v1/p1/qotd-rotation';

import type { NextRequest } from 'next/server';

// Manual admin trigger. The daily publish runs from the Vercel cron
// /api/cron/ensure-daily-quiz (00:05 UTC), not on a home render. With the server
// env switch QOTD_ROTATION_FIX=1, a date with no bank row is filled the same way
// the cron does it (lib/ux-v1/p1/qotd-rotation.ts); switch OFF (the default) this
// route behaves exactly as before.
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Bearer CRON_SECRET, or a signed-in admin (a cron header alone is not a credential).
  if (!isCronAuthorized(req)) {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
      const result = await rotateQotd(supabaseQotdStore(supabase), today);
      if (!result.quizId) {
        return NextResponse.json({ error: result.reason ?? 'No quiz available for this date' }, { status: 404 });
      }
      return NextResponse.json({ success: true, quiz_id: result.quizId, date: today, method: result.method });
    } catch (err) {
      console.error('[qotd/publish]', err);
      return NextResponse.json({ error: err instanceof Error ? err.message : 'publish failed' }, { status: 500 });
    }
  }

  const { data: quizId, error } = await supabase.rpc('ensure_daily_quiz', { p_date: today });

  if (error) {
    console.error('[qotd/publish]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!quizId) {
    return NextResponse.json({ error: 'No quiz scheduled for today' }, { status: 404 });
  }

  return NextResponse.json({ success: true, quiz_id: quizId, date: today });
}
