'use client';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps): React.ReactElement {
  return (
    <div className="h-1 rounded-full bg-surface-secondary overflow-hidden">
      <div
        className="h-1 rounded-full bg-accent-pink transition-[width] duration-400 ease-out"
        style={{ width: `${(current / total) * 100}%` }}
      />
    </div>
  );
}
