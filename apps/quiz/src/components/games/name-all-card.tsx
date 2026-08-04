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

function getItemNoun(game: NameAllGame): string {
  if (game.game_type === 'name_all_members') return 'members';
  if (game.game_type === 'name_all_idols') return 'idols';
  if (game.game_type === 'name_all_songs' || game.game_type === 'name_top_songs') return 'songs';
  if (game.game_type === 'name_all_groups') return 'groups';
  return 'items';
}

function getMetaLine(game: NameAllGame): string {
  const plays = `${(game.play_count || 0).toLocaleString()} plays`;
  if (game.game_type === 'name_all_members' && game.group) return `${game.group.name} · ${plays}`;
  if ((game.game_type === 'name_all_songs' || game.game_type === 'name_top_songs') && game.data.artist) {
    return `${game.data.artist} · ${plays}`;
  }
  return plays;
}

/**
 * Name-all list card. A clean light card with an overlapping member-avatar
 * "roster" preview - instantly reads as "name these N people" without the noisy
 * reveal/hide tile grid. Distinct from the bold VS This-or-That card.
 */
export function NameAllCard({ game }: { game: NameAllGame }) {
  const items = game.data.items || [];
  const itemCount = items.length;
  const noun = getItemNoun(game);

  // Roster preview: up to 6 avatars, then a "+N" chip.
  const roster = items.slice(0, 6);
  const extra = itemCount - roster.length;

  const groupColor = game.group?.display_color;
  const coverBg = groupColor
    ? `radial-gradient(125% 130% at 50% 118%, ${groupColor}26, ${groupColor}0d 52%, var(--bg-surface))`
    : 'var(--surface-alt)';

  return (
    <Link
      href={`/games/name-all/${game.slug}`}
      aria-label={`${game.title}, name all game`}
      className="group block rounded-2xl border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-all duration-200 hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      {/* Cover: overlapping member avatars on a soft group-tinted field */}
      <div
        className="relative h-[128px] flex items-center justify-center overflow-hidden"
        style={{ background: coverBg }}
      >
        <div className="flex items-center">
          {roster.map((item, i) => (
            <div
              key={i}
              className="w-[54px] h-[54px] rounded-full overflow-hidden ring-2 ring-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center text-white font-semibold transition-transform duration-200 group-hover:scale-[1.04]"
              style={{
                marginLeft: i === 0 ? 0 : -16,
                zIndex: roster.length - i,
                fontSize: 15,
                background: item.color
                  ? `linear-gradient(135deg, ${item.color}, ${item.color}cc)`
                  : getGradientForIndex(i),
              }}
            >
              {/* Legal wall (G-HUB v2, mission point 6): CSS-art only, no idol
                  photos. The overlapping-circle roster preview stays, rendered as
                  initials on a gradient instead of licensed-only photos. */}
              {getInitial(item.name)}
            </div>
          ))}
          {extra > 0 && (
            <div
              className="w-[54px] h-[54px] rounded-full ring-2 ring-white bg-[var(--accent)] text-white flex items-center justify-center text-[13px] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
              style={{ marginLeft: -16, zIndex: 0 }}
            >
              +{extra}
            </div>
          )}
        </div>

        {/* Difficulty - top left */}
        <span
          className={`absolute top-2.5 left-2.5 px-2 py-[3px] rounded-md text-[10px] font-semibold ${getDifficultyClasses(game.difficulty)}`}
        >
          {getDifficultyLabel(game.difficulty)}
        </span>

        {/* Timer - top right */}
        <span className="absolute top-2.5 right-2.5 px-2 py-[3px] rounded-md text-[10px] font-semibold bg-white/85 text-[var(--text-secondary)] backdrop-blur-sm shadow-sm flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
          {formatTimer(game.timer_seconds)}
        </span>

        {/* Item count - bottom left */}
        <span className="absolute bottom-2.5 left-2.5 px-2 py-[3px] rounded-md text-[10px] font-semibold bg-white/85 text-[var(--text-secondary)] backdrop-blur-sm shadow-sm">
          {itemCount} {noun}
        </span>
      </div>

      {/* Body */}
      <div className="px-3.5 pt-2.5 pb-3">
        <p className="text-sm font-bold tracking-[-0.01em] text-[var(--text-primary)] leading-snug truncate">
          {game.title}
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-1.5">{getMetaLine(game)}</p>
      </div>
    </Link>
  );
}
