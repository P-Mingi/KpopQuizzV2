import { getLevelInfo, LEVELS } from '@/lib/constants';
import { formatCount } from '@/lib/utils';

interface XpProgressProps {
  xp: number;
}

export function XpProgress({ xp }: XpProgressProps): React.ReactElement {
  const info = getLevelInfo(xp);
  const isMaxLevel = info.level === LEVELS[LEVELS.length - 1]!.level;

  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1">
        <span className="text-txt-primary">Level {info.level} - {info.name}</span>
        <span className="text-txt-secondary">
          {formatCount(info.currentXp)} / {info.xpForNextLevel !== null ? formatCount(info.xpForNextLevel) : formatCount(info.xpForCurrentLevel)} XP
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-secondary">
        <div
          className="h-1.5 rounded-full bg-accent-pink transition-[width] duration-400"
          style={{ width: `${info.progress}%` }}
        />
      </div>
      <p className="text-xs text-txt-secondary mt-1">
        {isMaxLevel
          ? 'Max level reached!'
          : `${formatCount(info.xpForNextLevel! - info.currentXp)} XP to Level ${info.level + 1} (${LEVELS.find(l => l.level === info.level + 1)?.name})`
        }
      </p>
    </div>
  );
}
