'use client';

import { useEffect } from 'react';

/**
 * Client-side shell mode (DESIGN-SPEC 16.5 focus mode): while `mode` is set, the
 * nav, tab bar and footer are hidden (`focus`, games) or the tab bar and footer
 * are hidden (`create`). Use it when the mode changes on the client (the quiz page
 * becoming the game); for a whole page use <UxPage shell="..."> (server, no flash).
 */
export function useShellMode(mode: 'focus' | 'create' | null): void {
  useEffect(() => {
    if (!mode) return;
    const root = document.documentElement;
    const cls = `ux-${mode}`;
    root.classList.add(cls);
    return () => { root.classList.remove(cls); };
  }, [mode]);
}
