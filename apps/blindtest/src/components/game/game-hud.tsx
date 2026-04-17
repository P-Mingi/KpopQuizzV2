export function GameHUD({
  round,
  totalRounds,
  score,
  comboStreak,
  mode,
  rankTitle,
  onQuit,
}: {
  round: number;
  totalRounds: number;
  score: number;
  comboStreak: number;
  mode: string;
  rankTitle?: string;
  onQuit?: () => void;
}) {
  return (
    <>
      {/* Timer bar at very top */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-elevated z-20">
        <div
          className="h-[3px] bg-accent rounded-r-sm transition-all duration-300 ease-linear"
          style={{ width: `${(round / totalRounds) * 100}%` }}
        />
      </div>

      {/* Top bar */}
      <div className="flex justify-between items-center pt-3 px-3.5 md:px-4">
        <button onClick={onQuit} className="text-[11px] text-ghost font-medium cursor-pointer">Quit</button>
        {comboStreak >= 2 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-bg border border-accent-border text-xs font-medium text-accent">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="var(--combo)">
              <path d="M7 1c0 3-2 4-2 6.5C5 9.5 6 11 7 11s2-1.5 2-3.5C9 5 7 4 7 1z" />
            </svg>
            x{Math.min(comboStreak, 5)} combo
          </div>
        )}
        <span className="text-[11px] text-ghost font-medium tabular-nums">{score.toLocaleString()} pts</span>
      </div>

      {/* Progress info */}
      <div className="flex justify-between items-center px-3.5 md:px-4 mt-1">
        <span className="text-[9px] md:text-[10px] text-ghost tabular-nums">{round} / {totalRounds}</span>
        {mode === 'ranked' && rankTitle && (
          <span className="text-[9px] md:text-[10px] text-ghost capitalize">Ranked - {rankTitle}</span>
        )}
      </div>
    </>
  );
}
