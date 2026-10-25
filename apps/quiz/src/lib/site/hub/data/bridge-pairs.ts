// Run O1, lot H2b: the hand-picked pairs of the bridge card of For you (Plan.dc.html, section 3.B): "les fans de X jouent aussi Y". They
// are used while fewer than 30 passport players play both sides of a pair (for-you.ts, MIN_COMMON). Each pair rests on a published fact:
// the group sang a theme of the series. Group and series are named by their slug in the database; a pair whose slugs do not exist is
// ignored. Checked on 2026-10-25 against the published trivia rows (Wikipedia: Tower of God season 1, Solo Leveling seasons 1 and 2).

export interface BridgePair {
  /** groups.slug of the K-pop group. */
  readonly kpop: string;
  /** groups.slug of the anime series. */
  readonly anime: string;
  /** Why they go together, for the data report and tests. */
  readonly basis: string;
}

export const BRIDGE_PAIRS: readonly BridgePair[] = [
  { kpop: 'stray-kids', anime: 'tower-of-god', basis: 'Stray Kids sang both songs that frame season one of Tower of God.' },
  { kpop: 'stray-kids', anime: 'solo-leveling', basis: 'Felix of Stray Kids features on the season two opening of Solo Leveling.' },
  { kpop: 'txt', anime: 'solo-leveling', basis: 'Tomorrow X Together features on the season one opening of Solo Leveling.' },
];

/** Players of both sides needed before the passport count replaces the hand-picked pairs. */
export const MIN_COMMON = 30;
