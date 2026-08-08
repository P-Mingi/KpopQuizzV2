// V-FOUNDATION F1 - MECHANICAL per-type section templates (C1, F5). Fandom enforces
// a per-type H2 order SOCIALLY (every member page: Early life > Career > ...); we
// enforce it MECHANICALLY - a new page is pre-seeded with the right heading blocks, so
// the structure is a product feature, not a convention that drifts. Editors add content
// under the headings; the skeleton is consistent across a whole type.
//
// COPYRIGHT LAW: no "Lyrics" section anywhere - lyrics are never reproduced (link out).

import type { PageBlock, PageBody } from './types';

// The page types the F1 tree understands. `type` has NO db CHECK (per-space config, the
// V3 law), so this list is the APP-level source of truth + validation.
export const PAGE_TYPES = [
  'member', 'release', 'track', 'era', 'award', 'tour', 'gallery', 'article', 'portal', 'index',
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export function isPageType(t: string): t is PageType {
  return (PAGE_TYPES as readonly string[]).includes(t);
}

// The H2 section spine per document type. Portal + index carry no prose spine (portal =
// the builder canvas; index = an auto-generated list), so they seed an empty body.
const SECTIONS: Record<PageType, string[]> = {
  member:  ['Overview', 'Early life', 'Career', 'Discography', 'Filmography', 'Awards', 'Trivia', 'Gallery'],
  release: ['Overview', 'Background', 'Tracklist', 'Reception', 'Promotion', 'Credits', 'Gallery'],
  track:   ['Overview', 'Composition', 'Live performances', 'Credits'],
  era:     ['Overview', 'Concept', 'Releases', 'Timeline', 'Gallery'],
  award:   ['Overview'],
  tour:    ['Overview', 'Dates', 'Setlist', 'Gallery'],
  gallery: ['Overview'],
  article: ['Overview'],
  portal:  [],
  index:   [],
};

// A deterministic, readable block id (never an array index). nth keeps ids stable +
// unique within a freshly-seeded body; live edits mint crypto ids in the editor.
function headingId(nth: number): string { return `h-${nth}`; }

/** The seed body for a new page of `type`: one heading block per template section.
 * Empty for portal/index. This is what pages.blocks is initialized to at create. */
export function templateBody(type: string): PageBody {
  const sections = SECTIONS[(isPageType(type) ? type : 'article')] ?? [];
  const blocks: PageBlock[] = sections.map((title, i) => ({
    id: headingId(i), type: 'heading', level: 2, text: title,
  }));
  return { version: 1, blocks };
}

/** The template section titles for a type (for the creation UI hint + tests). */
export function templateSections(type: string): string[] {
  return SECTIONS[(isPageType(type) ? type : 'article')] ?? [];
}
