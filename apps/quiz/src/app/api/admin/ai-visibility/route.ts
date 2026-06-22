import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { platform, query, mentioned, position, snippet, notes, checked_by } =
    body;

  if (!platform || !query || typeof mentioned !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.from('ai_visibility_checks').insert({
    platform,
    query,
    mentioned,
    position: position ?? null,
    snippet: snippet ?? null,
    notes: notes ?? null,
    checked_by: checked_by ?? user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
