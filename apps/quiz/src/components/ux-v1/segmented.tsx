'use client';

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group (e.g. "Sort"). */
  label: string;
  className?: string;
}

/**
 * Segmented control (sort, 5/10/15, appearance): a group of toggle buttons with
 * aria-pressed (16.9). Active text pink-ink on the raised pill (17.1).
 */
export function Segmented<T extends string>({ options, value, onChange, label, className }: SegmentedProps<T>): React.ReactElement {
  return (
    <div className={['ux-seg', className ?? ''].filter(Boolean).join(' ')} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
