import type { SongResult } from './use-game-state';

export function RoundHistory({ results, totalRounds }: { results: SongResult[]; totalRounds: number }) {
  return (
    <div className="flex gap-[3px] justify-center mt-3.5">
      {Array.from({ length: totalRounds }).map((_, i) => {
        const result = results[i];
        const isCurrent = i === results.length;

        if (isCurrent) {
          return (
            <div key={i} className="w-[9px] h-[9px] rounded-full bg-[#D4537E] outline-2 outline outline-white/25" />
          );
        }

        if (!result) {
          return (
            <div key={i} className="w-[7px] h-[7px] md:w-2 md:h-2 rounded-full bg-white/10" />
          );
        }

        return (
          <div
            key={i}
            className={`w-[7px] h-[7px] md:w-2 md:h-2 rounded-full ${
              result.correct ? 'bg-white/60' : 'bg-white/20'
            }`}
          />
        );
      })}
    </div>
  );
}
