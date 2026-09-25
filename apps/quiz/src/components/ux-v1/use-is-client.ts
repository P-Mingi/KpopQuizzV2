'use client';

import { useSyncExternalStore } from 'react';

const noop = (): (() => void) => () => {};

/** false during SSR and hydration, true after: for portals that need document.body. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
