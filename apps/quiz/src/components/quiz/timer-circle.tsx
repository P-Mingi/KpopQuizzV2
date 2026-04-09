'use client';

interface TimerCircleProps {
  seconds: number;
  total: number;
  isUrgent: boolean;
}

/**
 * Circular SVG timer. A thin ring drains as time runs out. Switches to the
 * wrong color when there are 5s or fewer left.
 */
export function TimerCircle({ seconds, total, isUrgent }: TimerCircleProps): React.ReactElement {
  const size = 44;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const dashOffset = circumference * (1 - progress);
  const color = isUrgent ? 'var(--wrong)' : 'var(--accent)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 200ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-semibold tabular-nums ${isUrgent ? 'text-wrong' : 'text-primary'}`}>
          {seconds}
        </span>
      </div>
    </div>
  );
}
