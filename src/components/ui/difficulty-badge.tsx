import type { Difficulty } from '@/lib/db/types';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
}

const STYLES: Record<Difficulty, string> = {
  easy: 'bg-difficulty-easy-bg text-difficulty-easy-text',
  medium: 'bg-difficulty-medium-bg text-difficulty-medium-text',
  hard: 'bg-difficulty-hard-bg text-difficulty-hard-text',
};

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps): React.ReactElement {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STYLES[difficulty]}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}
