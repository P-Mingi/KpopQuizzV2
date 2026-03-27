import Link from 'next/link';

import { createServerClient } from '@/lib/supabase/server';
import { STATIC_MODES, buildGroupMode, MIN_SONGS_FOR_GROUP_MODE } from '@/lib/blind-test-modes';
import { formatCount } from '@/lib/utils';

import type { Metadata } from 'next';
import type { BlindTestMode } from '@/lib/blind-test-modes';

export const metadata: Metadata = {
  title: 'K-pop Blind Test - Guess the Song',
  description: 'Listen to a clip and guess the K-pop song. Multiple modes: intro challenge, classic, verse only, and more. 300+ songs, 30+ groups.',
  alternates: { canonical: '/blind-test' },
};

export const revalidate = 60;

interface ModeWithAvail extends BlindTestMode {
  song_count_available: number;
  available: boolean;
}

// ── Data fetching ─────────────────────────────────

async function getPageData() {
  const supabase = await createServerClient();

  // Count songs per static mode
  const staticModes: ModeWithAvail[] = await Promise.all(
    STATIC_MODES.map(async (mode) => {
      const clipCol = `clip_${mode.clip_point}`;
      let query = supabase
        .from('blind_test_songs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .not(clipCol, 'is', null);

      if (mode.filter.group_slug) {
        const { data: g } = await supabase.from('groups').select('id').eq('slug', mode.filter.group_slug).single();
        if (g) query = query.eq('group_id', g.id); else return { ...mode, song_count_available: 0, available: false };
      }
      if (mode.id === 'solo-artists') query = query.in('gender', ['solo_female', 'solo_male']);
      else if (mode.filter.gender) query = query.eq('gender', mode.filter.gender);
      if (mode.filter.generation) query = query.eq('generation', mode.filter.generation);
      if (mode.filter.year_min) query = query.gte('year', mode.filter.year_min);
      if (mode.filter.year_max) query = query.lte('year', mode.filter.year_max);
      if (mode.filter.is_title_track !== undefined) query = query.eq('is_title_track', mode.filter.is_title_track);

      const { count } = await query;
      const n = count ?? 0;
      return { ...mode, song_count_available: n, available: n >= mode.song_count };
    }),
  );

  // Group modes from DB
  const { data: songRows } = await supabase
    .from('blind_test_songs')
    .select('group_id, groups!inner(name, slug)')
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  const gMap: Record<string, { name: string; slug: string; count: number }> = {};
  for (const row of songRows ?? []) {
    const g = row.groups as unknown as { name: string; slug: string } | null;
    if (!g?.slug) continue;
    if (!gMap[g.slug]) gMap[g.slug] = { name: g.name, slug: g.slug, count: 0 };
    gMap[g.slug]!.count++;
  }

  const groupModes: ModeWithAvail[] = Object.values(gMap)
    .filter(g => g.count >= MIN_SONGS_FOR_GROUP_MODE)
    .sort((a, b) => b.count - a.count)
    .map(g => {
      const m = buildGroupMode({ name: g.name, slug: g.slug, song_count: g.count });
      return { ...m, song_count_available: g.count, available: g.count >= m.song_count };
    });

  // Stats
  const { count: totalSongs } = await supabase
    .from('blind_test_songs').select('id', { count: 'exact', head: true }).eq('status', 'active');
  const { count: totalPlays } = await supabase
    .from('blind_test_plays').select('id', { count: 'exact', head: true });

  const allModes = [...staticModes, ...groupModes];

  return {
    difficulty: staticModes.filter(m => m.category === 'difficulty' && m.song_count_available > 0),
    group: groupModes,
    era: staticModes.filter(m => m.category === 'era' && m.song_count_available > 0),
    special: staticModes.filter(m => m.category === 'special' && m.song_count_available > 0),
    totalSongs: totalSongs ?? 0,
    totalPlays: totalPlays ?? 0,
    availableModes: allModes.filter(m => m.available).length,
  };
}

async function getThumbnails(mode: BlindTestMode, count: number = 4): Promise<string[]> {
  const supabase = await createServerClient();
  const clipCol = `clip_${mode.clip_point}`;
  let query = supabase
    .from('blind_test_songs')
    .select('youtube_id')
    .eq('status', 'active')
    .not(clipCol, 'is', null)
    .limit(count);

  if (mode.filter.group_slug) {
    const { data: g } = await supabase.from('groups').select('id').eq('slug', mode.filter.group_slug).single();
    if (g) query = query.eq('group_id', g.id);
  }
  if (mode.id === 'solo-artists') query = query.in('gender', ['solo_female', 'solo_male']);
  else if (mode.filter.gender) query = query.eq('gender', mode.filter.gender);
  if (mode.filter.generation) query = query.eq('generation', mode.filter.generation);
  if (mode.filter.year_min) query = query.gte('year', mode.filter.year_min);
  if (mode.filter.year_max) query = query.lte('year', mode.filter.year_max);
  if (mode.filter.is_title_track !== undefined) query = query.eq('is_title_track', mode.filter.is_title_track);

  const { data } = await query;
  const urls = (data ?? []).map(s => `https://img.youtube.com/vi/${s.youtube_id}/hqdefault.jpg`);
  while (urls.length < count) urls.push('');
  return urls;
}

// ── Components ────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-tertiary)] mb-2.5">{children}</p>;
}

