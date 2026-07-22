import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { formatCount } from '@/lib/utils';

interface XpProgressProps {
  xp: number;
}

export function XpProgress({ xp }: XpProgressProps): React.ReactElement {
  const info = getLevelInfo(xp);
  // Levels are uncapped, so there is always a next level to climb toward.
  const nextName = getTitleForLevel(info.level + 1).en;

  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1">
        <span className="text-primary">Level {info.level} - {info.name}</span>
        <span className="text-secondary">
          {formatCount(info.currentXp)} / {formatCount(info.xpForNextLevel ?? info.xpForCurrentLevel)} XP
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface">
        <div
          className="h-1.5 rounded-full bg-accent-light transition-[width] duration-400"
          style={{ width: `${info.progress}%` }}
        />
      </div>
      <p className="text-xs text-secondary mt-1">
        {`${formatCount((info.xpForNextLevel ?? info.currentXp) - info.currentXp)} XP to Level ${info.level + 1} (${nextName})`}
      </p>
    </div>
  );
}
