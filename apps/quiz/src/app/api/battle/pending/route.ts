import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// E6 - fetch a couple of pending questions for the "help confirm" surface.
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('pending_questions')
    .select('id, question, options, correct_index')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  const pool = data ?? [];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return NextResponse.json({ questions: pool.slice(0, 2) });
}
