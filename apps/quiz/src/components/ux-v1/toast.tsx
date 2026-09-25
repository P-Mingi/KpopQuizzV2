'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface UxFeedback {
  /** Show a short toast (2.4s). The toast is itself a polite status region. */
  toast: (message: string) => void;
  /** Say something to screen readers only (game results, "Your quiz is live"). */
  announce: (message: string) => void;
}

const Ctx = createContext<UxFeedback>({ toast: () => {}, announce: () => {} });

/** Toast + aria-live region for v11 pages (DESIGN-SPEC 16.9). Mounted once by the
 *  shell (UxProviders); use useUxToast() anywhere under it. */
export function UxFeedbackProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [msg, setMsg] = useState('');
  const [shown, setShown] = useState(false);
  const [live, setLive] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const liveTimer = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setShown(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(false), 2400);
  }, []);

  const announce = useCallback((m: string) => {
    // Clear first so the same sentence twice is still announced.
    setLive('');
    window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => setLive(m), 30);
  }, []);

  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(liveTimer.current); }, []);

  const value = useMemo(() => ({ toast, announce }), [toast, announce]);

  return (
    <Ctx value={value}>
      {children}
      <div className="ux-layer">
        <div className={`ux-toast${shown ? ' is-shown' : ''}`} role="status" aria-live="polite" data-testid="ux-toast">{msg}</div>
        <div className="ux-sr" aria-live="polite" aria-atomic="true" data-testid="ux-live">{live}</div>
      </div>
    </Ctx>
  );
}

export function useUxToast(): UxFeedback['toast'] { return useContext(Ctx).toast; }
export function useAnnounce(): UxFeedback['announce'] { return useContext(Ctx).announce; }
