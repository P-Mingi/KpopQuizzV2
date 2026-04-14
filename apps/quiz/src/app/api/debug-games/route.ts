import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServiceRoleClient();

    // Test 1: Simple count
    const { count, error: countError } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('game_type', 'name_all_members')
      .eq('status', 'published');

    if (countError) {
      return NextResponse.json({ step: 'count', error: countError.message, details: countError });
    }

    // Test 2: Simple select without joins
    const { data: simple, error: simpleError } = await supabase
      .from('games')
      .select('id, title, slug, game_type, status, play_count')
      .eq('game_type', 'name_all_members')
      .eq('status', 'published')
      .limit(3);

    if (simpleError) {
      return NextResponse.json({ step: 'simple', error: simpleError.message, details: simpleError });
    }

    // Test 3: Full select with joins
    const { data: full, error: fullError } = await supabase
      .from('games')
      .select(`
        id, title, slug, game_type, content, matchup_count,
        status, play_count, like_count, created_at,
        groups (name, slug, display_color, text_color, logo_url, fandom_name),
        profiles!games_creator_id_fkey (username, avatar_url, avatar_bg, avatar_text)
      `)
      .eq('game_type', 'name_all_members')
      .eq('status', 'published')
      .limit(3);

    if (fullError) {
      return NextResponse.json({ step: 'full_join', error: fullError.message, details: fullError });
    }

    return NextResponse.json({
      ok: true,
      count,
      simple_titles: simple?.map(g => g.title),
      full_titles: full?.map(g => g.title),
      full_first_group: full?.[0] ? (full[0] as Record<string, unknown>).groups : null,
      full_first_profile: full?.[0] ? (full[0] as Record<string, unknown>).profiles : null,
    });
  } catch (err) {
    return NextResponse.json({ step: 'catch', error: String(err) }, { status: 500 });
  }
}
