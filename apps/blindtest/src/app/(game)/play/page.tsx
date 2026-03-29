import { BlindTestGame } from '@/components/game/blind-test-game';

import type { BlindTestMode } from '@/lib/blind-test-modes';

const MODES_INFO: Record<string, { title: string; description: string; clip_point: string; clip_duration: number; song_count: number; difficulty: string }> = {
  classic: { title: 'Classic', description: '10s of chorus', clip_point: 'chorus', clip_duration: 10, song_count: 10, difficulty: 'easy' },
  intro: { title: 'Intro', description: '5s from the start', clip_point: 'intro', clip_duration: 5, song_count: 10, difficulty: 'medium' },
  speed: { title: 'Speed', description: '20 songs, 5s each', clip_point: 'chorus', clip_duration: 5, song_count: 20, difficulty: 'hard' },
  daily: { title: "Today's challenge", description: 'Same 10 songs for everyone', clip_point: 'chorus', clip_duration: 10, song_count: 10, difficulty: 'medium' },
};

const FILTER_NAMES: Record<string, string> = {
  all: 'All K-pop', gg: 'Girl groups', bg: 'Boy groups', solo: 'Solo artists',
  '4th-gen': '4th gen', '3rd-gen': '3rd gen', '2nd-gen': '2nd gen',
  'title-tracks': 'Title tracks', 'b-sides': 'B-sides',
  recent: 'Recent hits', legends: 'Legends',
};

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ mode?: string; filter?: string; group?: string }> }) {
  const params = await searchParams;
  const modeKey = params.mode ?? 'classic';
  const filter = params.filter ?? 'all';
  const group = params.group ?? null;

  const info = MODES_INFO[modeKey] ?? MODES_INFO.classic!;
  const filterLabel = group
    ? group.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : (FILTER_NAMES[filter] ?? 'All K-pop');

  const modeObj: BlindTestMode = {
    id: group ? `${modeKey}:group-${group}` : `${modeKey}:${filter}`,
    title: `${info.title} - ${filterLabel}`,
    description: info.description,
    clip_point: info.clip_point as 'chorus' | 'intro' | 'verse' | 'bridge',
    clip_duration: info.clip_duration,
    song_count: info.song_count,
    difficulty: info.difficulty as 'easy' | 'medium' | 'hard' | 'expert',
    filter: {},
    category: 'difficulty',
  };

  return (
    <BlindTestGame
      mode={modeObj}
      gameMode={modeKey}
      gameFilter={filter}
      gameGroup={group}
    />
  );
}