function DiffBadge({ d }: { d: string }): React.ReactElement {
  const cls = d === 'easy' ? 'bg-[#EAF3DE] text-[#27500A]' :
    d === 'medium' ? 'bg-[#FAEEDA] text-[#633806]' :
    d === 'hard' ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-[#EEEDFE] text-[#3C3489]';
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>{d}</span>;
}

async function ModeCard({ mode }: { mode: ModeWithAvail }): Promise<React.ReactElement> {
  const isHard = mode.difficulty === 'hard' || mode.difficulty === 'expert';
  const thumbs = isHard ? [] : await getThumbnails(mode, 4);

  const inner = (
    <div className={`bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-xl overflow-hidden transition-colors h-full ${
      mode.available ? 'hover:border-[var(--border-medium)]' : 'opacity-40'
    }`}>
      {isHard ? (
        <div className="h-16 bg-[#1a1a1a] flex items-center justify-center">
          <div className="flex gap-[3px] items-end h-7">
            {[14, 24, 32, 20, 10].map((h, i) => (
              <div key={i} className="w-1 rounded-sm bg-[#E24B4A]" style={{ height: h }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-16 overflow-hidden bg-[var(--bg-secondary)]">
          {thumbs.map((url, i) => url ? (
            <img key={i} src={url} alt="" className="flex-1 object-cover object-center min-w-0" />
          ) : (
            <div key={i} className="flex-1 bg-[var(--bg-secondary)]" />
          ))}
        </div>
      )}
      <div className="p-3">
        <div className="flex gap-1.5 mb-1"><DiffBadge d={mode.difficulty} /></div>
        <p className="text-sm font-medium mb-0.5">{mode.title}</p>
        <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-2">
          {mode.available ? mode.description : `Coming soon (${mode.song_count_available}/${mode.song_count} songs)`}
        </p>
      </div>
    </div>
  );

  if (!mode.available) return <div className="pointer-events-none">{inner}</div>;
  return <Link href={`/blind-test/${mode.id}`}>{inner}</Link>;
}

async function GroupCard({ mode }: { mode: ModeWithAvail }): Promise<React.ReactElement> {
  const thumbs = await getThumbnails(mode, 2);

  const inner = (
    <div className={`w-[140px] flex-shrink-0 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-xl overflow-hidden transition-colors ${
      mode.available ? 'hover:border-[var(--border-medium)]' : 'opacity-40'
    }`}>
      <div className="flex h-16 overflow-hidden bg-[var(--bg-secondary)]">
        {thumbs.map((url, i) => url ? (
          <img key={i} src={url} alt="" className="flex-1 object-cover object-center min-w-0" />
        ) : (
          <div key={i} className="flex-1 bg-[var(--bg-secondary)]" />
        ))}
      </div>
      <div className="p-2.5">
        <p className="text-sm font-medium truncate">{mode.title}</p>
        <p className="text-[10px] text-[var(--text-tertiary)]">{mode.song_count_available} songs</p>
      </div>
    </div>
  );

  if (!mode.available) return <div className="pointer-events-none">{inner}</div>;
  return <Link href={`/blind-test/${mode.id}`}>{inner}</Link>;
}

// ── Page ──────────────────────────────────────────

export default async function BlindTestPage(): Promise<React.ReactElement> {
  const { difficulty, group, era, special, totalSongs, totalPlays, availableModes } = await getPageData();

  return (
    <div className="py-6">
      <h1 className="text-2xl font-medium mb-1">Blind test</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        Listen to a clip. Guess the song. No peeking.
      </p>

      {/* Stats */}
      <div className="flex gap-3 mb-8">
        <div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-2.5 text-center flex-1">
          <p className="text-lg font-medium">{totalSongs}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">songs</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-2.5 text-center flex-1">
          <p className="text-lg font-medium">{availableModes}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">modes</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-2.5 text-center flex-1">
          <p className="text-lg font-medium">{formatCount(totalPlays)}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">plays</p>
        </div>
      </div>

      {/* Section 1: Difficulty */}
      {difficulty.length > 0 && (
        <>
          <SectionLabel>Pick your challenge</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
            {difficulty.map(m => <ModeCard key={m.id} mode={m} />)}
          </div>
        </>
      )}

      {/* Section 2: By group (horizontal scroll) */}
      {group.length > 0 && (
        <>
          <SectionLabel>By group</SectionLabel>
          <div className="flex gap-2.5 overflow-x-auto pb-2 mb-8 -mx-4 px-4 scrollbar-hide">
            {group.map(m => <GroupCard key={m.id} mode={m} />)}
          </div>
        </>
      )}

      {/* Section 3: By era */}
      {era.length > 0 && (
        <>
          <SectionLabel>By era</SectionLabel>
          <div className="grid grid-cols-3 gap-2.5 mb-8">
            {era.map(m => <ModeCard key={m.id} mode={m} />)}
          </div>
        </>
      )}

      {/* Section 4: Special modes */}
      {special.length > 0 && (
        <>
          <SectionLabel>Special modes</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
            {special.map(m => <ModeCard key={m.id} mode={m} />)}
          </div>
        </>
      )}

      {/* Section 5: Top players */}
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
