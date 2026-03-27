import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { RESERVED_USERNAMES } from '@/lib/constants';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json({ available: false }, { status: 200 });
  }

  if (RESERVED_USERNAMES.includes(username as typeof RESERVED_USERNAMES[number])) {
    return NextResponse.json({ available: false }, { status: 200 });
  }

  const supabase = await createServerClient();

  // Verify the user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  return NextResponse.json({ available: data === null });
}
