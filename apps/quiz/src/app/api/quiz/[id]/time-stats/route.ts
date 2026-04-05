import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: stats } = await supabase
    .from('quiz_time_stats')
    .select('score, total_questions, attempt_count, avg_time_seconds, fastest_time_seconds')
    .eq('quiz_id', id)
    .order('score', { ascending: false });

  return NextResponse.json({ stats: stats ?? [] });
}
