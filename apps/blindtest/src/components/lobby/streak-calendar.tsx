'use client';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakCalendar({ currentStreak }: { currentStreak: number }) {
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const todayIdx = today === 0 ? 6 : today - 1; // 0=Mon

  return (
    <div className="w-full flex items-center gap-1 px-3 py-2.5 rounded-[10px] bg-primary border border-subtle">
      {DAYS.map((day, i) => {
        const isDone = i < todayIdx && i >= todayIdx - Math.min(currentStreak, todayIdx);
        const isToday = i === todayIdx;

        return (
          <div
            key={i}
            className={`w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-[9px] font-medium transition-colors ${
              isToday
                ? 'bg-accent text-white'
                : isDone
                ? 'bg-accent-bg text-accent'
                : 'bg-elevated text-ghost'
            }`}
          >
            {day}
          </div>
        );
      })}
      <span className="text-[9px] text-ghost ml-auto font-medium">
        {currentStreak > 0 ? `${currentStreak} day streak` : 'No streak'}
      </span>
    </div>
  );
}
