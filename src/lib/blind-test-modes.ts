export interface BlindTestMode {
  id: string;
  title: string;
  description: string;
  clip_point: 'intro' | 'chorus' | 'verse' | 'bridge';
  clip_duration: number;
  song_count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  filter: {
    group_slug?: string;
    gender?: string;
    generation?: string;
    year_min?: number;
    year_max?: number;
    is_title_track?: boolean;
  };
  category: 'difficulty' | 'group' | 'filter';
}

export const BLIND_TEST_MODES: BlindTestMode[] = [
  // -- DIFFICULTY --
  {
    id: 'intro-challenge',
    title: 'Intro challenge',
    description: 'Name it from the first 5 seconds',
    clip_point: 'intro',
    clip_duration: 5,
    song_count: 10,
    difficulty: 'medium',
    filter: {},
    category: 'difficulty',
  },
  {
    id: 'classic',
    title: 'Classic',
    description: '10 seconds of chorus - the standard blind test',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'easy',
    filter: {},
    category: 'difficulty',
  },
  {
    id: 'verse-only',
    title: 'Verse only',
    description: 'No choruses - only real fans survive',
    clip_point: 'verse',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'hard',
    filter: {},
    category: 'difficulty',
  },
  {
    id: 'bridge-or-break',
    title: 'Bridge or break',
    description: 'The hardest clip point - bridges and breakdowns only',
    clip_point: 'bridge',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'expert',
    filter: {},
    category: 'difficulty',
  },

  // -- GROUP --
  {
    id: 'bts',
    title: 'BTS',
    description: 'How well do you know the BTS discography?',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'easy',
    filter: { group_slug: 'bts' },
    category: 'group',
  },
  {
    id: 'blackpink',
    title: 'BLACKPINK',
    description: 'They only have 30 songs - can you name them?',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 5,
    difficulty: 'easy',
    filter: { group_slug: 'blackpink' },
    category: 'group',
  },
  {
    id: 'stray-kids',
    title: 'Stray Kids',
    description: "From God's Menu to S-Class - name them all",
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 5,
    difficulty: 'easy',
    filter: { group_slug: 'stray-kids' },
    category: 'group',
  },
  {
    id: 'aespa',
    title: 'aespa',
    description: 'MY girls - from Black Mamba to Supernova',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 5,
    difficulty: 'easy',
    filter: { group_slug: 'aespa' },
    category: 'group',
  },

  // -- FILTER --
  {
    id: '4th-gen-gg',
    title: '4th gen girl groups',
    description: 'aespa, IVE, NewJeans, LE SSERAFIM, ITZY, (G)I-DLE',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'easy',
    filter: { generation: '4th', gender: 'gg' },
    category: 'filter',
  },
  {
    id: '4th-gen-bg',
    title: '4th gen boy groups',
    description: 'Stray Kids, ENHYPEN, TXT, ATEEZ',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 5,
    difficulty: 'easy',
    filter: { generation: '4th', gender: 'bg' },
    category: 'filter',
  },
  {
    id: 'girl-groups',
    title: 'All girl groups',
    description: 'Every generation of girl groups mixed together',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'medium',
    filter: { gender: 'gg' },
    category: 'filter',
  },
  {
    id: 'boy-groups',
    title: 'All boy groups',
    description: 'Every generation of boy groups mixed together',
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: 10,
    difficulty: 'medium',
    filter: { gender: 'bg' },
    category: 'filter',
  },
];

export function getModeById(id: string): BlindTestMode | undefined {
  return BLIND_TEST_MODES.find(m => m.id === id);
}
