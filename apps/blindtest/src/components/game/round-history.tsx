import type { SongResult } from './use-game-state';

export function RoundHistory({ results, totalRounds }: { results: SongResult[]; totalRounds: number }) {
  return (
    <div className="flex gap-[3px] justify-center mt-2.5">
      {Array.from({ length: totalRounds }).map((_, i) => {
        const result = results[i];
        return (
          <div
            key={i}
            className={`w-[18px] h-[18px] md:w-[22px] md:h-[22px] rounded-[5px] md:rounded-md flex items-center justify-center ${
              !result
                ? 'bg-elevated'
                : result.correct
                ? 'bg-[#EAF3DE]'
                : 'bg-[#FCEBEB]'
            }`}
          >
            {result?.correct && (
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 5.5L4.2 7.5L8 3" />
              </svg>
            )}
            {result && !result.correct && (
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#791F1F" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l4 4M7 3L3 7" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
