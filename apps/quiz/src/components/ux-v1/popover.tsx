'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface PopoverTriggerProps {
  ref: React.RefObject<HTMLButtonElement | null>;
  onClick: () => void;
  'aria-haspopup': 'menu' | 'dialog';
  'aria-expanded': boolean;
  'aria-controls': string;
}

interface UxPopoverProps {
  /** Renders the trigger; spread the props onto a <button>. */
  trigger: (props: PopoverTriggerProps, open: boolean) => React.ReactNode;
  /** Popover content; `close()` closes it and returns focus to the trigger. */
  children: (close: () => void) => React.ReactNode;
  /** role=menu: arrow keys move between [role=menuitem] children, first item focused on open. */
  menu?: boolean;
  /** Accessible name of the popover (menus and dialogs). */
  label: string;
  className?: string;
  /** Wrap trigger + popover in a positioned span (dropdowns). The nav popovers
   *  position against .ux-nav-r instead (prototype: top 52, right 0). */
  wrap?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Popover / menu (bell panel, avatar menu, streak week, dropdowns). Closes on a
 * click outside, on Escape (focus returns to the trigger) and when focus leaves.
 * aria-haspopup / aria-expanded / aria-controls on the trigger (16.9). Phones: the
 * CSS turns it into a full-width panel under the top bar.
 */
export function UxPopover({ trigger, children, menu, label, className, wrap, onOpenChange }: UxPopoverProps): React.ReactElement {
  const [open, setOpenState] = useState(false);
  const id = `ux-pop-${useId().replace(/:/g, '')}`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Closing with focus return is state-driven (the effect below moves focus), so
  // the close() handed to the content never touches a ref during render.
  const [focusBack, setFocusBack] = useState(false);
  const setOpen = useCallback((v: boolean) => { setOpenState(v); onOpenChange?.(v); }, [onOpenChange]);
  const close = useCallback((refocus = true) => {
    setFocusBack(refocus);
    setOpen(false);
  }, [setOpen]);
  const closeAndRefocus = useCallback(() => close(true), [close]);

  useEffect(() => {
    if (!open && focusBack) triggerRef.current?.focus();
  }, [open, focusBack]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.stopPropagation(); close(true); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    if (menu) popRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, menu, close]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!menu || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End')) return;
    const items = Array.from(popRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
      : e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[n]?.focus();
  };

  const onBlur = (e: React.FocusEvent<HTMLDivElement>): void => {
    const next = e.relatedTarget as Node | null;
    if (next && !popRef.current?.contains(next) && !triggerRef.current?.contains(next)) setOpen(false);
  };

  const triggerProps: PopoverTriggerProps = {
    ref: triggerRef,
    onClick: () => { setFocusBack(false); setOpen(!open); },
    'aria-haspopup': menu ? 'menu' : 'dialog',
    'aria-expanded': open,
    'aria-controls': id,
  };

  const pop = (
    <div
      ref={popRef}
      id={id}
      className={['ux-pop', 'ux-layer', className ?? ''].filter(Boolean).join(' ')}
      role={menu ? 'menu' : 'dialog'}
      aria-label={label}
      hidden={!open}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      {open ? children(closeAndRefocus) : null}
    </div>
  );

  if (wrap) return <span className="ux-dd-wrap">{trigger(triggerProps, open)}{pop}</span>;
  return <>{trigger(triggerProps, open)}{pop}</>;
}
