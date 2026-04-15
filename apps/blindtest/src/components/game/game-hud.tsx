export function GameHUD({
  round,
  totalRounds,
  score,
  comboStreak,
  mode,
  rankTitle,
}: {
  round: number;
  totalRounds: number;
  score: number;
  comboStreak: number;
  mode: string;
  rankTitle?: string;
}) {
  return (
    <>
      {/* Top bar */}
      <div className="flex justify-between items-center mb-2 md:mb-3 px-1">
        <span className="text-[11px] text-ghost cursor-pointer">Quit</span>
        {comboStreak >= 2 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-bg border border-accent/20 text-xs font-medium text-accent">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="var(--combo)">
              <path d="M7 1c0 3-2 4-2 6.5C5 9.5 6 11 7 11s2-1.5 2-3.5C9 5 7 4 7 1z" />
            </svg>
            x{Math.min(comboStreak, 5)} combo
          </div>
        )}
        <span className="text-[11px] text-ghost tabular-nums">{score.toLocaleString()} pts</span>
      </div>

      {/* Health bar */}
      <div className="mb-2.5 md:mb-4">
        <div className="h-[5px] md:h-[6px] rounded-full bg-elevated overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${(round / totalRounds) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-[2px] md:mt-1 text-[9px] md:text-[10px] text-ghost">
          <span>{round} / {totalRounds}</span>
          {mode === 'ranked' && rankTitle && (
            <span className="capitalize">Ranked - {rankTitle}</span>
          )}
        </div>
      </div>
    </>
  );
}
