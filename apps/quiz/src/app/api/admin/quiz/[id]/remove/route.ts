import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { forSite } from '@/lib/site/scope';

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

  // Run O1: only a quiz of the build's site (a no-op on kpop with SITE_SCOPE off).
  const { error: quizError } = await forSite(adminDb
    .from('quizzes')
    .update({ status: 'removed', updated_at: new Date().toISOString() }))
    .eq('id', id);

  if (quizError) {
    return NextResponse.json({ error: 'Failed to remove quiz' }, { status: 500 });
  }

  await forSite(adminDb
    .from('reports')
    .update({ status: 'resolved' }))
    .eq('quiz_id', id)
    .eq('status', 'pending');

  return NextResponse.json({ success: true });
}
