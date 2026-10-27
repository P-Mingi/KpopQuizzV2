// Run O1, lot H2c: the data of the two doors of the hero (a card per site: tagline, pills, one quiz, the way in). The counts are the
// real number of published quizzes per site and of groups or series that have one (getDoors, cached an hour); the quiz is the Top
// now one (KpopQuiz) or the Just added one (OtakuQuiz while it has less than a week of data). The names come from the registry.
// No door when the data is missing: the hero then shows the title and Surprise me only.

import { REGISTRY } from '@/lib/site/registry';

import { getDoors } from './data';
import { count } from './home-map';
import { safeBlock } from './home-safe';

import type { HubDoor } from './data';
import type { HomeDoor, HomeSite } from './home-types';

/** What each site is about, in words (the design's tagline), and the features its pill names. These are not numbers. */
const TAGLINE: Readonly<Record<HomeSite, string>> = {
  kpop: 'Groups, eras, members, songs',
  anime: 'Series, arcs, characters, openings',
};
const FEATURES: Readonly<Record<HomeSite, readonly string[]>> = {
  kpop: ['Daily blindtest', 'Which member are you'],
  anime: [],
};

export function toHomeDoor(door: HubDoor): HomeDoor {
  const quizzes = `${count(door.quizCount)} quizzes`;
  const topics = `${count(door.topicCount)} ${door.topicLabel}`;
  // The design's "New site" pill belongs to OtakuQuiz's first week, the same rule as its Just added quiz.
  const isNew = door.site === 'anime' && door.featuredLabel === 'Just added';
  const chips = door.site === 'kpop' ? [quizzes, ...FEATURES.kpop] : [quizzes, topics, ...(isNew ? ['New site'] : [])];
  return {
    site: door.site,
    name: REGISTRY[door.site].brand.name,
    tagline: TAGLINE[door.site],
    chips,
    phoneLine: door.site === 'kpop' ? quizzes : `${quizzes} · ${topics}`,
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
