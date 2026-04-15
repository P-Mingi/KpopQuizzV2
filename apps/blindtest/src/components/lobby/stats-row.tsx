export function StatsRow({ totalGames, totalCorrect, totalSongsPlayed, longestStreak }: {
  totalGames: number;
  totalCorrect: number;
  totalSongsPlayed: number;
  longestStreak: number;
}) {
  const accuracy = totalSongsPlayed > 0
    ? `${Math.round((totalCorrect / totalSongsPlayed) * 100)}%`
    : '0%';

  return (
    <div className="w-full grid grid-cols-3 gap-1.5">
      {[
        { value: totalGames, label: 'Games' },
        { value: accuracy, label: 'Accuracy' },
        { value: longestStreak, label: 'Best streak' },
      ].map((s) => (
        <div key={s.label} className="px-2.5 py-2.5 rounded-[10px] bg-primary border border-subtle text-center">
          <p className="text-base font-medium text-primary">{s.value}</p>
          <p className="text-[9px] text-ghost">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
