'use client';

import { useSyncExternalStore } from 'react';

const noop = (): (() => void) => () => {};

/** false during SSR and hydration, true after (and on the first render of anything
 *  mounted after hydration): for portals that need document.body, and for values that
 *  only the browser knows (the viewer, the clock). */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
