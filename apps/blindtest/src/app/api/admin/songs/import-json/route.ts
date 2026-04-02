import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { isAdmin } from '@/lib/admin';

interface SongImport {
  deezer_track_id: number;
  title: string;
  artist_name: string;
  album_name?: string | null;
  album_cover_small?: string | null;
  album_cover_medium?: string | null;
  album_cover_big?: string | null;
  preview_url: string;
  duration?: number | null;
  gender?: string | null;
  generation?: string | null;
  wrong_answers_artist?: string[];
  wrong_answers_title?: string[];
  deezer_rank?: number;
  difficulty?: string;
  status?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { songs: SongImport[] };
  if (!Array.isArray(body.songs) || body.songs.length === 0) {
    return NextResponse.json({ error: 'songs must be a non-empty array' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  const batchSize = 100;
  let totalAdded = 0;
  let totalErrors = 0;

  for (let i = 0; i < body.songs.length; i += batchSize) {
    const batch = body.songs.slice(i, i + batchSize);

    const { error } = await adminDb
      .from('songs')
      .upsert(
        batch.map((s) => ({
          deezer_track_id: s.deezer_track_id,
          title: s.title,
          artist_name: s.artist_name,
          album_name: s.album_name ?? null,
          album_cover_small: s.album_cover_small ?? null,
          album_cover_medium: s.album_cover_medium ?? null,
          album_cover_big: s.album_cover_big ?? null,
          preview_url: s.preview_url,
          duration: s.duration ?? null,
          gender: s.gender ?? null,
          generation: s.generation ?? null,
          wrong_answers_artist: s.wrong_answers_artist ?? [],
          wrong_answers_title: s.wrong_answers_title ?? [],
          deezer_rank: s.deezer_rank ?? 0,
          difficulty: s.difficulty ?? 'medium',
          status: s.status ?? 'active',
        })),
        { onConflict: 'deezer_track_id', ignoreDuplicates: true },
      );

    if (error) {
      console.error(`Batch ${i} error:`, error.message);
      totalErrors++;
    } else {
      totalAdded += batch.length;
    }
  }

  return NextResponse.json({ totalAdded, totalErrors, totalSongs: body.songs.length });
}
