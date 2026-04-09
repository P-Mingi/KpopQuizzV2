import type { Difficulty } from '@/lib/db/types';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
}

const STYLES: Record<Difficulty, string> = {
  easy: 'bg-easy-bg text-easy-text',
  medium: 'bg-medium-bg text-medium-text',
  hard: 'bg-hard-bg text-hard-text',
};

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps): React.ReactElement {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STYLES[difficulty]}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}
