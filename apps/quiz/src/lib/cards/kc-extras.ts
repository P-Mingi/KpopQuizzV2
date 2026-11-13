// KpopCards: the fields of the wallet that agent A's contract adds on top of types.ts WalletState (the lobby, the bell and the top bar read them). All optional, so
// a payload without them still renders: the pages say nothing rather than invent a number.
import type { WalletState } from './types';

export interface KcWalletExtras {
  /** Packs the player has opened (a golden pack is every 10th), null when unknown. */
  packsOpened?: number | null;
  /** The pack of the day was opened today. */
  dailyUsed?: boolean;
  /** Sets (and the weekly list) complete and not yet claimed: the badge of the Missions tab. */
  claimable?: number;
  /** The player's chosen theme of the centre pack. */
  theme?: string | null;
  /** The group of the focus pack picker. */
  focusGroup?: string | null;
}
export type KcWallet = WalletState & KcWalletExtras;

/** The next pack is golden when the number of packs opened so far ends in 9 (every 10th pack, fifth card Holo or better). */
export function goldenNext(opened: number | null | undefined): boolean {
  return opened != null && (opened + 1) % 10 === 0;
}
/** Packs left up to and including the next golden one (1 = the next pack). */
export function goldenIn(opened: number | null | undefined): number | null {
  return opened == null ? null : 10 - (opened % 10);
}
