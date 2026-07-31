import { NextResponse } from 'next/server';

import { createServerClient, createPublicReadClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { canEditDirect, stageOf } from '@/lib/verse/stage';
import { getSpaceRole } from '@/lib/verse/roles';
import { getSpaceXp, CONTRIBUTOR_XP } from '@/lib/verse/reputation';

import type { NextRequest } from 'next/server';

// W3.2 / W4.3 - lightweight client check for the Edit affordance, so entity pages
// stay ISR/cookie-free while the edit button only appears for editors.
// V-ROLES step 2 (additive): the response now carries the viewer's TRUE state
// (role, xp, distance to contributor) so every affordance explains itself at
// contact with REAL numbers. Existing consumers keep reading canEdit unchanged.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const slug = new URL(req.url).searchParams.get('group');

  if (!user) return NextResponse.json({ canEdit: false, role: 'visitor', threshold: CONTRIBUTOR_XP });
  if (isAdmin(user.id)) return NextResponse.json({ canEdit: true, role: 'admin', threshold: CONTRIBUTOR_XP });

  if (!slug) return NextResponse.json({ canEdit: false, role: 'visitor', threshold: CONTRIBUTOR_XP });
  const { data: g } = await createPublicReadClient().from('groups').select('id').eq('slug', slug).maybeSingle();
  const groupId = (g as { id: number } | null)?.id ?? null;
  if (!groupId) return NextResponse.json({ canEdit: false, role: 'visitor', threshold: CONTRIBUTOR_XP });

  // owner (optional): a resource's author id. Authors edit their OWN resource
  // (the wiki edit route allows author or curator), so the affordance truth
  // includes it.
  const owner = new URL(req.url).searchParams.get('owner');
  const [direct, role, spaceXp, stage] = await Promise.all([
    canEditDirect(user.id, groupId),
    getSpaceRole(user.id, groupId),
    getSpaceXp(user.id, groupId),
    stageOf(groupId),
  ]);
  return NextResponse.json({
    canEdit: direct || (owner !== null && owner === user.id),
    role, xp: spaceXp.xp, stage,
    threshold: CONTRIBUTOR_XP,
    xpToContributor: Math.max(0, CONTRIBUTOR_XP - spaceXp.xp),
  });
}
