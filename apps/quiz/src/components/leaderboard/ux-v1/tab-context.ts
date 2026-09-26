'use client';

import { createContext, useContext } from 'react';

/** Which leaderboard tab is open, and which ones have been opened at least once
 *  (the Ranked pane reads the ranked API only once its tab is opened). */
export interface LbTabState {
  active: string;
  seen: ReadonlySet<string>;
}

export const LbTabContext = createContext<LbTabState>({ active: 'war', seen: new Set(['war']) });

export function useLbTab(): LbTabState {
  return useContext(LbTabContext);
}
