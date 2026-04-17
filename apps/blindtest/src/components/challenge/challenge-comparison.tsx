'use client';

interface Side {
  name: string;
  score: number;
  correct: number;
  total: number;
  time: number | null;
}

interface Props {
  creator: Side;
  player: Side;
}

/**
 * Side-by-side score comparison shown at the top of the ResultsScreen after
 * completing a challenge. The winning side gets the accent border/background.
 */
export function ChallengeComparison({ creator, player }: Props) {
  const playerWon = player.score > creator.score;
  const tied = player.score === creator.score;
  const creatorWon = !playerWon && !tied;

  const won = playerWon;

  return (
    <div className="w-full">
      {/* Avatars with VS */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {/* Player avatar */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)] border-2 border-[#D4537E] flex items-center justify-center">
            <span className="text-sm font-semibold text-[#D4537E]">You</span>
          </div>
          <span className="text-[10px] text-[#888780] dark:text-white/40 truncate max-w-[80px]">You</span>
        </div>

        <span className="text-xs font-bold text-[#888780] dark:text-white/40 px-2">VS</span>

        {/* Challenger avatar */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] border-2 border-[#E8E6E0] dark:border-[rgba(255,255,255,0.12)] flex items-center justify-center">
            <span className="text-sm font-semibold text-[#888780] dark:text-white/40">{creator.name.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-[10px] text-[#888780] dark:text-white/40 truncate max-w-[80px]">{creator.name}</span>
        </div>
      </div>

      {/* Score cards */}
      <div className="flex items-stretch gap-3 mb-3">
        <SideCard side={player} highlighted={playerWon || tied} label="You" />
        <SideCard side={creator} highlighted={creatorWon || tied} label={creator.name} />
      </div>

      {/* Result banner */}
      <div className={`p-3 rounded-xl text-center ${
        won ? 'bg-[#EAF3DE] dark:bg-[rgba(99,153,34,0.12)] border border-[#C0DD97]' :
        tied ? 'bg-[#FAEEDA] dark:bg-[rgba(186,117,23,0.12)] border border-[#FAC775]' :
        'bg-[#FCEBEB] dark:bg-[rgba(226,75,74,0.12)] border border-[#F7C1C1]'
      }`}>
        <p className={`text-sm font-semibold ${
          won ? 'text-[#27500A] dark:text-[#97C459]' :
          tied ? 'text-[#633806] dark:text-[#EF9F27]' :
          'text-[#791F1F] dark:text-[#F09595]'
        }`}>
          {won ? 'You win!' : tied ? "It's a tie!" : `${creator.name} wins!`}
        </p>
      </div>
    </div>
  );
}

function SideCard({ side, highlighted, label }: { side: Side; highlighted: boolean; label: string }) {
  return (
    <div
      className={`flex-1 p-4 rounded-xl border text-center transition-colors ${
        highlighted
          ? 'bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.08)] border-[#F4C0D1] dark:border-[rgba(212,83,126,0.25)]'
          : 'bg-white dark:bg-[rgba(255,255,255,0.04)] border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)]'
      }`}
    >
      <p className="text-[10px] text-[#888780] dark:text-white/40 uppercase tracking-wider mb-1 truncate">{label}</p>
      <p className="text-2xl font-bold text-primary tabular-nums">
        {side.correct}/{side.total}
      </p>
      <p className={`text-sm font-semibold tabular-nums ${highlighted ? 'text-[#D4537E]' : 'text-[#888780] dark:text-white/40'}`}>
        {side.score.toLocaleString()} pts
      </p>
      {side.time !== null && (
        <p className="text-[10px] text-[#888780] dark:text-white/40 mt-1">{Math.round(side.time)}s</p>
      )}
    </div>
  );
}
