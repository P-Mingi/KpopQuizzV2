import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  // Auth check
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Check admin (simple: check if user has admin-level profile)
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();
  const ADMINS = ['mingi', 'mingii', 'kpopquizz'];
  if (!profile || !ADMINS.includes(profile.username as string)) {
    return NextResponse.json({ error: 'Not admin' }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'Missing card id' }, { status: 400 });

  // Use service role to bypass RLS
  const adminDb = createServiceRoleClient();
  const { error } = await adminDb
    .from('dev_cards')
    .update(fields)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
