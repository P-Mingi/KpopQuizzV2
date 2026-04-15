import { getRank, getNextRank, getRankProgress } from '@/lib/ranks';

export function XpProgressBar({ totalXp }: { totalXp: number }) {
  const rank = getRank(totalXp);
  const next = getNextRank(totalXp);
  const progress = getRankProgress(totalXp);

  return (
    <div className="w-full max-w-[280px]">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] font-medium capitalize" style={{ color: rank.color }}>
          {rank.label}
        </span>
        {next && (
          <span className="text-[9px] text-ghost tabular-nums">
            {totalXp.toLocaleString()} / {next.xp.toLocaleString()} XP
          </span>
        )}
      </div>
      <div className="h-[6px] rounded-full bg-elevated overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: rank.color }}
        />
      </div>
    </div>
  );
}
