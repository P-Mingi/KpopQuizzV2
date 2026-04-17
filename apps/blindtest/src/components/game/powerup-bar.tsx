'use client';

import type { PowerupId } from '@/lib/powerups';

const POWERUP_ICONS: Record<PowerupId, React.ReactElement> = {
  extra_time: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="7" cy="7" r="5" />
      <path d="M7 4.5v2.5l2 1.5" />
    </svg>
  ),
  fifty_fifty: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M3.5 7h7" />
      <circle cx="7" cy="7" r="5" />
    </svg>
  ),
  skip: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M4.5 9.5l5-5M9.5 9.5V4.5H4.5" />
    </svg>
  ),
};

const POWERUP_LABELS: Record<PowerupId, string> = {
  extra_time: '+5s',
  fifty_fifty: '50/50',
  skip: 'Skip',
};

export function PowerupBar({
  powerups,
  onUse,
  disabled,
}: {
  powerups: Record<PowerupId, number>;
  onUse: (id: PowerupId) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-1.5 md:gap-2 justify-center mt-3.5">
      {(Object.entries(powerups) as [PowerupId, number][]).map(([id, count]) => (
        <div key={id} className="flex flex-col items-center gap-[3px]">
          <button
            onClick={() => count > 0 && !disabled && onUse(id)}
            disabled={count === 0 || disabled}
            className="w-[34px] h-[34px] md:w-[38px] md:h-[38px] rounded-lg bg-elevated border border-default flex items-center justify-center cursor-pointer relative transition-all hover:border-accent disabled:opacity-25 disabled:cursor-default text-secondary"
          >
            {POWERUP_ICONS[id]}
            {count > 0 && (
              <div className="absolute -top-[3px] -right-[3px] w-3.5 h-3.5 rounded-full bg-accent text-[7px] font-bold text-white flex items-center justify-center">
                {count}
              </div>
            )}
          </button>
          <span className="text-[8px] text-ghost font-medium">{POWERUP_LABELS[id]}</span>
        </div>
      ))}
    </div>
  );
}
