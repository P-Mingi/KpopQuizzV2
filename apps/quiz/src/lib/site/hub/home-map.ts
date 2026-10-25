// Run O1, lot H2c: the small pure helpers the loaders of the home share. The modules of lib/site/hub/data/ give absolute links
// (the origin of the site plus the path); the shapes of the home keep the path and let homeUrl add the origin, so each link is
// built once, from the registry.

import type { HubQuizCard } from './data';
import type { HomeQuiz } from './home-types';

/** The path (and query) of an absolute link of a module; a path stays as it is. */
export function pathOf(href: string): string {
  try {
    const u = new URL(href);
    return `${u.pathname}${u.search}`;
  } catch {
    return href;
  }
}

/** "Easy" and "True or false" from "Easy · True or false". */
export function splitMeta(meta: string): { level: string; format?: string } {
  const [level = '', ...rest] = meta.split(' · ');
  const format = rest.join(' · ');
  return format ? { level, format } : { level };
}

/** A quiz card of the data modules as a quiz of the Hot now list. */
export function toHomeQuiz(card: HubQuizCard): HomeQuiz {
  const { level, format } = splitMeta(card.meta);
  return {
    site: card.site,
    path: card.path,
    tile: card.tile,
    group: card.group,
    title: card.title,
    level,
    ...(format ? { format } : {}),
    plays: card.plays,
    isNew: card.isNew,
  };
}

/** The first sentence of a story (the phone board shows that much). */
export function firstSentence(text: string): string {
  const t = text.trim();
  const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(t);
  return m ? m[0] : t;
}

/** "2:05" from "02:05" (the design writes the Paris time without a leading zero). */
export function plainTime(hhmm: string): string {
  const [h = '', m = ''] = hhmm.split(':');
  return `${parseInt(h, 10)}:${m}`;
}

/** 1204 as "1,204". */
export function count(n: number): string {
  return n.toLocaleString('en-US');
}
