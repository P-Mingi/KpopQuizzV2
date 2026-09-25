'use client';

import { useId, useRef } from 'react';

import { Sheet } from './sheet';

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  /** The destructive / leaving choice ("Leave"): ghost. */
  confirmLabel: string;
  /** The safe choice ("Keep playing"): primary, focused first. */
  cancelLabel: string;
  onConfirm: () => void;
  /** Also called by Escape and the backdrop. */
  onCancel: () => void;
  /** Kit gallery only: render in the page flow. */
  inline?: boolean;
}

/**
 * Confirm sheet (role=alertdialog), e.g. "Leave this quiz?" (16.7 quit confirm):
 * the safe action is primary and gets the focus; Escape and the backdrop cancel.
 */
export function ConfirmSheet({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel, inline }: ConfirmSheetProps): React.ReactElement | null {
  const keep = useRef<HTMLButtonElement>(null);
  const pid = `ux-confirm-p-${useId().replace(/:/g, '')}`;
  return (
    <Sheet open={open} onClose={onCancel} title={title} role="alertdialog" hideClose width={400} initialFocus={keep} describedBy={pid} inline={inline}>
      <p className="ux-sh-p" id={pid}>{body}</p>
      <div className="ux-sh-foot">
        <button type="button" className="ux-btn ux-btn-ghost" onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" ref={keep} className="ux-btn ux-btn-primary" onClick={onCancel}>{cancelLabel}</button>
      </div>
    </Sheet>
  );
}
