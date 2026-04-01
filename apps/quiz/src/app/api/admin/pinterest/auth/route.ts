import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clientId = process.env.PINTEREST_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.PINTEREST_REDIRECT_URI!);
  const scope = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read';

  const authUrl = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  return NextResponse.redirect(authUrl);
}
