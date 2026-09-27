'use client';

import { createContext, useContext } from 'react';

import type { RunApi } from './use-run';
import type { ModeRun } from '@/lib/ux-v1/p6/modes';

/** What the Play island of a /blindtest/<mode> page shares with its controller. */
export interface ModeApi {
  run: RunApi;
  /** The run this page starts (lib/ux-v1/p6/modes.ts). */
  preset: ModeRun;
  /** Start the preset run (inside the tap: unlocks audio). */
  start: () => void;
}

export const ModeCtx = createContext<ModeApi | null>(null);

export function useMode(): ModeApi | null {
  return useContext(ModeCtx);
}
