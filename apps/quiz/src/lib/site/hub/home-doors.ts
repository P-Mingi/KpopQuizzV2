// Run O1, lot H2c: the data of the two doors of the hero (a card per site: tagline, pills, one quiz, the way in). The counts are the
// real number of published quizzes per site and of groups or series that have one (getDoors, cached an hour); the quiz is the Top
// now one (KpopQuiz) or the Just added one (OtakuQuiz while it has less than a week of data). The names come from the registry.
// No door when the data is missing: the hero then shows the title and Surprise me only.
// Home v3 (2026-10-29): the two site cards of the first row show the count of quizzes only, rounded down by the shared helper of the
// public counts (atLeast: "480+"), so the hub never prints a more precise number than the sites themselves.

import { REGISTRY } from '@/lib/site/registry';
import { atLeast } from '@/lib/stats/site-stats';

import { getDoors } from './data';
import { safeBlock } from './home-safe';

import type { HubDoor } from './data';
import type { HomeDoor, HomeSite } from './home-types';

/** What each site is about, in words (the design's tagline). These are not numbers. */
const TAGLINE: Readonly<Record<HomeSite, string>> = {
  kpop: 'Groups, eras, members, songs',
  anime: 'Series, arcs, characters, openings',
};

export function toHomeDoor(door: HubDoor): HomeDoor {
  return {
    site: door.site,
    name: REGISTRY[door.site].brand.name,
    tagline: TAGLINE[door.site],
    count: `${atLeast(door.quizCount)} quizzes`,
    spotlight: door.featured ? { label: door.featuredLabel, title: door.featured.title, path: door.featured.path } : null,
  };
}

/** The two doors, in the network's order; none when the data is missing. */
export async function loadHomeDoors(): Promise<readonly HomeDoor[]> {
  return safeBlock('doors', async () => {
    const doors = await getDoors();
    return doors ? [toHomeDoor(doors.kpop), toHomeDoor(doors.anime)] : [];
  }, []);
}
