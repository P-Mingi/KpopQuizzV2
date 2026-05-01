'use client';

import Link from 'next/link';

interface NameAllItem {
  name: string;
  color?: string;
  aliases?: string[];
  image_url?: string;
}

export interface NameAllGame {
  id: string;
  slug: string;
  title: string;
  game_type: 'name_all_members' | 'name_all_idols' | 'name_all_songs' | 'name_top_songs' | 'name_all_groups';
  sub_type?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  timer_seconds: number;
  play_count: number;
  data: {
    items: NameAllItem[];
    artist?: string;
    album?: string;
  };
  group?: {
    name: string;
    display_color: string;
  };
}

function getInitial(name: string) {
  if (!name) return '?';
  const cleaned = name.replace(/[()]/g, '').trim();
  return cleaned.charAt(0).toUpperCase();
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getGradientForIndex(index: number): string {
  const gradients = [
    'linear-gradient(135deg,#D4537E,#993556)',
    'linear-gradient(135deg,#185FA5,#0C447C)',
    'linear-gradient(135deg,#E24B4A,#A32D2D)',
    'linear-gradient(135deg,#7F77DD,#534AB7)',
    'linear-gradient(135deg,#BA7517,#854F0B)',
    'linear-gradient(135deg,#0F6E56,#085041)',
    'linear-gradient(135deg,#D85A30,#993C1D)',
    'linear-gradient(135deg,#378ADD,#185FA5)',
  ];
  return gradients[index % gradients.length]!;
}

function getDifficultyClasses(difficulty: string) {
  if (difficulty === 'easy') return 'bg-[#EAF3DE] text-[#27500A]';
  if (difficulty === 'medium') return 'bg-[#FAEEDA] text-[#633806]';
  return 'bg-[#FCEBEB] text-[#791F1F]';
}

function getDifficultyLabel(difficulty: string) {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function getTypeLabel(game: NameAllGame): string {
  if (game.game_type === 'name_all_members') {
    return `${game.data.items.length} members`;
  }
  if (game.sub_type === 'girl_idols') return 'Girl idols';
  if (game.sub_type === 'boy_idols') return 'Boy idols';
  if (game.sub_type === 'gen_groups') {
    if (game.title.toLowerCase().includes('4th')) return '4th gen';
    if (game.title.toLowerCase().includes('3rd')) return '3rd gen';
    if (game.title.toLowerCase().includes('2nd')) return '2nd gen';
    return 'Groups';
  }
  if (game.sub_type === 'album_songs') return 'Album';
  if (game.sub_type === 'top_hits') return 'Top hits';
  return 'Members';
}

function getMetaLine(game: NameAllGame): string {
  if (game.game_type === 'name_all_members' && game.group) {
    return `${game.group.name} / ${(game.play_count || 0).toLocaleString()} plays`;
  }
  if (game.game_type === 'name_all_songs' && game.data.artist) {
    return `${game.data.artist} / ${(game.play_count || 0).toLocaleString()} plays`;
  }
  if (game.game_type === 'name_top_songs' && game.data.artist) {
    return `${game.data.artist} / ${(game.play_count || 0).toLocaleString()} plays`;
  }
  return `${(game.play_count || 0).toLocaleString()} plays`;
}

function getGridLayout(itemCount: number): {
  gridCols: number;
  gridRows: number;
  totalCells: number;
  fullWidth: boolean;
} {
  // Member games (4-13 members): show all cells
  if (itemCount <= 5) {
    return { gridCols: 7, gridRows: 1, totalCells: 7, fullWidth: true };
  }
  if (itemCount <= 8) {
    return { gridCols: 7, gridRows: 1, totalCells: 7, fullWidth: true };
  }
  if (itemCount <= 13) {
    return { gridCols: 7, gridRows: 2, totalCells: 14, fullWidth: true };
  }
  // Idol/song games with many items: compact preview
  return { gridCols: 3, gridRows: 2, totalCells: 6, fullWidth: false };
}

export function NameAllCard({ game }: { game: NameAllGame }) {
  const items = game.data.items || [];
  const itemCount = items.length;
  const layout = getGridLayout(itemCount);

  // Decide which cells are "known" (show initial) vs "hidden" (show ?)
  // For visual variety, show roughly half known, half hidden
  const visibleCount = Math.min(
    Math.ceil(layout.totalCells / 2),
    itemCount
  );

  const cells: Array<{ known: boolean; item?: NameAllItem; index: number }> = [];
  let visibleFilled = 0;

  for (let i = 0; i < layout.totalCells; i++) {
    // Alternate known/hidden for visual rhythm
    const shouldBeVisible = visibleFilled < visibleCount && i % 2 === 0;
    if (shouldBeVisible && items[visibleFilled]) {
      cells.push({ known: true, item: items[visibleFilled]!, index: visibleFilled });
      visibleFilled++;
    } else {
      cells.push({ known: false, index: i });
    }
  }

  const typeLabel = getTypeLabel(game);
  const showCount = game.game_type !== 'name_all_members' && itemCount > 5;

  return (
    <Link
      href={`/games/name-all/${game.slug}`}
      className={`${
        layout.fullWidth ? 'col-span-2' : ''
      } rounded-2xl border-[1.5px] border-[#E8E6E0] bg-white overflow-hidden cursor-pointer hover:border-[#D4537E] hover:-translate-y-[2px] transition-all block`}
    >
      {/* Banner — 140px tall with grid of cells */}
      <div className="h-[140px] relative overflow-hidden">
        {/* Grid of cells */}
        <div
          className="absolute inset-0 grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${layout.gridCols}, 1fr)`,
            gridTemplateRows: `repeat(${layout.gridRows}, 1fr)`,
          }}
        >
          {cells.map((cell, i) => {
            if (cell.known && cell.item) {
              return cell.item.image_url ? (
                <div key={i} className="overflow-hidden relative">
                  <img
                    src={cell.item.image_url}
                    alt={cell.item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  key={i}
                  className="flex items-center justify-center text-white font-medium overflow-hidden relative"
                  style={{
                    background: cell.item.color
                      ? `linear-gradient(135deg, ${cell.item.color}, ${cell.item.color}cc)`
                      : getGradientForIndex(cell.index),
                    fontSize: layout.gridRows > 1 ? '16px' : '20px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  {getInitial(cell.item.name)}
                </div>
              );
            }
            return (
              <div
                key={i}
                className="bg-[#2C2C2A] flex items-center justify-center relative"
              >
                <span
                  className="text-white/40 font-medium"
                  style={{ fontSize: layout.gridRows > 1 ? '22px' : '28px' }}
                >
                  ?
                </span>
              </div>
            );
          })}
        </div>

        {/* Dark gradient overlay for text readability */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
          }}
        />

        {/* Difficulty pill — top left */}
        <span
          className={`absolute top-2 left-2 px-[7px] py-[3px] rounded-[5px] text-[9px] font-medium z-[3] ${getDifficultyClasses(
            game.difficulty
          )}`}
        >
          {getDifficultyLabel(game.difficulty)}
        </span>

        {/* Timer pill — top right */}
        <span className="absolute top-2 right-2 px-[7px] py-[3px] rounded-[5px] text-[9px] font-medium bg-white/95 text-[#2C2C2A] z-[3] flex items-center gap-[3px]">
          <svg
            width="9"
            height="9"
            viewBox="0 0 9 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <circle cx="4.5" cy="4.5" r="3.5" />
            <path d="M4.5 2.5v2l1.5 1" strokeLinecap="round" />
          </svg>
          {formatTimer(game.timer_seconds)}
        </span>

        {/* Type badge — bottom left */}
        <span className="absolute bottom-2 left-2 px-2 py-[3px] rounded-[5px] text-[9px] font-medium bg-white/95 text-[#2C2C2A] z-[3]">
          {typeLabel}
        </span>

        {/* Count badge — bottom right (only for idol/song games) */}
        {showCount && (
          <span className="absolute bottom-2 right-2 px-2 py-[3px] rounded-[5px] text-[9px] font-medium bg-black/50 text-white z-[3]">
            {itemCount} {game.game_type === 'name_all_idols' ? 'idols' : game.game_type === 'name_all_songs' || game.game_type === 'name_top_songs' ? 'songs' : 'groups'}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
          {game.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {getMetaLine(game)}
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 7px', borderRadius: 9999,
            background: '#FFF7E0', color: '#B98800',
            fontSize: 10, fontWeight: 800,
          }}>{'\u2B50'} +{itemCount * 10}</span>
        </div>
      </div>
    </Link>
  );
}
