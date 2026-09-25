'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from './icon';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  open: boolean;
  /** Called on X, Escape and a click on the backdrop (17.10: all three close). */
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Max width on desktop (prototype: 520 share, 440 sign-in, 480 header, 400 confirm). */
  width?: number | undefined;
  /** alertdialog = the confirm sheet (no X; Escape and backdrop still cancel). */
  role?: 'dialog' | 'alertdialog' | undefined;
  /** Hide the X (alert dialogs). */
  hideClose?: boolean | undefined;
  /** Element to focus on open (defaults to the first focusable control). */
  initialFocus?: React.RefObject<HTMLElement | null> | undefined;
  /** Id of the element that describes the dialog. */
  describedBy?: string | undefined;
  className?: string | undefined;
  /** Render the frame in the page flow (kit gallery only). */
  inline?: boolean | undefined;
}

/**
 * The shared sheet / dialog (DESIGN-SPEC 16.6, 17.10): centred card on desktop,
 * bottom sheet on phones (CSS). Portal to <body>, aria-modal, labelled by its
 * title, focus trapped (Tab / Shift+Tab cycle), page scroll locked. X, Escape and
 * a click on the backdrop close it, and focus returns to the element that opened
 * it. Renders nothing while closed (and nothing on the server).
 */
export function Sheet({ open, onClose, title, children, width, role = 'dialog', hideClose, initialFocus, describedBy, className, inline }: SheetProps): React.ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const titleId = `ux-sheet-t-${useId().replace(/:/g, '')}`;
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || inline) return;
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    const focusFirst = (): void => {
      const el = initialFocus?.current ?? ref.current?.querySelector<HTMLElement>(FOCUSABLE) ?? ref.current;
      el?.focus({ preventScroll: true });
    };
    const t = window.setTimeout(focusFirst, 30);

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) { e.preventDefault(); return; }
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !ref.current.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !ref.current.contains(active))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      root.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open, inline, initialFocus]);

  if (!open) return null;

  const frame = (
    <div
      ref={ref}
      className={['ux-sheet', className ?? ''].filter(Boolean).join(' ')}
      role={inline ? 'group' : role}
      aria-modal={inline ? undefined : true}
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      tabIndex={-1}
      style={width ? { width: `min(${width}px, calc(100% - 32px))` } : undefined}
    >
      <div className={['ux-sh-h', hideClose ? 'is-bare' : ''].filter(Boolean).join(' ')}>
        <h2 id={titleId}>{title}</h2>
        {hideClose ? null : (
          <button type="button" className="ux-ib" onClick={() => onCloseRef.current()} aria-label="Close">
            <Icon name="x" />
          </button>
        )}
      </div>
      <div className="ux-sh-b">{children}</div>
    </div>
  );

  // Inline = the same frame in the page flow (the /ux-v1/kit gallery shows every
  // sheet open, statically): no portal, no scrim, no focus trap, not modal.
  if (inline) return frame;
  if (!mounted) return null;

  return createPortal(
    <div className="ux-layer">
      <div className="ux-scrim" onClick={() => onCloseRef.current()} aria-hidden="true" data-testid="ux-scrim" />
      {frame}
    </div>,
    document.body,
  );
}
