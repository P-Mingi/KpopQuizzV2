import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';

import type { NextRequest } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

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

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
