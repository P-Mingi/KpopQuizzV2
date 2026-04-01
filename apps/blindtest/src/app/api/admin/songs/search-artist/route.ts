import { NextResponse } from 'next/server';
import { createServerClient } from '@kpopquiz/shared/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const query = req.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'Provide q' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=10`,
    );
    const data = await res.json();

    const artists = ((data.data ?? []) as Array<Record<string, unknown>>).map((a) => ({
      id: a.id as number,
      name: a.name as string,
      picture_small: (a.picture_small ?? null) as string | null,
      picture_medium: (a.picture_medium ?? null) as string | null,
      nb_fan: (a.nb_fan ?? 0) as number,
    }));

    return NextResponse.json({ artists });
  } catch {
    return NextResponse.json({ error: 'Deezer API request failed' }, { status: 500 });
  }
}
