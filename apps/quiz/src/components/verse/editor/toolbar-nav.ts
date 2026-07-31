'use client';

import { useCallback, useRef } from 'react';

// V-POLISH-2 B3 - the ROVING TOOLBAR. role="toolbar" promises arrow-key
// navigation with a single tab stop; the V-ROLES sweep downgraded to
// role="group" because no roving existed. This hook supplies the real
// contract: ArrowLeft/Right walk the buttons (wrapping), Home/End jump, and
// once focus enters, the toolbar collapses to one tab stop (focused button
// tabIndex 0, siblings -1). Attach ref + handlers to the toolbar container.
export function useToolbarNav(): {
  ref: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocusCapture: (e: React.FocusEvent) => void;
} {
  const ref = useRef<HTMLDivElement | null>(null);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const root = ref.current;
    if (!root) return;
    const btns = [...root.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (i === -1) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0
      : e.key === 'End' ? btns.length - 1
      : (i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
    btns[next]?.focus();
  }, []);

  const onFocusCapture = useCallback((e: React.FocusEvent) => {
    const root = ref.current;
    if (!root || !(e.target instanceof HTMLButtonElement)) return;
    for (const b of root.querySelectorAll<HTMLButtonElement>('button')) {
      b.tabIndex = b === e.target ? 0 : -1;
    }
  }, []);

  return { ref, onKeyDown, onFocusCapture };
}
