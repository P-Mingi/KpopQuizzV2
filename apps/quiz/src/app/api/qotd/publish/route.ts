import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

// Manual admin trigger. The QOTD is also published automatically on first home page
// load of the day via the ensure_daily_quiz() DB function (no cron required).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  let isAdminUser = false;
  if (!isVercelCron && !isManualAuth) {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    isAdminUser = !!(user && isAdmin(user.id));
  }

  if (!isVercelCron && !isManualAuth && !isAdminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const dateParam = req.nextUrl.searchParams.get('date');
  const today = dateParam ?? new Date().toISOString().split('T')[0]!;

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
