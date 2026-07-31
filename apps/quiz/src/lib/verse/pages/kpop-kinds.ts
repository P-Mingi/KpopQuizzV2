// V-PAGES kpop config - the v1 kind set (workstream spec + blueprint section 3
// anatomies). This file is CONFIG over the niche-agnostic core: another verse
// ships its own kind list without touching kinds.ts. Owner gates honoured:
// where-to-buy links are official-only; fan-culture kinds carry the fan-written
// badge and need no external sources; ranked demands a methodology.

import { buildRegistry } from './kinds';

import type { PageKindDef } from './kinds';

export const KPOP_PAGE_KINDS: PageKindDef[] = [
  {
    kind: 'song-story', label: 'Song story', idolCapable: true,
    description: 'The story of one song: credits, context, live history. Facts need sources.',
    infobox: [
      { key: 'album', label: 'Album', type: 'text' },
      { key: 'track_no', label: 'Track number', type: 'number' },
      { key: 'length', label: 'Length', type: 'text', help: 'mm:ss' },
      { key: 'language', label: 'Language', type: 'text' },
      { key: 'credits', label: 'Written / produced by', type: 'text', fact: true },
      { key: 'chart_peak', label: 'Chart peak', type: 'text', fact: true, help: 'e.g. "Melon #3 (2024-05-02)"' },
    ],
    sections: [
      { key: 'about', label: 'About the song' },
      { key: 'live-history', label: 'Live history' },
      { key: 'in-numbers', label: 'In numbers', help: 'Sourced stats only, quoted with dates.' },
    ],
  },
  {
    kind: 'mv', label: 'Music video', idolCapable: true,
    description: 'One MV: the official video, release facts, teaser chronology.',
    infobox: [
      { key: 'video_url', label: 'Official video', type: 'url', officialOnly: true },
      { key: 'release_date', label: 'Release date', type: 'date', fact: true },
      { key: 'director', label: 'Director', type: 'text', fact: true },
      { key: 'era', label: 'Era', type: 'text' },
    ],
    sections: [
      { key: 'about', label: 'About the video' },
      { key: 'teasers', label: 'Teaser chronology', help: 'Dated official links.' },
    ],
  },
  {
    kind: 'choreography', label: 'Choreography', idolCapable: true,
    description: 'The dance: choreographer credit, key moves, the practice video.',
    infobox: [
      { key: 'choreographer', label: 'Choreographer', type: 'text', fact: true },
      { key: 'dance_practice', label: 'Dance practice video', type: 'url', officialOnly: true },
    ],
    sections: [
      { key: 'key-moves', label: 'Key moves', help: 'Fan-named moves, described.' },
      { key: 'performances', label: 'Notable performances' },
    ],
  },
  {
    kind: 'item', label: 'Item',
    description: 'A physical release or product: album versions, merch, season’s greetings.',
    infobox: [
      { key: 'item_type', label: 'Type', type: 'select', options: ['album-version', 'preorder-benefit', 'seasons-greetings', 'membership-kit', 'merch', 'fashion-collab'] },
      { key: 'release_year', label: 'Release year', type: 'year', fact: true },
      { key: 'maker', label: 'Made / sold by', type: 'text', fact: true },
      { key: 'official_link', label: 'Official store link', type: 'url', officialOnly: true },
    ],
    sections: [
      { key: 'about', label: 'About this item' },
      { key: 'versions', label: 'Versions', help: 'One row per version; differences only.' },
    ],
  },
  {
    kind: 'lightstick', label: 'Lightstick',
    description: 'The fandom’s lightstick: versions, design story, its life in the crowd.',
    infobox: [
      { key: 'official_name', label: 'Official name', type: 'text', fact: true },
      { key: 'generation', label: 'Version / generation', type: 'text' },
      { key: 'release_year', label: 'Release year', type: 'year', fact: true },
      { key: 'official_link', label: 'Official store link', type: 'url', officialOnly: true },
    ],
    sections: [
      { key: 'design-story', label: 'Design story', help: 'Sourced facts + fan writing, clearly separated.' },
      { key: 'versions', label: 'Versions' },
      { key: 'in-the-crowd', label: 'In the crowd', help: 'Ocean colors, chant moments; fan culture.' },
    ],
  },
  {
    kind: 'concert', label: 'Concert', idolCapable: true,
    description: 'One show: date, venue, setlist, what happened.',
    infobox: [
      { key: 'tour', label: 'Tour', type: 'text' },
      { key: 'date', label: 'Date', type: 'date', fact: true },
      { key: 'venue', label: 'Venue', type: 'text', fact: true },
      { key: 'city', label: 'City', type: 'text' },
    ],
    sections: [
      { key: 'setlist', label: 'Setlist' },
      { key: 'moments', label: 'Moments', help: 'What made this night this night.' },
    ],
  },
  {
    kind: 'comeback', label: 'Comeback hub', idolCapable: true,
    description: 'An era’s live page: teaser chronology, release-day notes; becomes the archive.',
    infobox: [
      { key: 'era_name', label: 'Era / album', type: 'text' },
      { key: 'release_date', label: 'Release date', type: 'date', fact: true },
    ],
    sections: [
      { key: 'teaser-chronology', label: 'Teaser chronology', help: 'Dated official links only.' },
      { key: 'release-day', label: 'Release day' },
    ],
  },
  {
    kind: 'episode', label: 'Episode', idolCapable: true,
    description: 'One episode of the group’s own show: air date, what happens.',
    infobox: [
      { key: 'show', label: 'Show', type: 'text' },
      { key: 'episode_no', label: 'Episode number', type: 'number' },
      { key: 'air_date', label: 'Air date', type: 'date', fact: true },
    ],
    sections: [{ key: 'summary', label: 'Summary', help: 'Fan-written synopsis; no transcripts.' }],
  },
  {
    kind: 'culture-guide', label: 'Culture guide', fanWritten: true, idolCapable: true,
    description: 'Fan culture, explained by fans: streaming guides, etiquette, how-we-do-things. Carries the fan-written badge.',
    infobox: [],
    sections: [{ key: 'guide', label: 'The guide' }],
  },
  {
    kind: 'glossary-entry', label: 'Glossary entry', fanWritten: true, idolCapable: true,
    description: 'One term the fandom uses, defined. Carries the fan-written badge.',
    infobox: [],
    sections: [{ key: 'definition', label: 'Definition' }, { key: 'usage', label: 'How it’s used' }],
  },
  {
    kind: 'faq', label: 'FAQ', idolCapable: true,
    description: 'Questions fans actually ask, answered short, with links to the proving pages.',
    infobox: [],
    sections: [{ key: 'questions', label: 'Questions', help: 'Bold the question, answer in 1-3 sentences, link the proof.' }],
  },
  {
    kind: 'ranked', label: 'Ranked', requiresMethodology: true, idolCapable: true,
    description: 'A ranking over real data. The methodology block is mandatory: no methodology, no publish.',
    infobox: [
      { key: 'methodology', label: 'Methodology', type: 'text', help: 'Weights + data source + as-of date. Required before review/publish.' },
      { key: 'data_source', label: 'Data source', type: 'text', fact: true },
      { key: 'as_of', label: 'Data as of', type: 'date' },
    ],
    sections: [{ key: 'the-ranking', label: 'The ranking' }, { key: 'notes', label: 'Notes' }],
  },
  {
    kind: 'general', label: 'General page', idolCapable: true,
    description: 'A freeform page for what no other kind fits. Same rules, no scaffold.',
    infobox: [],
    sections: [{ key: 'body', label: 'Content' }],
  },
];

/** Kinds available with no explicit config: the low-risk everyday set. Templates
 * widen this (Encyclopedia enables everything) via presentation.enabledKinds. */
export const KPOP_DEFAULT_ENABLED = ['general', 'glossary-entry', 'culture-guide', 'faq'];

export const KPOP_PAGE_REGISTRY = buildRegistry(KPOP_PAGE_KINDS, KPOP_DEFAULT_ENABLED);

export const ALL_KPOP_KIND_IDS = KPOP_PAGE_KINDS.map((k) => k.kind);
