import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

// V-POLISH step 8 - the signed-in V-HOME strip's data: the viewer's joined
// spaces with role and XP. The ISR shell cannot personalize; this endpoint
// feeds the small client strip under the hero.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ spaces: [] });

  const svc = createServiceRoleClient();
  const { data: rows } = await svc.from('space_members')
    .select('group_id, role, contrib_xp')
    .eq('user_id', user.id).eq('status', 'active').limit(12);
  const members = (rows ?? []) as { group_id: number; role: string; contrib_xp: number }[];
  if (!members.length) return NextResponse.json({ spaces: [] });

  const { data: groups } = await svc.from('groups')
    .select('id, slug, name, fandom_name').in('id', members.map((m) => m.group_id));
  const gBy = new Map(((groups ?? []) as { id: number; slug: string; name: string; fandom_name: string }[]).map((g) => [g.id, g]));
  return NextResponse.json({
    spaces: members.flatMap((m) => {
      const g = gBy.get(m.group_id);
      return g ? [{ slug: g.slug, name: g.name, fandom: g.fandom_name, role: m.role, xp: m.contrib_xp }] : [];
    }),
  });
}
