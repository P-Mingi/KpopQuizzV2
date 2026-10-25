// Run O1, lot H2a: the structured data of the new home: the ItemList of "Hot right now" (the quizzes of the loader, each with its canonical
// URL on its own site). The WebSite block is websiteJsonLdFor (lib/site/jsonld.ts). No quiz is copied onto the hub: the list only points.
import { itemListJsonLd } from '@/lib/site/jsonld';

import { homeUrl } from './home-types';

import type { HomeQuiz } from './home-types';

export function hotItemListJsonLd(name: string, quizzes: readonly HomeQuiz[]): Record<string, unknown> {
  return itemListJsonLd(name, quizzes.map((q) => ({ name: q.title, url: homeUrl(q) })));
}
