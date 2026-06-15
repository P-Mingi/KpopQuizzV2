'use client';

import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect runs synchronously after React commits DOM mutations but
// before the browser paints; fall back to useEffect on the server to avoid the
// SSR warning (it renders null there anyway).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Re-applies the persisted theme class to <html> after hydration.
 *
 * The blocking inline script in the root layout sets the class before first
 * paint (no FOUC), but React 19 then does a recovery client-render of the root
 * - an inline <script> in the component tree triggers it - which resets
 * <html className> and strips the script-added class. This layout effect runs
 * before the next paint and restores the class from localStorage, so the theme
 * survives a reload without a visible flash. Renders nothing.
 */
export function ThemeInit(): null {
  useIsomorphicLayoutEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored !== 'dark' && stored !== 'light') return; // system: no class
      const root = document.documentElement;
      if (!root.classList.contains(stored)) {
        root.classList.remove('light', 'dark');
        root.classList.add(stored);
      }
    } catch {
      // storage blocked - nothing to restore
    }
  }, []);

  return null;
}
