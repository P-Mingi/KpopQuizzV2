import Link from 'next/link';

import { formatCount } from '@/lib/utils';
import { calculateAvgScore, getHardestSong } from '@/lib/blind-test-utils';

import type { GameCardData, BlindTestContent } from '@/lib/db/types';

interface GameCardProps {
  game: GameCardData;
}

export function GameCard({ game }: GameCardProps): React.ReactElement {
  const isBlindTest = game.game_type === 'blind_test';
  const blindContent = isBlindTest ? (game.content as BlindTestContent) : null;

  return (
    <Link href={`/g/${game.slug}`}>
      <div className="bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-2xl p-4 hover:border-[var(--border-medium)] transition-colors">
        {/* Badges */}
        <div className="flex gap-1.5 mb-2">
          {isBlindTest ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAECE7] text-[#712B13]">
              Blind Test
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#3C3489]">
              This or That
            </span>
          )}
          {game.group_name && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: game.display_color ?? '#F8F7F4', color: game.text_color ?? '#6B6B6B' }}
            >
              {game.group_name}
            </span>
          )}
          {blindContent && (
            <DifficultyBadge difficulty={blindContent.settings.difficulty} />
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium mb-3">{game.title}</p>

        {/* Blind test preview */}
        {isBlindTest && blindContent && game.play_count >= 10 && (
          <div className="bg-[var(--bg-secondary)] rounded-lg p-2.5 mb-3">
            <div className="flex justify-between text-[11px] font-medium">
              <span>Avg: {calculateAvgScore(blindContent.songs)}%</span>
              <span>Hardest: {getHardestSong(blindContent.songs)}</span>
            </div>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium"
              style={{ backgroundColor: game.creator_avatar_bg, color: game.creator_avatar_text }}
            >
              {game.creator_username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-[var(--text-secondary)]">by {game.creator_username}</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            {formatCount(game.play_count)} plays · {isBlindTest ? `${blindContent?.settings.song_count} songs` : `${game.matchup_count} matchups`}
          </span>
        </div>
      </div>
    </Link>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }): React.ReactElement {
  const colors: Record<string, { bg: string; text: string }> = {
    easy: { bg: 'var(--easy-bg)', text: 'var(--easy-text)' },
    medium: { bg: 'var(--medium-bg)', text: 'var(--medium-text)' },
    hard: { bg: 'var(--hard-bg)', text: 'var(--hard-text)' },
  };
  const c = colors[difficulty] ?? colors.medium!;

  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {difficulty}
    </span>
  );
}
