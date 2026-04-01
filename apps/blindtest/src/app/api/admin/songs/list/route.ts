import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const page = parseInt(params.get('page') ?? '1');
  const limit = parseInt(params.get('limit') ?? '50');
  const search = params.get('search');
  const gender = params.get('gender');
  const generation = params.get('generation');
  const status = params.get('status');

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const adminDb = createServiceRoleClient();
  let query = adminDb
    .from('songs')
    .select('*', { count: 'exact' })
    .order('artist_name', { ascending: true })
    .order('title', { ascending: true })
    .range(from, to);

  if (search) {
    query = query.or(`title.ilike.%${search}%,artist_name.ilike.%${search}%`);
  }
  if (gender) query = query.eq('gender', gender);
  if (generation) query = query.eq('generation', generation);
  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ songs: data, total: count, page, limit });
}
