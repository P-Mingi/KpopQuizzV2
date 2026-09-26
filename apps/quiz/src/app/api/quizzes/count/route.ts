import { NextResponse } from 'next/server';

import { createPublicReadClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';

// UX v1 sidebar badge: the real published-quiz total (contract rule 3 - no
// invented numbers). Public, cookie-free, and slow-moving, so it is cached for an
// hour rather than counted per request. Fails soft to null (the badge then hides)
// so a DB blip never breaks the shell. UX v1 only: 404 with the flag off (flag off
// = today's site, which has no such endpoint; C2-001). No caller today.
export const revalidate = 3600;

export async function GET(): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const supabase = createPublicReadClient();
    const { count, error } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    if (error) throw error;
    return NextResponse.json(
      { count: count ?? 0 },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json({ count: null });
  }
}
