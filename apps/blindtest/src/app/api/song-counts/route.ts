import { NextResponse } from 'next/server';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerClient();

  // Songs with chorus clip (Classic + Speed)
  const { data: chorusSongs } = await supabase
    .from('blind_test_songs')
    .select('id, gender, generation, is_title_track, year, group_id')
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  // Songs with intro clip
  const { data: introSongs } = await supabase
    .from('blind_test_songs')
    .select('id, gender, generation, is_title_track, year, group_id')
    .eq('status', 'active')
    .not('clip_intro', 'is', null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function countByFilter(songs: any[], filter: string): number {
    switch (filter) {
      case 'all': return songs.length;
      case 'gg': return songs.filter(s => s.gender === 'gg').length;
      case 'bg': return songs.filter(s => s.gender === 'bg').length;
      case 'solo': return songs.filter(s => ['solo_female', 'solo_male'].includes(s.gender)).length;
      case '4th-gen': return songs.filter(s => s.generation === '4th').length;
      case '3rd-gen': return songs.filter(s => s.generation === '3rd').length;
      case '2nd-gen': return songs.filter(s => s.generation === '2nd').length;
      case 'title-tracks': return songs.filter(s => s.is_title_track).length;
      case 'b-sides': return songs.filter(s => !s.is_title_track).length;
      case 'recent': return songs.filter(s => s.year >= 2024).length;
      case 'legends': return songs.filter(s => s.year <= 2017).length;
      default: return 0;
    }
  }

  const FILTER_IDS = ['all', 'gg', 'bg', 'solo', '4th-gen', '3rd-gen', '2nd-gen', 'title-tracks', 'b-sides', 'recent', 'legends'];

  // Group counts (keyed by group_id)
  const groupCounts: Record<string, { chorus: number; intro: number }> = {};
  for (const s of chorusSongs ?? []) {
    const gid = s.group_id?.toString();
    if (!gid) continue;
    if (!groupCounts[gid]) groupCounts[gid] = { chorus: 0, intro: 0 };
    groupCounts[gid]!.chorus++;
  }
  for (const s of introSongs ?? []) {
    const gid = s.group_id?.toString();
    if (!gid) continue;
    if (!groupCounts[gid]) groupCounts[gid] = { chorus: 0, intro: 0 };
    groupCounts[gid]!.intro++;
  }

  // Get group names/slugs
  const groupIds = Object.keys(groupCounts).map(Number).filter(Boolean);
  let groupList: { id: number; name: string; slug: string; chorus: number; intro: number }[] = [];
  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name, slug')
      .in('id', groupIds);

    groupList = (groups ?? [])
      .map(g => ({
        id: g.id as number,
        name: g.name as string,
        slug: g.slug as string,
        chorus: groupCounts[g.id.toString()]?.chorus ?? 0,
        intro: groupCounts[g.id.toString()]?.intro ?? 0,
      }))
      .filter(g => g.chorus > 0 || g.intro > 0)
      .sort((a, b) => b.chorus - a.chorus);
  }

  return NextResponse.json({
    chorus: Object.fromEntries(FILTER_IDS.map(f => [f, countByFilter(chorusSongs ?? [], f)])),
    intro: Object.fromEntries(FILTER_IDS.map(f => [f, countByFilter(introSongs ?? [], f)])),
    groups: groupList,
  });
}
