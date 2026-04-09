import { getTitleForLevel } from '@/lib/level-titles';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md';
}

/**
 * Pill showing `Lv.N Title` where `Title` comes from the K-pop fan culture
 * tier list (see `lib/level-titles.ts`). Uses the accent-bg tint.
 */
export function LevelBadge({ level, size = 'sm' }: LevelBadgeProps): React.ReactElement {
  const title = getTitleForLevel(level);
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full bg-accent-bg text-accent ${sizeClass}`}
    >
      Lv.{level} {title.en}
    </span>
  );
}
