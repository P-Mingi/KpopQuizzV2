interface Props {
  name: string;
  description: string;
  earned: boolean;
}

/**
 * Single achievement row in the profile achievements list.
 */
export function AchievementRow({ name, description, earned }: Props) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-subtle last:border-0">
      <div
        className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
          earned ? 'bg-accent-bg' : 'bg-elevated'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1L9.95 5.05L14 5.5L11 8.55L11.9 13L8 10.85L4.1 13L5 8.55L2 5.5L6.05 5.05L8 1Z"
            fill={earned ? 'var(--accent)' : 'var(--text-ghost)'}
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${earned ? 'text-primary' : 'text-tertiary'}`}>
          {name}
        </p>
        <p className="text-[10px] text-ghost truncate">{description}</p>
      </div>
      <span
        className={`text-[9px] font-semibold uppercase tracking-wide ${
          earned ? 'text-correct' : 'text-ghost'
        }`}
      >
        {earned ? 'Done' : 'Locked'}
      </span>
    </div>
  );
}
