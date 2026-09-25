'use client';

import { Icon } from './icon';
import { UxPopover } from './popover';

interface UxDropdownProps {
  /** Control name shown when nothing is picked ("Type", "Level", "Group"). */
  label: string;
  /** Current value (null = nothing picked). */
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Filter dropdown (44px pill + menu of radio items). Picking adds a removable chip
 * on the page (the page owns the chips). aria-haspopup=menu + aria-expanded (16.9).
 */
export function UxDropdown({ label, value, options, onChange, className }: UxDropdownProps): React.ReactElement {
  const current = options.find((o) => o.value === value);
  return (
    <UxPopover
      wrap
      menu
      label={label}
      className="ux-ddpop"
      trigger={(p) => (
        <button type="button" className={['ux-dd', className ?? ''].filter(Boolean).join(' ')} {...p}>
          {current ? <span>{label}: <b>{current.label}</b></span> : <span>{label}</span>}
          <Icon name="chev" />
        </button>
      )}
    >
      {(close) => options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="menuitemradio"
          aria-checked={o.value === value}
          className="ux-mi"
          onClick={() => { onChange(o.value); close(); }}
        >
          {o.label}
        </button>
      ))}
    </UxPopover>
  );
}
