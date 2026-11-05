import { NextResponse } from 'next/server';

import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { adminSiteOf } from '@/lib/admin/site';
import { siteScope } from '@/lib/admin/site-scope';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const { supabase } = gate;

  // ADMIN-2: the members of the site the admin chose (world_memberships; a kpop member is a profile), so each section lists its own people.
  const siteResult = adminSiteOf(request);
  if (!siteResult.ok) return siteResult.res;
  const { scoped, site } = siteScope(siteResult.site);

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const limit = 20;
  const search = searchParams.get('search') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';

  let query = supabase
    .from('profiles')
    .select(scoped
      ? 'id, username, display_name, avatar_url, avatar_bg, avatar_text, xp, total_quizzes_created, total_plays_received, created_at, banned_at, world_memberships!inner(site_id)'
      : 'id, username, display_name, avatar_url, avatar_bg, avatar_text, xp, total_quizzes_created, total_plays_received, created_at, banned_at');
  if (scoped) query = query.eq('world_memberships.site_id', site);

  if (search) {
    query = query.ilike('username', `%${search}%`);
  }

  if (sort === 'most_plays') {
    query = query.order('total_plays_received', { ascending: false });
  } else if (sort === 'most_quizzes') {
    query = query.order('total_quizzes_created', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  // Get total count
  let countQuery = supabase.from('profiles').select(scoped ? 'id, world_memberships!inner(site_id)' : 'id', { count: 'exact', head: true });
  if (scoped) countQuery = countQuery.eq('world_memberships.site_id', site);
  if (search) {
    countQuery = countQuery.ilike('username', `%${search}%`);
  }
  const { count } = await countQuery;

  return NextResponse.json({ users: data ?? [], total: count ?? 0 });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const POST = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
