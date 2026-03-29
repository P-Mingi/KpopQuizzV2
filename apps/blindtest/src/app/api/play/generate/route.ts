import { NextResponse } from 'next/server';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

const MODES_CONFIG: Record<string, { clip_point: string; clip_duration: number; song_count: number }> = {
  classic: { clip_point: 'chorus', clip_duration: 10, song_count: 10 },
  intro: { clip_point: 'intro', clip_duration: 5, song_count: 10 },
  speed: { clip_point: 'chorus', clip_duration: 5, song_count: 20 },
};

const FILTER_NAMES: Record<string, string> = {
  all: 'All K-pop', gg: 'Girl groups', bg: 'Boy groups', solo: 'Solo artists',
  '4th-gen': '4th gen', '3rd-gen': '3rd gen', '2nd-gen': '2nd gen',
  'title-tracks': 'Title tracks', 'b-sides': 'B-sides',
  recent: 'Recent hits', legends: 'Legends',
};

export async function POST(req: Request) {
  const body = await req.json() as { mode: string; filter?: string; group?: string; mode_id?: string };

  // Support both new (mode+filter) and legacy (mode_id) formats
  let mode = body.mode;
  let filter = body.filter ?? 'all';
  let group = body.group ?? null;

  // Legacy support: if mode_id is passed (old format like "classic" or "group-bts")
  if (body.mode_id && !body.mode) {
    const legacy = resolveLegacyMode(body.mode_id);
    mode = legacy.mode;
    filter = legacy.filter;
    group = legacy.group;
  }

  const modeConfig = MODES_CONFIG[mode];
  if (!modeConfig) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  const clipColumn = `clip_${modeConfig.clip_point}`;
  const supabase = await createServerClient();

  // Build query with all clip columns for dynamic access
  let query = supabase
    .from('blind_test_songs')
    .select('id, title, artist, youtube_id, wrong_answers, clip_intro, clip_chorus, clip_verse, clip_bridge, group_id, generation, gender, is_title_track, year, groups(name)')
    .eq('status', 'active')
    .not(clipColumn, 'is', null);

  // Apply filter
  if (group) {
    const { data: groupData } = await supabase.from('groups').select('id, name').eq('slug', group).single();
    if (!groupData) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    query = query.eq('group_id', groupData.id);
  } else if (filter && filter !== 'all') {
    switch (filter) {
      case 'gg': query = query.eq('gender', 'gg'); break;
      case 'bg': query = query.eq('gender', 'bg'); break;
      case 'solo': query = query.in('gender', ['solo_female', 'solo_male']); break;
      case '4th-gen': query = query.eq('generation', '4th'); break;
      case '3rd-gen': query = query.eq('generation', '3rd'); break;
      case '2nd-gen': query = query.eq('generation', '2nd'); break;
      case 'title-tracks': query = query.eq('is_title_track', true); break;
      case 'b-sides': query = query.eq('is_title_track', false); break;
      case 'recent': query = query.gte('year', 2024); break;
      case 'legends': query = query.lte('year', 2017); break;
    }
  }

  const { data: allSongs } = await query;

  if (!allSongs || allSongs.length < modeConfig.song_count) {
    return NextResponse.json({
      error: 'Not enough songs for this combination',
      available: allSongs?.length ?? 0,
      needed: modeConfig.song_count,
    }, { status: 400 });
  }

  const selected = [...allSongs].sort(() => Math.random() - 0.5).slice(0, modeConfig.song_count);

  const songs = await Promise.all(selected.map(async (song) => {
    const isArtistQuestion = Math.random() < 0.3;
    const songRecord = song as Record<string, unknown>;

    let choices: string[];
    let correctIndex: number;
    let questionType: 'title' | 'artist';

    if (isArtistQuestion) {
      questionType = 'artist';
      const wrongArtists = await getConvincingWrongArtists(
        { artist: song.artist, generation: song.generation, gender: song.gender },
        supabase,
      );
      const allChoices = [song.artist, ...wrongArtists];
      const shuffled = allChoices.sort(() => Math.random() - 0.5);
      choices = shuffled;
      correctIndex = shuffled.indexOf(song.artist);
    } else {
      questionType = 'title';
      const wrongTitles = ((song.wrong_answers ?? []) as string[]).slice(0, 3);
      while (wrongTitles.length < 3) wrongTitles.push('Unknown');
      const allChoices = [song.title, ...wrongTitles];
      const shuffled = allChoices.sort(() => Math.random() - 0.5);
      choices = shuffled;
      correctIndex = shuffled.indexOf(song.title);
    }

    return {
      song_id: song.id,
      youtube_id: song.youtube_id,
      clip_start: songRecord[clipColumn] as number,
      group_id: song.group_id,
      group_name: ((song as Record<string, unknown>).groups as { name: string } | null)?.name ?? null,
      question_type: questionType,
      choices,
      _answer: { correct_index: correctIndex, title: song.title, artist: song.artist },
    };
  }));

  const modeId = group ? `${mode}:group-${group}` : `${mode}:${filter}`;
  const modeName = mode === 'classic' ? 'Classic' : mode === 'intro' ? 'Intro' : 'Speed';
  const filterLabel = group
    ? group.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : (FILTER_NAMES[filter] ?? 'All K-pop');

  return NextResponse.json({
    mode_id: modeId,
    mode_title: `${modeName} - ${filterLabel}`,
    clip_duration: modeConfig.clip_duration,
    songs,
  });
}

