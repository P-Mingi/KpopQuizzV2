// Run O1, lot H2b: the two doors of the hero. The real number of published quizzes per site, the real number of groups (K-pop) or series
// (anime) that have a published quiz, and one featured quiz: "Top now" (the first of the site in Hot right now) once the site has 7 days
// of data, else "Just added" (its newest published quiz). No number is written in the page: every one comes from here.

import { forSite } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';
import { REGISTRY } from '@/lib/site/registry';

import { hubCached } from './cache';
import { getHot } from './hot';
import { HUB_SITES, isListable, must, QUIZ_SELECT, resolveOrigins, siteName, toCard } from './util';

import type { Db } from './catalog';
import type { QuizRow } from './util';
import type { HubDoor, HubDoors, HubHot, HubOpts, HubOrigins, HubQuizCard, HubSite } from './types';

export async function countQuizzes(db: Db, site: HubSite): Promise<number> {
  const res = await forSite(db.from('quizzes').select('id', { count: 'exact', head: true }), site).eq('status', 'published');
  if (res.error) throw new Error(`quiz count ${site}: ${res.error.message}`);
  return res.count ?? 0;
}

/** Groups (K-pop) or series (anime) with at least one published quiz (groups.quiz_count). */
export async function countTopics(db: Db, site: HubSite): Promise<number> {
  const res = await forSite(db.from('groups').select('id', { count: 'exact', head: true }), site).gt('quiz_count', 0);
  if (res.error) throw new Error(`topic count ${site}: ${res.error.message}`);
  return res.count ?? 0;
}

/** The newest listable published quiz of a site. */
export async function newestQuiz(db: Db, site: HubSite): Promise<QuizRow | null> {
  const rows = must<QuizRow[]>(
    await forSite(db.from('quizzes').select(QUIZ_SELECT), site).eq('status', 'published').order('created_at', { ascending: false }).limit(10),
    `newest ${site}`,
  );
  return rows.find(isListable) ?? null;
}

export interface DoorDeps { readonly db: Db; readonly hot: () => Promise<HubHot | null> }

export async function readDoors(origins: HubOrigins, now: Date, deps: DoorDeps): Promise<HubDoors | null> {
  const { db } = deps;
  const hot = await deps.hot();
  const door = async (site: HubSite): Promise<HubDoor> => {
    const [quizCount, topicCount] = await Promise.all([countQuizzes(db, site), countTopics(db, site)]);
    // K-pop is long open: always its first Hot pick. Anime: Just added while it is still in its start-up week.
    const justAdded = site === 'anime' && (hot === null || hot.basis.animeStartup);
    let featured: HubQuizCard | null = null;
    if (justAdded) {
      const q = await newestQuiz(db, site);
      featured = q ? toCard(q, origins, now) : null;
    } else {
      const top = hot?.[site][0];
      featured = top ?? null;
    }
    return {
      site,
      name: siteName(site),
      origin: origins[site],
      quizCount,
      topicCount,
      topicLabel: REGISTRY[site].vocabulary.topicPlural,
      featuredLabel: justAdded ? 'Just added' : 'Top now',
      featured,
    };
  };
  const [kpop, anime] = await Promise.all(HUB_SITES.map(door));
  if (!kpop || !anime) return null;
  return { kpop, anime };
}

const cached = hubCached('doors', (origins: HubOrigins) =>
  readDoors(origins, new Date(), { db: createPublicReadClient(), hot: () => getHot({ origins }) }));

/** The two doors of the hero, cached one hour (tag hub:doors). */
export async function getDoors(opts?: HubOpts): Promise<HubDoors | null> {
  return cached(resolveOrigins(opts));
}
