'use client';

import { createContext, useContext } from 'react';

import type { RunApi } from './use-run';
import type { BoardResponse } from '@/lib/ux-v1/p6/board-types';
import type { BtGroup, BtPick } from '@/lib/ux-v1/p6/playlists';

/** What the hub islands (setup, ways to play, board, play by group) share with the controller. */
export interface HubApi {
  run: RunApi;
  groups: BtGroup[];
  /** Active songs in the pool (the "All K-pop" count). */
  songs: number;
  pick: BtPick;
  setPick: (p: BtPick) => void;
  rounds: number;
  setRounds: (n: number) => void;
  /** null until GET /api/ux-v1/p6/board answers (or when it fails). */
  board: BoardResponse | null;
  /** One try per day used (this browser, or the signed-in account's board row). */
  playedToday: boolean;
  /** Start a free run with the setup's playlist and length (inside the tap). */
  startSelected: () => void;
  /** Start a free run of one group (Play by group). */
  startGroup: (g: BtGroup) => void;
  /** Blindtest of the day: starts it, or shows today's board when already played. */
  playDaily: () => void;
}

export const HubCtx = createContext<HubApi | null>(null);

export function useHub(): HubApi | null {
  return useContext(HubCtx);
}
