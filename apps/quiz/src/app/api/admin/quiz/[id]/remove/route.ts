import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminDb = createServiceRoleClient();

  const { error: quizError } = await adminDb
    .from('quizzes')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (quizError) {
    return NextResponse.json({ error: 'Failed to remove quiz' }, { status: 500 });
  }

  await adminDb
    .from('reports')
    .update({ status: 'resolved' })
    .eq('quiz_id', id)
    .eq('status', 'pending');

  return NextResponse.json({ success: true });
}
