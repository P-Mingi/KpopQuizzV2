import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

/** PATCH: admin update any question fields */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Only allow updating safe fields
  const allowed: Record<string, unknown> = {};
  const safeKeys = [
    'prompt', 'text_content', 'image_url', 'answer', 'variants',
    'group_name', 'difficulty', 'tags', 'status', 'rejection_reason', 'moderator_notes',
  ];
  for (const key of safeKeys) {
    if (key in body) {
      allowed[key] = body[key];
    }
  }
  allowed['updated_at'] = new Date().toISOString();

  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from('battle_questions')
    .update(allowed)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/** DELETE: admin delete a question */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createServiceRoleClient();
  const { error } = await svc
    .from('battle_questions')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
