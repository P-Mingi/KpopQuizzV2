import { NextResponse } from 'next/server';

import { createServerClient, createPublicReadClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { canCurateSpace } from '@/lib/verse/roles';

import type { NextRequest } from 'next/server';

// W3.2 / W4.3 - lightweight client check for the Edit affordance, so entity pages stay
// ISR/cookie-free while the edit button only appears for editors. Editors = global
// admins (everywhere) + per-space curators (on their space, when ?group=slug is given).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ canEdit: false });
  if (isAdmin(user.id)) return NextResponse.json({ canEdit: true });

  const slug = new URL(req.url).searchParams.get('group');
  if (!slug) return NextResponse.json({ canEdit: false });
  const { data: g } = await createPublicReadClient().from('groups').select('id').eq('slug', slug).maybeSingle();
  const groupId = (g as { id: number } | null)?.id;
  const canEdit = groupId ? await canCurateSpace(user.id, groupId) : false;
  return NextResponse.json({ canEdit });
}
