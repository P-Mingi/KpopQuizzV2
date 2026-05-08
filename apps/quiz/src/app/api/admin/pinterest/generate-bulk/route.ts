import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function POST(req: Request): Promise<NextResponse> {
  const { mode } = await req.json() as { mode: 'all_missing' | 'recent_only' | 'all' };
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  // Pick quizzes
  let query = db.from('quizzes').select('id, created_at').eq('status', 'published');
  if (mode === 'recent_only') {
    query = query.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
  }
  const { data: quizzes } = await query;
  if (!quizzes || quizzes.length === 0) {
    return NextResponse.json({ ok: true, generated: 0, failed: 0, total_jobs: 0 });
  }

  // Find which cards already exist
  const { data: existingCards } = await db
    .from('quiz_pinterest_cards')
    .select('quiz_id, variant')
    .in('quiz_id', quizzes.map(q => q.id))
    .eq('generation_status', 'ready');

  const existing = new Set((existingCards ?? []).map(c => `${c.quiz_id}:${c.variant}`));

  const variants = ['editorial', 'neon', 'y2k'] as const;
  const jobs: { quizId: string; variant: string }[] = [];
  for (const quiz of quizzes) {
    for (const variant of variants) {
      if (mode === 'all' || !existing.has(`${quiz.id}:${variant}`)) {
        jobs.push({ quizId: quiz.id, variant });
      }
    }
  }

  // Generate sequentially to avoid overwhelming the OG endpoint
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';
  let success = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      const res = await fetch(`${baseUrl}/api/admin/pinterest/generate-card`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: req.headers.get('cookie') || '',
        },
        body: JSON.stringify(job),
      });
      if (res.ok) success++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, generated: success, failed, total_jobs: jobs.length });
}
