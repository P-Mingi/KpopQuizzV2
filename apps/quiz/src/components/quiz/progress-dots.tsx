'use client';

interface ProgressDotsProps {
  /** Per-question result. true = correct, false = wrong, null = not yet answered */
  results: (boolean | null)[];
  current: number;
}

/**
 * Row of dots at the top of the playing screen. One dot per question. The
 * dot for the active question glows with the accent color; past correct
 * dots are green, past wrong dots are red, future dots are muted.
 */
export function ProgressDots({ results, current }: ProgressDotsProps): React.ReactElement {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {results.map((r, i) => {
        let cls = 'w-2 h-2 rounded-full bg-elevated';
        let style: React.CSSProperties = {};
        if (r === true) {
          cls = 'w-2 h-2 rounded-full bg-correct';
        } else if (r === false) {
          cls = 'w-2 h-2 rounded-full bg-wrong';
        } else if (i === current) {
          cls = 'w-2 h-2 rounded-full bg-accent';
          style = { boxShadow: '0 0 8px var(--accent)' };
        }
        return <span key={i} className={cls} style={style} />;
      })}
    </div>
  );
}
