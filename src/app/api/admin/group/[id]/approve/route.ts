import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const groupId = parseInt(id, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  let updates: Record<string, unknown> = { needs_review: false };

  try {
    const body = await request.json();
    if (typeof body === 'object' && body !== null) {
      const allowed = ['name', 'slug', 'fandom_name', 'logo_url', 'display_color', 'text_color'];
      for (const key of allowed) {
        if (key in body && body[key] !== undefined) {
          updates[key] = body[key];
        }
      }
    }
  } catch {
    // No body provided, just approve
  }

  const { error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId);

  if (error) {
    console.error('Failed to approve group:', error);
    return NextResponse.json({ error: 'Failed to approve group' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
