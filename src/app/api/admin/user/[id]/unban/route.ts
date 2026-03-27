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

  const { error: unbanError } = await adminDb
    .from('profiles')
    .update({ banned_at: null })
    .eq('id', id);

  if (unbanError) {
    return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 });
  }

  await adminDb
    .from('quizzes')
    .update({ status: 'published' })
    .eq('creator_id', id)
    .eq('status', 'removed');

  return NextResponse.json({ success: true });
}
