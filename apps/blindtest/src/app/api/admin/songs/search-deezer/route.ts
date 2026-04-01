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
  const artistId = req.nextUrl.searchParams.get('artist_id');
  const limit = req.nextUrl.searchParams.get('limit') || '50';

  if (!query && !artistId) {
    return NextResponse.json({ error: 'Provide q or artist_id' }, { status: 400 });
  }

  let url: string;
  if (artistId) {
    url = `https://api.deezer.com/artist/${artistId}/top?limit=${limit}`;
  } else {
    url = `https://api.deezer.com/search/track?q=${encodeURIComponent(query!)}&limit=${limit}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const tracks = ((data.data ?? []) as Array<Record<string, unknown>>)
      .filter((t) => t.preview && typeof t.preview === 'string' && (t.preview as string).length > 10)
      .map((t) => ({
        deezer_track_id: t.id,
        title: (t.title_short ?? t.title) as string,
        artist_name: ((t.artist as Record<string, unknown>)?.name ?? 'Unknown') as string,
        artist_id: (t.artist as Record<string, unknown>)?.id,
        album_name: ((t.album as Record<string, unknown>)?.title ?? null) as string | null,
        album_cover_small: ((t.album as Record<string, unknown>)?.cover_small ?? null) as string | null,
        album_cover_medium: ((t.album as Record<string, unknown>)?.cover_medium ?? null) as string | null,
        album_cover_big: ((t.album as Record<string, unknown>)?.cover_big ?? null) as string | null,
        preview_url: t.preview as string,
        duration: t.duration as number,
      }));

    return NextResponse.json({ tracks, total: tracks.length });
  } catch {
    return NextResponse.json({ error: 'Deezer API request failed' }, { status: 500 });
  }
}
