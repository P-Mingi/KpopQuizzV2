'use client';

interface TimerCircleProps {
  seconds: number;
  isUrgent: boolean;
}

export function TimerCircle({ seconds, isUrgent }: TimerCircleProps): React.ReactElement {
  return (
    <div
      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
        isUrgent
          ? 'border-wrong-accent text-wrong-accent'
          : 'border-border-light text-txt-secondary'
      }`}
    >
      {seconds}
    </div>
  );
}
