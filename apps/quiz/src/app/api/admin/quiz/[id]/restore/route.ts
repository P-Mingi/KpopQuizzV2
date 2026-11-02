import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { forSite } from '@/lib/site/scope';

import type { NextRequest } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const adminDb = createServiceRoleClient();

  // Run O1: only a quiz of the build's site (a no-op on kpop with SITE_SCOPE off).
  const { error } = await forSite(adminDb
    .from('quizzes')
    .update({ status: 'published', report_count: 0, updated_at: new Date().toISOString() }))
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to restore quiz' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
