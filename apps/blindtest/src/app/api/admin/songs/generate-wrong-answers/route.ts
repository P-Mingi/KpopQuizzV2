import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    song_id: string;
    artist_name: string;
    title: string;
    gender: string | null;
    generation: string | null;
  };

  const adminDb = createServiceRoleClient();

  // Wrong artists: same gender + same generation
  const { data: sameGen } = await adminDb
    .from('songs')
    .select('artist_name')
    .eq('gender', body.gender ?? '')
    .eq('generation', body.generation ?? '')
    .neq('artist_name', body.artist_name)
    .eq('status', 'active')
    .limit(100);

  const uniqueArtists = [...new Set((sameGen ?? []).map((s) => s.artist_name))];
  const shuffledArtists = uniqueArtists.sort(() => Math.random() - 0.5);
  let wrongArtists = shuffledArtists.slice(0, 3);

  // Fallback if not enough
  if (wrongArtists.length < 3) {
    const { data: fallback } = await adminDb
      .from('songs')
      .select('artist_name')
      .eq('status', 'active')
      .neq('artist_name', body.artist_name)
      .limit(50);
    const more = [...new Set((fallback ?? []).map((s) => s.artist_name))].filter(
      (a) => !wrongArtists.includes(a),
    );
    wrongArtists = [...wrongArtists, ...more].slice(0, 3);
  }

  // Wrong titles: same artist first, then same gender
  const { data: sameArtist } = await adminDb
    .from('songs')
    .select('title')
    .eq('artist_name', body.artist_name)
    .neq('title', body.title)
    .eq('status', 'active')
    .limit(10);

  const titles = (sameArtist ?? []).map((s) => s.title);

  if (titles.length < 3) {
    const { data: sameGender } = await adminDb
      .from('songs')
      .select('title')
      .eq('gender', body.gender ?? '')
      .neq('artist_name', body.artist_name)
      .eq('status', 'active')
      .limit(20);
    const more = (sameGender ?? []).map((s) => s.title);
    titles.push(...more);
  }

  const uniqueTitles = [...new Set(titles)].sort(() => Math.random() - 0.5);
  const wrongTitles = uniqueTitles.slice(0, 3);

  return NextResponse.json({ wrong_artists: wrongArtists, wrong_titles: wrongTitles });
}
