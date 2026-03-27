import Link from 'next/link';

import { createServerClient } from '@/lib/supabase/server';
import { BLIND_TEST_MODES } from '@/lib/blind-test-modes';
import { formatCount } from '@/lib/utils';

import type { Metadata } from 'next';
import type { BlindTestMode } from '@/lib/blind-test-modes';

export const metadata: Metadata = {
  title: 'K-pop Blind Test - Guess the Song',
  description: 'Listen to a clip and guess the K-pop song. Multiple modes: intro challenge, classic, verse only, and more. BTS, BLACKPINK, Stray Kids, and 30+ groups.',
  alternates: { canonical: '/blind-test' },
};

export const revalidate = 60;

interface ModeWithAvailability extends BlindTestMode {
  song_count_available: number;
  available: boolean;
}

async function getModesData(): Promise<{ modes: ModeWithAvailability[]; totalSongs: number; totalPlays: number }> {
  const supabase = await createServerClient();

  const modes = await Promise.all(
    BLIND_TEST_MODES.map(async (mode) => {
      const clipColumn = `clip_${mode.clip_point}`;

      let query = supabase
        .from('blind_test_songs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .not(clipColumn, 'is', null);

      if (mode.filter.group_slug) {
        const { data: group } = await supabase
          .from('groups').select('id').eq('slug', mode.filter.group_slug).single();
        if (group) query = query.eq('group_id', group.id);
        else return { ...mode, song_count_available: 0, available: false };
      }
      if (mode.filter.gender) query = query.eq('gender', mode.filter.gender);
      if (mode.filter.generation) query = query.eq('generation', mode.filter.generation);
      if (mode.filter.year_min) query = query.gte('year', mode.filter.year_min);
      if (mode.filter.year_max) query = query.lte('year', mode.filter.year_max);

      const { count } = await query;
      const n = count ?? 0;
      return { ...mode, song_count_available: n, available: n >= mode.song_count };
    }),
  );

  const { count: totalSongs } = await supabase
    .from('blind_test_songs').select('id', { count: 'exact', head: true }).eq('status', 'active');
  const { count: totalPlays } = await supabase
    .from('blind_test_plays').select('id', { count: 'exact', head: true });

  return { modes, totalSongs: totalSongs ?? 0, totalPlays: totalPlays ?? 0 };
}

async function getThumbnails(mode: BlindTestMode): Promise<string[]> {
  const supabase = await createServerClient();
  const clipColumn = `clip_${mode.clip_point}`;

  let query = supabase
    .from('blind_test_songs')
    .select('youtube_id')
    .eq('status', 'active')
    .not(clipColumn, 'is', null)
    .limit(4);

  if (mode.filter.group_slug) {
    const { data: group } = await supabase.from('groups').select('id').eq('slug', mode.filter.group_slug).single();
    if (group) query = query.eq('group_id', group.id);
  }
  if (mode.filter.gender) query = query.eq('gender', mode.filter.gender);
  if (mode.filter.generation) query = query.eq('generation', mode.filter.generation);

  const { data } = await query;
  const urls = (data ?? []).map(s => `https://img.youtube.com/vi/${s.youtube_id}/hqdefault.jpg`);
  while (urls.length < 4) urls.push('');
  return urls;
}

function SectionLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-tertiary)] mb-2.5">
      {children}
    </p>
  );
}

async function ModeCard({ mode, songCount, available }: {
  mode: BlindTestMode; songCount: number; available: boolean;
}): Promise<React.ReactElement> {
  const isHard = mode.difficulty === 'hard' || mode.difficulty === 'expert';
  const thumbnails = isHard ? [] : await getThumbnails(mode);

  const diffCls =
    mode.difficulty === 'easy' ? 'bg-[#EAF3DE] text-[#27500A]' :
    mode.difficulty === 'medium' ? 'bg-[#FAEEDA] text-[#633806]' :
    'bg-[#FCEBEB] text-[#791F1F]';

  const inner = (
    <div className={`bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-2xl overflow-hidden transition-colors ${
      available ? 'hover:border-[var(--border-medium)]' : 'opacity-50'
    }`}>
      {isHard ? (
        <div className="h-20 bg-[#1a1a1a] flex items-center justify-center">
          <div className="flex gap-[3px] items-end h-8">
            {[14, 24, 32, 20, 10].map((h, i) => (
              <div key={i} className="w-1 rounded-sm bg-[#E24B4A]" style={{ height: h }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-20 overflow-hidden bg-[var(--bg-secondary)]">
          {thumbnails.map((url, i) => url ? (
            <img key={i} src={url} alt="" className="flex-1 object-cover object-center" style={{ minWidth: 0 }} />
          ) : (
            <div key={i} className="flex-1 bg-[var(--bg-secondary)]" />
          ))}
        </div>
      )}

      <div className="p-3">
        <div className="flex gap-1.5 mb-1">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${diffCls}`}>
            {mode.difficulty}
          </span>
        </div>
        <p className="text-sm font-medium mb-0.5">{mode.title}</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          {available
            ? `${songCount} songs · ${mode.clip_duration}s clips`
            : `Coming soon (${songCount}/${mode.song_count})`
          }
        </p>
      </div>
    </div>
  );

  if (!available) return <div className="pointer-events-none">{inner}</div>;
  return <Link href={`/blind-test/${mode.id}`}>{inner}</Link>;
}

export default async function BlindTestPage(): Promise<React.ReactElement> {
  const { modes, totalSongs, totalPlays } = await getModesData();

  const difficulty = modes.filter(m => m.category === 'difficulty' && m.song_count_available > 0);
  const group = modes.filter(m => m.category === 'group' && m.song_count_available > 0);
  const filter = modes.filter(m => m.category === 'filter' && m.song_count_available > 0);
  const availableCount = modes.filter(m => m.available).length;

  return (
    <div className="py-6">
      <h1 className="text-2xl font-medium mb-1">Blind test</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        Listen to a clip. Guess the song. No peeking.
      </p>

      <div className="flex gap-3 mb-6">
        <div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-2.5 text-center flex-1">
          <p className="text-lg font-medium">{totalSongs}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">songs</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-2.5 text-center flex-1">
          <p className="text-lg font-medium">{availableCount}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">modes</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-2.5 text-center flex-1">
          <p className="text-lg font-medium">{formatCount(totalPlays)}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">plays</p>
        </div>
      </div>

      {difficulty.length > 0 && (
        <>
          <SectionLabel>By difficulty</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            {difficulty.map(m => (
              <ModeCard key={m.id} mode={m} songCount={m.song_count_available} available={m.available} />
            ))}
          </div>
        </>
      )}

      {group.length > 0 && (
        <>
          <SectionLabel>By group</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
            {group.map(m => (
              <ModeCard key={m.id} mode={m} songCount={m.song_count_available} available={m.available} />
            ))}
          </div>
        </>
      )}

      {filter.length > 0 && (
        <>
          <SectionLabel>By generation</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
            {filter.map(m => (
              <ModeCard key={m.id} mode={m} songCount={m.song_count_available} available={m.available} />
            ))}
          </div>
        </>
      )}

      <SectionLabel>Top players</SectionLabel>
      <div className="bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-2xl p-4">
        <div className="text-center py-4">
          <p className="text-sm text-[var(--text-tertiary)] mb-0.5">No plays yet</p>
          <p className="text-xs text-[var(--text-tertiary)]">Be the first to play and claim the top spot</p>
        </div>
      </div>
    </div>
  );
}
