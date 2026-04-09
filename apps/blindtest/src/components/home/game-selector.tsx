'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModeCard } from './mode-card';
import { GroupBrowser, type BrowserGroup } from './group-browser';

interface PlaylistStats {
  categories: Array<{ id: string; name: string; count: number }>;
  groups: BrowserGroup[];
  total: number;
  difficultyStats: { easy: number; medium: number; hard: number };
}

interface Props {
  playlists: PlaylistStats;
}

const MODES = [
  { id: 'quick' as const, name: 'Quick play', description: '4 choices, 15s' },
  { id: 'challenge' as const, name: 'Challenge', description: 'Type answer, 1.5x' },
];

const DIFFICULTIES = [
  { id: 'all', label: 'Smart mix' },
  { id: 'hits', label: 'Hits only' },
  { id: 'deep', label: 'Deep cuts' },
] as const;

export function GameSelector({ playlists }: Props) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'quick' | 'challenge'>('quick');
  const [selectedPlaylist, setSelectedPlaylist] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'hits' | 'deep'>('all');
  const [showGroupBrowser, setShowGroupBrowser] = useState(false);

  const playlistName =
    playlists.categories.find((c) => c.id === selectedPlaylist)?.name ??
    playlists.groups.find((g) => g.name === selectedPlaylist)?.name ??
    selectedPlaylist;

  const modeLabel = selectedMode === 'quick' ? 'Quick play' : 'Challenge';
  const difficultyLabel = DIFFICULTIES.find((d) => d.id === selectedDifficulty)?.label ?? 'Smart mix';

  const handlePlay = () => {
    const params = new URLSearchParams({
      playlist: selectedPlaylist,
      mode: selectedMode,
      difficulty: selectedDifficulty,
    });
    router.push(`/play?${params.toString()}`);
  };

  // Top 8 groups by song count (playlists.groups is already sorted desc by count).
  const popularGroups = playlists.groups.slice(0, 8);
  // If the selected playlist is a group that's NOT in the top 8, surface it so the
  // user can see what's currently picked without reopening the browser.
  const selectedGroup = playlists.groups.find((g) => g.name === selectedPlaylist);
  const extraSelectedGroup =
    selectedGroup && !popularGroups.find((g) => g.id === selectedGroup.id) ? selectedGroup : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Mode picker */}
      <div className="flex gap-2">
        {MODES.map((m) => (
          <ModeCard
            key={m.id}
            name={m.name}
            description={m.description}
            active={selectedMode === m.id}
            onClick={() => setSelectedMode(m.id)}
          />
        ))}
      </div>

      {/* Playlist categories */}
      <section>
        <SectionLabel>Playlist</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {playlists.categories.map((cat) => (
            <Pill
              key={cat.id}
              active={selectedPlaylist === cat.id}
              onClick={() => setSelectedPlaylist(cat.id)}
            >
              {cat.name}
            </Pill>
          ))}
        </div>
      </section>

      {/* Popular groups (top 8) + Browse all */}
      {playlists.groups.length > 0 && (
        <section>
          <SectionLabel>Popular groups</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {popularGroups.map((g) => (
              <Pill
                key={g.id}
                active={selectedPlaylist === g.name}
                onClick={() => setSelectedPlaylist(g.name)}
                variant="elevated"
              >
                {g.name}
              </Pill>
            ))}
            {extraSelectedGroup && (
              <Pill
                key={extraSelectedGroup.id}
                active
                onClick={() => setSelectedPlaylist(extraSelectedGroup.name)}
                variant="elevated"
              >
                {extraSelectedGroup.name}
              </Pill>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowGroupBrowser(true)}
            className="w-full mt-2 py-2.5 rounded-[10px] bg-surface border border-default text-xs font-medium text-tertiary hover:border-accent hover:text-accent transition-colors"
          >
            Browse all {playlists.groups.length} artists
          </button>
        </section>
      )}

      {/* Difficulty (compact) */}
      <section>
        <SectionLabel>Difficulty</SectionLabel>
        <div className="flex gap-1.5">
          {DIFFICULTIES.map((d) => {
            const active = selectedDifficulty === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDifficulty(d.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-medium transition-colors active:scale-[0.97] ${
                  active
                    ? 'bg-accent text-primary'
                    : 'bg-surface border border-default text-tertiary hover:border-accent'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Big PLAY button */}
      <div className="mt-1">
        <button
          type="button"
          onClick={handlePlay}
          className="w-full py-4 rounded-2xl bg-accent text-primary text-lg font-bold tracking-wide active:scale-[0.98] transition-transform"
        >
          PLAY
        </button>
        <p className="text-center text-[10px] text-ghost mt-2">
          {modeLabel} - {playlistName} - {difficultyLabel}
        </p>
      </div>

      {/* Group browser overlay */}
      {showGroupBrowser && (
        <GroupBrowser
          groups={playlists.groups}
          selectedPlaylist={selectedPlaylist}
          onSelect={(name) => setSelectedPlaylist(name)}
          onClose={() => setShowGroupBrowser(false)}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ghost mb-2">
      {children}
    </p>
  );
}

function Pill({
  children,
  active,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'elevated';
}) {
  const activeClasses = 'bg-accent text-primary border border-accent';
  const inactive =
    variant === 'elevated'
      ? 'bg-elevated text-primary border border-transparent hover:border-accent'
      : 'bg-surface text-tertiary border border-default hover:border-accent';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-[12px] font-medium transition-colors active:scale-[0.97] ${
        active ? activeClasses : inactive
      }`}
    >
      {children}
    </button>
  );
}
