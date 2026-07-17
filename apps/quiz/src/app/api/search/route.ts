import { NextResponse } from 'next/server';

import { createServerClient, createPublicReadClient } from '@/lib/supabase/server';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ quizzes: [], groups: [], creators: [], people: [] });
  }

  const supabase = await createServerClient();
  const publicDb = createPublicReadClient();
  const pattern = `%${query}%`;
  const orTerm = query.replace(/[^a-zA-Z0-9 _-]/g, '').trim();

  try {
    const [quizzesResult, groupsResult, creatorsResult, peopleResult] = await Promise.all([
      // Quizzes by title
      supabase
        .from('quizzes')
        .select(`
          id, title, slug, play_count,
          groups!inner (name, slug, display_color, text_color, logo_url)
        `)
        .eq('status', 'published')
        .ilike('title', pattern)
        .order('play_count', { ascending: false })
        .limit(5),

      // Groups by name
      supabase
        .from('groups')
        .select('id, name, slug, display_color, text_color, logo_url, quiz_count')
        .ilike('name', pattern)
        .order('quiz_count', { ascending: false })
        .limit(3),

      // Creators by username (kept for the existing autocomplete consumers)
      supabase
        .from('profiles')
        .select('username, avatar_url, avatar_bg, avatar_text, total_quizzes_created')
        .ilike('username', pattern)
        .gt('total_quizzes_created', 0)
        .order('total_plays_received', { ascending: false })
        .limit(3),

      // People (M1.9): username OR display_name, banned excluded, NANO-cheap
      // trigram-indexed public read.
      orTerm.length >= 2
        ? publicDb
            .from('profiles')
            .select('username, display_name, avatar_url, avatar_bg, avatar_text, xp, follower_count')
            .or(`username.ilike.*${orTerm}*,display_name.ilike.*${orTerm}*`)
            .is('banned_at', null)
            .order('follower_count', { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    // Transform quiz results
    const quizzes = ((quizzesResult.data ?? []) as unknown as Array<{
      id: string;
      title: string;
      slug: string;
      play_count: number;
      groups: { name: string; slug: string; display_color: string; text_color: string; logo_url: string | null };
    }>).map((q) => ({
      id: q.id,
      title: q.title,
      slug: q.slug,
      play_count: q.play_count,
      group_name: q.groups.name,
      group_slug: q.groups.slug,
      display_color: q.groups.display_color,
      text_color: q.groups.text_color,
      group_logo_url: q.groups.logo_url,
    }));

    const people = ((peopleResult.data ?? []) as Array<{
      username: string; display_name: string | null; avatar_url: string | null;
      avatar_bg: string; avatar_text: string; xp: number; follower_count: number;
    }>).map((p) => {
      const level = getLevelInfo(p.xp).level;
      return {
        username: p.username, display_name: p.display_name,
        avatar_url: p.avatar_url, avatar_bg: p.avatar_bg, avatar_text: p.avatar_text,
        level, title: getTitleForLevel(level).en, follower_count: p.follower_count,
      };
    });

    return NextResponse.json({
      quizzes,
      groups: groupsResult.data ?? [],
      creators: creatorsResult.data ?? [],
      people,
    });
  } catch (err) {
    console.error('Search failed:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
