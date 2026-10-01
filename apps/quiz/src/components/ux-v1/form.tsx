'use client';

import { Icon } from './icon';

interface UxSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name (the visible row label). */
  label: string;
  disabled?: boolean;
  id?: string;
}

/** Settings switch (16.9: role=switch + aria-checked). On = ink, knob page colour (16.1). */
export function UxSwitch({ checked, onChange, label, disabled, id }: UxSwitchProps): React.ReactElement {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="ux-switch"
      onClick={() => onChange(!checked)}
    />
  );
}

interface UxCheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
  name?: string;
}

/** Native checkbox (16.9) drawn as the prototype's pink square; the label text is the children. */
export function UxCheckbox({ checked, onChange, children, disabled, name }: UxCheckboxProps): React.ReactElement {
  return (
    <label className="ux-check">
      <input type="checkbox" checked={checked} disabled={disabled} name={name} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true"><Icon name="check" /></i>
      <span>{children}</span>
    </label>
  );
}

interface UxFieldProps {
  label: string;
  /** Muted hint on the right of the label ("Optional", "5+ characters"). */
  hint?: string;
  htmlFor: string;
  help?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}

/** Labelled field wrapper: 15/600 label + hint, the control (.ux-inp), help or error. */
export function UxField({ label, hint, htmlFor, help, error, children, className }: UxFieldProps): React.ReactElement {
  return (
    <div className={['ux-field', className ?? ''].filter(Boolean).join(' ')}>
      <label htmlFor={htmlFor}>{label}{hint ? <small>{hint}</small> : null}</label>
      {children}
      {error ? <p className="ux-err" role="alert">{error}</p> : help ? <p className="ux-help">{help}</p> : null}
    </div>
  );
}
