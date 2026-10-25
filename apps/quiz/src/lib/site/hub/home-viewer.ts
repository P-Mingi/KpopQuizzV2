// Run O1, lot H2a: the signed-in fan of the home. The username and the level come from the passport (readHubPassport, any error reads
// as signed out); the progress to the next level and the streaks are the design's samples until lot H2b reads them (H2b wires
// progress and streaks, then the sample numbers below go).

import { readHubPassport } from './passport-summary';

import type { HomeViewer } from './home-types';

/** The signed-in fan, or null (signed out, or any error). */
export async function loadHomeViewer(): Promise<HomeViewer | null> {
  const passport = await readHubPassport();
  if (!passport) return null;
  return {
    username: passport.username,
    level: passport.level,
    sitesJoined: passport.sites.length,
    progress: 72,
    streaks: { kpop: 6, anime: 2 },
  };
}
