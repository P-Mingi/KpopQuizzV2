import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

// W3.2 - lightweight client check for the Edit affordance, so entity pages stay
// ISR/cookie-free while the edit button only appears for editors. v1 editors =
// owner + admins (curator roles arrive in W4).
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const canEdit = !!(user && isAdmin(user.id));
  return NextResponse.json({ canEdit });
}