function resolveLegacyMode(modeId: string): { mode: string; filter: string; group: string | null } {
  if (modeId.startsWith('group-')) return { mode: 'classic', filter: 'all', group: modeId.replace('group-', '') };
  const map: Record<string, { mode: string; filter: string }> = {
    classic: { mode: 'classic', filter: 'all' },
    'intro-challenge': { mode: 'intro', filter: 'all' },
    'speed-round': { mode: 'speed', filter: 'all' },
    'girl-groups': { mode: 'classic', filter: 'gg' },
    'boy-groups': { mode: 'classic', filter: 'bg' },
    'solo-artists': { mode: 'classic', filter: 'solo' },
    '4th-gen': { mode: 'classic', filter: '4th-gen' },
    '3rd-gen': { mode: 'classic', filter: '3rd-gen' },
    '2nd-gen': { mode: 'classic', filter: '2nd-gen' },
    'title-tracks': { mode: 'classic', filter: 'title-tracks' },
    'b-sides': { mode: 'classic', filter: 'b-sides' },
    'recent-hits': { mode: 'classic', filter: 'recent' },
    'kpop-legends': { mode: 'classic', filter: 'legends' },
    'random-all': { mode: 'classic', filter: 'all' },
  };
  const resolved = map[modeId];
  if (resolved) return { ...resolved, group: null };
  return { mode: 'classic', filter: 'all', group: null };
}

async function getConvincingWrongArtists(
  song: { artist: string; generation: string | null; gender: string },
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<string[]> {
  const { data } = await supabase
    .from('blind_test_songs')
    .select('artist')
    .eq('status', 'active')
    .eq('generation', song.generation ?? '')
    .eq('gender', song.gender)
    .neq('artist', song.artist)
    .not('clip_chorus', 'is', null);

  const uniqueArtists = [...new Set((data ?? []).map(s => s.artist))];
  const shuffled = uniqueArtists.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  if (selected.length < 3) {
    const { data: fallback } = await supabase
      .from('blind_test_songs')
      .select('artist')
      .eq('status', 'active')
      .neq('artist', song.artist)
      .limit(20);
    for (const a of [...new Set((fallback ?? []).map(s => s.artist))]) {
      if (!selected.includes(a) && a !== song.artist) {
        selected.push(a);
        if (selected.length >= 3) break;
      }
    }
  }

  return selected;
}
