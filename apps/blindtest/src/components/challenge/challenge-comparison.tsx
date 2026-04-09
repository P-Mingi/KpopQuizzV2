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

  const headline = playerWon
    ? 'You win!'
    : tied
    ? "It's a tie!"
    : `${creator.name} wins!`;

  return (
    <div className="w-full">
      <p className="text-center text-xl font-bold text-primary mb-4">{headline}</p>
      <div className="flex items-stretch gap-3">
        <SideCard side={creator} highlighted={creatorWon || tied} label={creator.name} />
        <div className="flex items-center">
          <span className="text-xs font-bold text-ghost">VS</span>
        </div>
        <SideCard side={player} highlighted={playerWon || tied} label="You" />
      </div>
    </div>
  );
}

function SideCard({ side, highlighted, label }: { side: Side; highlighted: boolean; label: string }) {
  return (
    <div
      className={`flex-1 p-4 rounded-xl border text-center transition-colors ${
        highlighted ? 'bg-accent-bg border-accent' : 'bg-surface border-default'
      }`}
    >
      <p className="text-[10px] text-ghost uppercase tracking-wider mb-1 truncate">{label}</p>
      <p className="text-2xl font-bold text-primary tabular-nums">
        {side.correct}/{side.total}
      </p>
      <p className={`text-sm font-semibold tabular-nums ${highlighted ? 'text-accent' : 'text-secondary'}`}>
        {side.score.toLocaleString()} pts
      </p>
      {side.time !== null && (
        <p className="text-[10px] text-ghost mt-1">{Math.round(side.time)}s</p>
      )}
    </div>
  );
}
