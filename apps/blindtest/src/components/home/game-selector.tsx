'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MODES = [
  { id: 'classic', label: 'Classic', description: '10s chorus', difficulty: 'Easy', clipKey: 'chorus' },
  { id: 'intro', label: 'Intro', description: '5s from start', difficulty: 'Medium', clipKey: 'intro' },
  { id: 'speed', label: 'Speed', description: '20 songs - 5s', difficulty: 'Hard', clipKey: 'chorus' },
] as const;

const FILTERS = [
  { id: 'all', label: 'All K-pop' },
  { id: 'gg', label: 'Girl groups' },
  { id: 'bg', label: 'Boy groups' },
  { id: 'solo', label: 'Solo artists' },
  { id: '4th-gen', label: '4th gen' },
  { id: '3rd-gen', label: '3rd gen' },
  { id: '2nd-gen', label: '2nd gen' },
  { id: 'title-tracks', label: 'Title tracks' },
  { id: 'b-sides', label: 'B-sides' },
  { id: 'recent', label: 'Recent hits' },
  { id: 'legends', label: 'Legends' },
] as const;

interface GroupInfo {
  id: number;
  name: string;
  slug: string;
  chorus: number;
  intro: number;
}

interface SongCounts {
  chorus: Record<string, number>;
  intro: Record<string, number>;
  groups: GroupInfo[];
}

interface Props {
  songCounts: SongCounts;
}

export function GameSelector({ songCounts }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState('classic');
  const [filter, setFilter] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showAllGroups, setShowAllGroups] = useState(false);

  const clipKey = MODES.find(m => m.id === mode)?.clipKey ?? 'chorus';
  const minSongs = mode === 'speed' ? 10 : 5;

  function getFilterCount(filterId: string): number {
    return (songCounts[clipKey as 'chorus' | 'intro'] as Record<string, number>)?.[filterId] ?? 0;
  }

  function getGroupCount(g: GroupInfo): number {
    return clipKey === 'intro' ? g.intro : g.chorus;
  }

  const availableSongs = selectedGroup
    ? getGroupCount(songCounts.groups.find(g => g.slug === selectedGroup) ?? { id: 0, name: '', slug: '', chorus: 0, intro: 0 })
    : getFilterCount(filter);

  const canPlay = availableSongs >= minSongs;

  function handleFilterSelect(filterId: string) {
    setFilter(filterId);
    setSelectedGroup(null);
  }

  function handleGroupSelect(groupSlug: string) {
    if (selectedGroup === groupSlug) {
      setSelectedGroup(null);
    } else {
      setSelectedGroup(groupSlug);
      setFilter('all');
    }
  }

  function handlePlay() {
    if (!canPlay) return;
    const params = new URLSearchParams({ mode });
    if (selectedGroup) {
      params.set('group', selectedGroup);
    } else {
      params.set('filter', filter);
    }
    router.push(`/play?${params.toString()}`);
  }

  const visibleGroups = showAllGroups ? songCounts.groups : songCounts.groups.slice(0, 8);

  return (
    <div>
      {/* Mode selection */}
      <SectionLabel>How do you want to play?</SectionLabel>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`p-3 rounded-xl text-center transition-all border ${
              mode === m.id
                ? 'bg-pink-50 border-pink-400'
                : 'bg-bg-secondary border-border-default hover:border-border-hover'
            }`}
          >
            <p className={`text-sm font-medium ${mode === m.id ? 'text-pink-400' : ''}`}>
              {m.label}
            </p>
            <p className="text-[10px] text-text-tertiary mt-0.5">{m.description}</p>
            <DifficultyBadge difficulty={m.difficulty} />
          </button>
        ))}
      </div>

      {/* Category filter */}
      <SectionLabel>What do you want to listen to?</SectionLabel>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {FILTERS.map(f => {
          const count = getFilterCount(f.id);
          const isDisabled = count < minSongs;
          const isActive = !selectedGroup && filter === f.id;

          return (
            <button
              key={f.id}
              onClick={() => !isDisabled && handleFilterSelect(f.id)}
              disabled={isDisabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-pink-400 text-bg-primary'
                  : isDisabled
                    ? 'bg-bg-secondary text-text-ghost cursor-not-allowed'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {f.label}
              {isDisabled && <span className="ml-1 text-[9px]">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Group filter */}
      {songCounts.groups.length > 0 && (
        <>
          <SectionLabel>Or pick a group</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {visibleGroups.map(g => {
              const count = getGroupCount(g);
              const isDisabled = count < minSongs;
              const isActive = selectedGroup === g.slug;

              return (
                <button
                  key={g.slug}
                  onClick={() => !isDisabled && handleGroupSelect(g.slug)}
                  disabled={isDisabled}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-pink-400 text-bg-primary'
                      : isDisabled
                        ? 'bg-bg-secondary text-text-ghost cursor-not-allowed'
                        : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  {g.name}
                  {isDisabled && <span className="ml-1 text-[9px]">({count})</span>}
                </button>
              );
            })}
          </div>
          {songCounts.groups.length > 8 && (
            <button
              onClick={() => setShowAllGroups(!showAllGroups)}
              className="text-[11px] text-text-tertiary mb-4 hover:text-text-secondary"
            >
              {showAllGroups ? 'Show less' : `Show all ${songCounts.groups.length} groups`}
            </button>
          )}
        </>
      )}

      {/* Song count + Play */}
      <div className="mt-4">
        <p className="text-xs text-text-tertiary text-center mb-3">
          {availableSongs} songs available
          {!canPlay && <span className="text-wrong"> - need {minSongs}+ to play</span>}
        </p>
        <button
          onClick={handlePlay}
          disabled={!canPlay}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${
            canPlay
              ? 'bg-pink-400 text-bg-primary active:scale-[0.98]'
              : 'bg-bg-tertiary text-text-ghost cursor-not-allowed'
          }`}
        >
          Play
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2.5">
      {children}
    </p>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    Easy: 'bg-correct-bg text-correct',
    Medium: 'bg-streak-bg text-streak',
    Hard: 'bg-wrong-bg text-wrong',
  };
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-px rounded-md mt-1.5 inline-block ${styles[difficulty] ?? ''}`}>
      {difficulty}
    </span>
  );
}
