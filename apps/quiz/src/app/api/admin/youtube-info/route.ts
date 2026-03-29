import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { parseYouTubeTitle } from '@/lib/youtube';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videoId = request.nextUrl.searchParams.get('id');
  if (!videoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!res.ok) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    const data = await res.json();
    const parsed = parseYouTubeTitle(data.title);

    return NextResponse.json({
      raw_title: data.title,
      title: parsed.title,
      artist: parsed.artist,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 });
  }
}
