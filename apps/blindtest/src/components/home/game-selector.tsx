'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PlaylistStats {
  categories: Array<{ id: string; name: string; count: number }>;
  groups: Array<{ id: string; name: string; count: number }>;
  total: number;
  difficultyStats: { easy: number; medium: number; hard: number };
}

interface Props {
  playlists: PlaylistStats;
}

const DIFFICULTIES = [
  { id: 'all', name: 'All', desc: 'Smart mix' },
  { id: 'hits', name: 'Hits only', desc: 'Popular songs' },
  { id: 'deep', name: 'Deep cuts', desc: 'For real fans' },
];

export function GameSelector({ playlists }: Props) {
  const router = useRouter();
  const [selectedPlaylist, setSelectedPlaylist] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showAllGroups, setShowAllGroups] = useState(false);

  const playlistName =
    selectedPlaylist === 'all'
      ? 'All K-pop'
      : playlists.categories.find((c) => c.id === selectedPlaylist)?.name ??
        playlists.groups.find((g) => g.name === selectedPlaylist)?.name ??
        selectedPlaylist;

  const handlePlay = (mode: 'quick' | 'challenge') => {
    const params = new URLSearchParams({
      playlist: selectedPlaylist,
      mode,
      difficulty: selectedDifficulty,
    });
    router.push(`/play?${params.toString()}`);
  };

  const visibleGroups = showAllGroups ? playlists.groups : playlists.groups.slice(0, 8);
  const hiddenCount = playlists.groups.length - 8;

  return (
    <div>
      {/* Category pills */}
      <SectionLabel>Quick play</SectionLabel>
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

      {/* Group pills */}
      <SectionLabel className="mt-5">Pick a group</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {visibleGroups.map((g) => (
          <Pill
            key={g.id}
            active={selectedPlaylist === g.name}
            onClick={() => setSelectedPlaylist(g.name)}
            variant="elevated"
          >
            {g.name}
          </Pill>
        ))}
      </div>
      {playlists.groups.length > 8 && (
        <button
          onClick={() => setShowAllGroups(!showAllGroups)}
          className="text-xs text-text-ghost mt-2 hover:text-text-secondary transition-colors"
        >
          {showAllGroups ? 'Show less' : `+ ${hiddenCount} more groups`}
        </button>
      )}

      {/* Difficulty */}
      <SectionLabel className="mt-5">Difficulty</SectionLabel>
      <div className="flex gap-1.5">
        {DIFFICULTIES.map((d) => {
          const active = selectedDifficulty === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDifficulty(d.id)}
              className={`flex-1 py-2 px-3 rounded-xl text-center transition-all active:scale-[0.97] ${
                active
                  ? 'bg-pink-400 text-white'
                  : 'bg-bg-secondary border border-border-default text-text-secondary hover:border-pink-400'
              }`}
            >
              <span className="text-[13px] font-medium block">{d.name}</span>
              <span className={`text-[10px] block mt-0.5 ${active ? 'text-white/70' : 'text-text-ghost'}`}>
                {d.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Play buttons */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={() => handlePlay('quick')}
          className="flex-1 py-3.5 rounded-xl bg-pink-400 text-white text-[15px] font-semibold text-center active:scale-[0.98] transition-transform"
        >
          Play
        </button>
        <button
          onClick={() => handlePlay('challenge')}
          className="py-3.5 px-5 rounded-xl bg-bg-secondary border border-border-default text-text-secondary text-[13px] font-medium hover:border-pink-400 hover:text-pink-400 transition-colors"
        >
          Challenge
        </button>
      </div>

      <p className="text-center text-xs text-text-ghost mt-2">
        {playlistName} - {selectedDifficulty === 'all' ? 'Smart mix' : selectedDifficulty === 'hits' ? 'Hits only' : 'Deep cuts'}
      </p>
    </div>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2.5 ${className ?? ''}`}>
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
  const baseActive = 'bg-pink-400 text-white';
  const baseDefault =
    variant === 'elevated'
      ? 'bg-bg-tertiary text-text-primary hover:border-pink-400 border border-transparent'
      : 'bg-bg-secondary border border-border-default text-text-secondary hover:border-pink-400';

  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all active:scale-[0.97] ${
        active ? baseActive : baseDefault
      }`}
    >
      {children}
    </button>
  );
}
