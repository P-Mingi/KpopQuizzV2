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
  category: 'difficulty' | 'group' | 'era' | 'special';
}

// ── DIFFICULTY ──────────────────────────────────────
const DIFFICULTY_MODES: BlindTestMode[] = [
  {
    id: 'classic', title: 'Classic',
    description: '10 seconds of chorus - the standard blind test',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'easy', filter: {}, category: 'difficulty',
  },
  {
    id: 'intro-challenge', title: 'Intro',
    description: 'Name it from the first 5 seconds - before the vocals',
    clip_point: 'intro', clip_duration: 5, song_count: 10,
    difficulty: 'medium', filter: {}, category: 'difficulty',
  },
  {
    id: 'verse-only', title: 'Verse only',
    description: 'No choruses allowed - only real fans survive',
    clip_point: 'verse', clip_duration: 10, song_count: 10,
    difficulty: 'hard', filter: {}, category: 'difficulty',
  },
  {
    id: 'bridge-or-break', title: 'Bridge',
    description: 'The hardest clip point - bridges and breakdowns only',
    clip_point: 'bridge', clip_duration: 10, song_count: 10,
    difficulty: 'expert', filter: {}, category: 'difficulty',
  },
  {
    id: 'speed-round', title: 'Speed round',
    description: '20 songs, 5 seconds each - pure speed, no time to think',
    clip_point: 'chorus', clip_duration: 5, song_count: 20,
    difficulty: 'hard', filter: {}, category: 'difficulty',
  },
];

// ── ERA ─────────────────────────────────────────────
const ERA_MODES: BlindTestMode[] = [
  {
    id: '2nd-gen', title: '2nd gen',
    description: 'SNSD, SHINee, BIGBANG, 2NE1, f(x), Wonder Girls, KARA',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'medium', filter: { generation: '2nd' }, category: 'era',
  },
  {
    id: '3rd-gen', title: '3rd gen',
    description: 'BTS, EXO, BLACKPINK, TWICE, Red Velvet, SEVENTEEN, GOT7',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'easy', filter: { generation: '3rd' }, category: 'era',
  },
  {
    id: '4th-gen', title: '4th gen',
    description: 'Stray Kids, aespa, IVE, NewJeans, ITZY, (G)I-DLE, TXT',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'easy', filter: { generation: '4th' }, category: 'era',
  },
];

// ── SPECIAL ─────────────────────────────────────────
const SPECIAL_MODES: BlindTestMode[] = [
  {
    id: 'girl-groups', title: 'Girl groups',
    description: 'Every generation of girl groups mixed together',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'medium', filter: { gender: 'gg' }, category: 'special',
  },
  {
    id: 'boy-groups', title: 'Boy groups',
    description: 'Every generation of boy groups mixed together',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'medium', filter: { gender: 'bg' }, category: 'special',
  },
  {
    id: 'solo-artists', title: 'Solo artists',
    description: 'IU, Jungkook, ROSE, Sunmi, Taeyeon, and more',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'medium', filter: {}, category: 'special',
  },
  {
    id: 'title-tracks', title: 'Title tracks only',
    description: 'The hits everyone knows - all title tracks, all groups',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'easy', filter: { is_title_track: true }, category: 'special',
  },
  {
    id: 'b-sides', title: 'B-sides only',
    description: 'Deep cuts only - no title tracks. True fans only.',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'hard', filter: { is_title_track: false }, category: 'special',
  },
  {
    id: 'recent-hits', title: '2024-2026 hits',
    description: 'How current is your K-pop knowledge? Only recent releases.',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'medium', filter: { year_min: 2024 }, category: 'special',
  },
  {
    id: 'kpop-legends', title: 'K-pop legends',
    description: 'Pre-2018 iconic songs. Do you know the classics?',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'medium', filter: { year_max: 2017 }, category: 'special',
  },
  {
    id: '4th-gen-gg', title: '4th gen girl groups',
    description: 'aespa, IVE, NewJeans, LE SSERAFIM, ITZY, (G)I-DLE mixed',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'easy', filter: { generation: '4th', gender: 'gg' }, category: 'special',
  },
  {
    id: '4th-gen-bg', title: '4th gen boy groups',
    description: 'Stray Kids, TXT, ENHYPEN, ATEEZ, TREASURE mixed',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'easy', filter: { generation: '4th', gender: 'bg' }, category: 'special',
  },
  {
    id: 'random-all', title: 'Random all',
    description: 'Any song, any group, any era. Total chaos.',
    clip_point: 'chorus', clip_duration: 10, song_count: 10,
    difficulty: 'medium', filter: {}, category: 'special',
  },
];

// ── EXPORTS ─────────────────────────────────────────

export const STATIC_MODES: BlindTestMode[] = [
  ...DIFFICULTY_MODES,
  ...ERA_MODES,
  ...SPECIAL_MODES,
];

export function getModeById(id: string): BlindTestMode | undefined {
  return STATIC_MODES.find(m => m.id === id);
}

export function isGroupModeId(id: string): boolean {
  return id.startsWith('group-');
}

export function getGroupSlugFromModeId(id: string): string | null {
  if (!isGroupModeId(id)) return null;
  return id.replace('group-', '');
}

export function buildGroupMode(group: { name: string; slug: string; song_count: number }): BlindTestMode {
  return {
    id: `group-${group.slug}`,
    title: group.name,
    description: `How well do you know ${group.name}?`,
    clip_point: 'chorus',
    clip_duration: 10,
    song_count: Math.min(10, group.song_count),
    difficulty: 'easy',
    filter: { group_slug: group.slug },
    category: 'group',
  };
}

export const MIN_SONGS_FOR_GROUP_MODE = 5;
