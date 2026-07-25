import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// Workstream P: log one completed personality run. Powers the real "N fans got
// {member}" counts. Signed-in users are capped to one saved row per group per
// UTC day by the DB unique index (a conflict is a silent no-op); anon runs are
// deduped client-side (localStorage, one per device per day) and inserted with
// no user_id. Validates the member actually belongs to the group first.
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { group_id?: unknown; member_name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const groupId = typeof body.group_id === 'number' ? body.group_id : Number(body.group_id);
  const memberName = typeof body.member_name === 'string' ? body.member_name.trim() : '';
  if (!Number.isInteger(groupId) || !memberName) {
    return NextResponse.json({ error: 'group_id and member_name required' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  // The member must be a real active profile for this group (no arbitrary rows).
  const { data: prof } = await admin
    .from('personality_profiles')
    .select('id')
    .eq('group_id', groupId)
    .eq('member_name', memberName)
    .eq('active', true)
    .maybeSingle();
  if (!prof) {
    return NextResponse.json({ error: 'Unknown member for group' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Session client so the RLS insert policy stamps the real auth.uid(). The
    // daily unique index makes a repeat run today a harmless conflict.
    const { error } = await supabase
      .from('personality_results')
      .insert({ group_id: groupId, member_name: memberName, user_id: user.id });
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: 'Could not save result' }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from('personality_results')
      .insert({ group_id: groupId, member_name: memberName, user_id: null });
    if (error) {
      return NextResponse.json({ error: 'Could not save result' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
