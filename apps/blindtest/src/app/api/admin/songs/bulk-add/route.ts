import { NextResponse } from 'next/server';
import { createServerClient } from '@kpopquiz/shared/supabase/server';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { isAdmin } from '@/lib/admin';

interface TrackInput {
  deezer_track_id: number;
  title: string;
  artist_name: string;
  album_name?: string | null;
  album_cover_small?: string | null;
  album_cover_medium?: string | null;
  album_cover_big?: string | null;
  preview_url: string;
  duration?: number | null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    songs: TrackInput[];
    group_id?: string | null;
    gender?: string | null;
    generation?: string | null;
  };

  const adminDb = createServiceRoleClient();
  const results = { added: 0, skipped: 0, errors: [] as string[] };

  for (const song of body.songs) {
    const { data: existing } = await adminDb
      .from('songs')
      .select('id')
      .eq('deezer_track_id', song.deezer_track_id)
      .single();

    if (existing) {
      results.skipped++;
      continue;
    }

    const { error } = await adminDb.from('songs').insert({
      deezer_track_id: song.deezer_track_id,
      title: song.title,
      artist_name: song.artist_name,
      album_name: song.album_name ?? null,
      album_cover_small: song.album_cover_small ?? null,
      album_cover_medium: song.album_cover_medium ?? null,
      album_cover_big: song.album_cover_big ?? null,
      preview_url: song.preview_url,
      duration: song.duration ?? null,
      group_id: body.group_id ? parseInt(body.group_id) : null,
      gender: body.gender ?? null,
      generation: body.generation ?? null,
      status: 'active',
    });

    if (error) {
      results.errors.push(`${song.title}: ${error.message}`);
    } else {
      results.added++;
    }
  }

  return NextResponse.json(results);
}
