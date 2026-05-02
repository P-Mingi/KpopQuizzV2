import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  const [repostsRes, originalsRes] = await Promise.all([
    db.from('pinterest_scraped').select('id', { count: 'exact', head: true }).eq('status', 'processed'),
    db.from('pinterest_originals').select('id', { count: 'exact', head: true }).eq('status', 'generated'),
  ]);

  return NextResponse.json({
    reposts: repostsRes.count ?? 0,
    originals: originalsRes.count ?? 0,
  });
}
