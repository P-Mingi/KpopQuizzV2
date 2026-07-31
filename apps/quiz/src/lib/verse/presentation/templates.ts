// V-TEMPLATES - the four structure templates (universe doc 3b, LOCKED). A
// template is a PURE CONFIG BUNDLE over the W-CUSTOM system: a tab set + a
// module set + (since V-PAGES) the enabled page-kind set. Applying one is a
// merge that replaces STRUCTURE ONLY; every other choice (preset, accent,
// banner, welcome, stickers, frames, liveNow, textFolds) and all CONTENT
// (sections, essays, discussions, pages - different tables entirely) are
// untouched, so switching templates can never lose content. Era/timeline
// scaffolds already exist platform-wide via auto-grouping (W3K, drafts by
// nature); templates create NO stub pages.

import { ALL_KPOP_KIND_IDS } from '@/lib/verse/pages/kpop-kinds';

import type { Presentation, ModulePlacement, TabId } from './types';

export type TemplateId = 'starter' | 'complete' | 'encyclopedia' | 'empty';
export const TEMPLATE_IDS: TemplateId[] = ['starter', 'complete', 'encyclopedia', 'empty'];

interface TemplateDef {
  id: TemplateId;
  label: string;
  blurb: string;
  recommended?: boolean;
  tabs: TabId[];
  modules: ModulePlacement[];
  /** V-PAGES: the page kinds this template enables (persisted as
   * presentation.enabledKinds; absent = the registry's default set). Structure
   * config, replaced on template apply like tabs + modules. */
  enabledKinds?: string[];
}

const m = (type: string, zone: 'main' | 'side', order: number): ModulePlacement => ({ type, zone, order, hidden: false });

export const TEMPLATE_DEFS: Record<TemplateId, TemplateDef> = {
  // 3b.1 - STARTER (recommended, and the UI says so): canonical items 1-6 + 10
  // (+ the fixed related footer). No empty doorways.
  starter: {
    id: 'starter', label: 'Starter', recommended: true,
    blurb: 'The credible first home: intro, members, story, music, community. Recommended.',
    tabs: ['home', 'members', 'discography', 'community'],
    modules: [
      m('intro', 'main', 0), m('vitals', 'main', 1), m('members', 'main', 2),
      m('story', 'main', 3), m('discography', 'main', 4), m('community', 'main', 5),
      m('stats', 'side', 0), m('masthead', 'side', 1),
    ],
  },
  // 3b.2 - COMPLETE: + Story and Collections surfaces, the explore grid, the
  // full canonical flow.
  complete: {
    id: 'complete', label: 'Complete',
    blurb: 'The full canonical flow: eras, now, explore grid, collections, games last.',
    tabs: ['home', 'members', 'discography', 'timeline', 'essays', 'community'],
    modules: [
      m('intro', 'main', 0), m('vitals', 'main', 1), m('members', 'main', 2),
      m('story', 'main', 3), m('discography', 'main', 4), m('countdown', 'main', 5),
      m('go_deeper', 'main', 6), m('collections', 'main', 7), m('community', 'main', 8),
      m('game_widgets', 'main', 9),
      m('on_this_day', 'side', 0), m('stats', 'side', 1), m('masthead', 'side', 2),
    ],
    enabledKinds: ['general', 'glossary-entry', 'culture-guide', 'faq', 'song-story', 'mv', 'lightstick', 'item'],
  },
  // 3b.3 - ENCYCLOPEDIA: everything on. Wiki + songs earn nav placement (the
  // fextralife lesson: the deep surfaces live at nav level); awards/tours stay
  // live pages reachable from Browse. Tabs only show once content exists
  // (composeTabs min-gates), so no empty doorways.
  encyclopedia: {
    id: 'encyclopedia', label: 'Encyclopedia',
    blurb: 'Everything on: the wiki, the song deck, every kind. For big fandoms with a curator team.',
    tabs: ['home', 'members', 'discography', 'timeline', 'wiki', 'songs', 'community'],
    modules: [
      m('intro', 'main', 0), m('vitals', 'main', 1), m('members', 'main', 2),
      m('story', 'main', 3), m('discography', 'main', 4), m('countdown', 'main', 5),
      m('go_deeper', 'main', 6), m('collections', 'main', 7), m('community', 'main', 8),
      m('game_widgets', 'main', 9),
      m('on_this_day', 'side', 0), m('stats', 'side', 1), m('masthead', 'side', 2),
    ],
    enabledKinds: ALL_KPOP_KIND_IDS,
  },
  // 3b.4 - EMPTY: the bare seo_critical skeleton. Respected, not pushed.
  empty: {
    id: 'empty', label: 'Empty',
    blurb: 'The bare bones. Build every choice yourself.',
    tabs: ['home', 'members', 'discography'],
    modules: [
      m('intro', 'main', 0), m('vitals', 'main', 1), m('members', 'main', 2), m('discography', 'main', 3),
    ],
  },
};

export const TEMPLATE_LIST: TemplateDef[] = Object.values(TEMPLATE_DEFS);

/** Apply a structure template: replaces STRUCTURE ONLY (tabs + modules +
 * enabledKinds; a template with no kind set clears back to the registry
 * default). Everything else in the presentation (and all content, which lives
 * in other tables) is preserved. Content-loss-free by construction; proven in
 * scripts/test-vtemplates.mts. */
export function applyTemplate(draft: Presentation, id: TemplateId): Presentation {
  const def = TEMPLATE_DEFS[id];
  if (!def) return draft;
  const next: Presentation = {
    ...draft,
    version: 1,
    template: id,
    tabs: [...def.tabs],
    modules: def.modules.map((x) => ({ ...x })),
  };
  if (def.enabledKinds) next.enabledKinds = [...def.enabledKinds];
  else delete next.enabledKinds;
  return next;
}
