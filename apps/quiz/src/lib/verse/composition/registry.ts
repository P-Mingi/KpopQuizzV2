// V-BUILDER-1 Phase 1 - THE BLOCKSPEC REGISTRY. Every existing module + the doorway
// family + the prose block described as one BlockSpec each: the config the Phase 2
// library UI reads, and the source of truth for a block's category, real-data
// source, seoCritical law, allowed zones, and which style controls it exposes.
// DERIVED from the existing BLOCK_REGISTRY (single source for type/name/seoCritical/
// zones - no drift), enriched with the blueprint taxonomy + per-block metadata.
// Registry is CONFIG (the niche-agnostic core law).

import { BLOCK_REGISTRY } from '../presentation/registry';
import { DOORWAY_FORMATS } from '../presentation/doorways';

import type { Zone } from '../presentation/registry';

// Blueprint section 3 taxonomy.
export type BlockCategory = 'layout' | 'text' | 'media' | 'live' | 'doorway' | 'fan';
// Real-data law: where a block's content comes from (never fabricated).
export type BlockDataSource = 'entity' | 'curator' | 'community' | 'none';
// The style controls a block exposes (Phase 2's panel is pure UI over these).
export type BlockStyleOption = 'frame' | 'background' | 'radius' | 'density' | 'divider' | 'accent' | 'text' | 'doorwayFormat';

export interface BlockSpec {
  type: string;
  category: BlockCategory;
  icon: string;                 // icon key for the library UI
  name: string;                 // curator-facing (from BlockDef.label)
  description: string;          // one line
  dataSource: BlockDataSource;
  seoCritical: boolean;         // THE LAW (from BlockDef)
  allowedZones: Zone[];         // (from BlockDef.zones)
  styleOptions: BlockStyleOption[];
  minGateRule: string;          // human description of the block's self-min-gate
}

// The box controls every framed module exposes. Text blocks add 'text'.
const BOX: BlockStyleOption[] = ['frame', 'background', 'radius', 'density', 'divider', 'accent'];
const TEXTBOX: BlockStyleOption[] = [...BOX, 'text'];

// Per-type metadata the BlockDef does not carry: the blueprint category, an icon,
// the real-data source, a one-line description, and its min-gate sentence.
const META: Record<string, { category: BlockCategory; icon: string; dataSource: BlockDataSource; desc: string; minGate: string; text?: boolean }> = {
  intro:          { category: 'text', icon: 'text', dataSource: 'curator', desc: 'The welcome lede - what this fandom is, in the curator’s voice.', minGate: 'Hidden when the intro prose is empty.', text: true },
  vitals:         { category: 'text', icon: 'info', dataSource: 'entity', desc: 'One quiet line of vitals (debut year, generation, members).', minGate: 'Always shows for a real entity (seoCritical).', text: true },
  members:        { category: 'live', icon: 'people', dataSource: 'entity', desc: 'The member grid, straight from the entity roster.', minGate: 'Hidden below 1 active member.' },
  story:          { category: 'text', icon: 'book', dataSource: 'curator', desc: 'The story so far - the curator’s prose history.', minGate: 'Hidden when the story prose is empty.', text: true },
  discography:    { category: 'live', icon: 'music', dataSource: 'entity', desc: 'Latest releases from the entity’s real discography.', minGate: 'Hidden with no published releases.' },
  facts:          { category: 'live', icon: 'info', dataSource: 'entity', desc: 'The facts / infobox card.', minGate: 'Hidden below the fact floor.' },
  timeline:       { category: 'live', icon: 'timeline', dataSource: 'entity', desc: 'The era spine / timeline.', minGate: 'Hidden with no timeline entries.' },
  eras:           { category: 'live', icon: 'timeline', dataSource: 'entity', desc: 'Era chapters.', minGate: 'Hidden with no eras.' },
  stats:          { category: 'live', icon: 'stats', dataSource: 'entity', desc: 'In numbers - the stats band.', minGate: 'Hidden below the stats floor.' },
  on_this_day:    { category: 'live', icon: 'calendar', dataSource: 'entity', desc: 'On this day - anniversaries and moments.', minGate: 'Hidden when nothing lands today.' },
  countdown:      { category: 'live', icon: 'clock', dataSource: 'entity', desc: 'Now - current era plus the next dated moment.', minGate: 'Hidden when idle (no upcoming date).' },
  completeness:   { category: 'live', icon: 'meter', dataSource: 'entity', desc: 'Coverage meter - how complete this space is.', minGate: 'Hidden below the coverage floor.' },
  atlas_mini:     { category: 'live', icon: 'map', dataSource: 'entity', desc: 'Atlas mini-map - a constellation into the node graph.', minGate: 'Hidden below 10 published nodes.' },
  masthead:       { category: 'live', icon: 'people', dataSource: 'community', desc: 'Curator invite / masthead.', minGate: 'Always available (invite state).' },
  binder_widget:  { category: 'live', icon: 'grid', dataSource: 'community', desc: 'Photocard binder widget.', minGate: 'Renders null at 0 catalog.' },
  shelf_widget:   { category: 'live', icon: 'grid', dataSource: 'community', desc: 'Collectibles shelf widget.', minGate: 'Renders null at 0 catalog.' },
  featured_essay: { category: 'live', icon: 'feather', dataSource: 'community', desc: 'Featured essay pick.', minGate: 'Hidden with no featured hero pick.' },
  featured_thread:{ category: 'live', icon: 'chat', dataSource: 'community', desc: 'Featured discussion pick.', minGate: 'Hidden with no thread yet.' },
  community:      { category: 'live', icon: 'chat', dataSource: 'community', desc: 'Community widget - the space’s activity.', minGate: 'Hidden below the activity floor.' },
  collections:    { category: 'live', icon: 'grid', dataSource: 'community', desc: 'Collections - binder + shelf doorways.', minGate: 'Hidden with no published catalog.' },
  go_deeper:      { category: 'doorway', icon: 'link', dataSource: 'entity', desc: 'Go deeper - doorways into wiki, atlas, and pages.', minGate: 'Hidden with no deeper pages.' },
  game_widgets:   { category: 'live', icon: 'game', dataSource: 'community', desc: 'Play - quizzes and games for this fandom.', minGate: 'Hidden with no games.' },
  music:          { category: 'media', icon: 'music', dataSource: 'entity', desc: 'Music - curated official tracks / signature sound.', minGate: 'Hidden with no tracks.' },
  poll:           { category: 'live', icon: 'poll', dataSource: 'community', desc: 'A fan poll.', minGate: 'Hidden with no active poll.' },
  quote:          { category: 'text', icon: 'quote', dataSource: 'curator', desc: 'A fan-written pull-quote (no lyrics).', minGate: 'Hidden when the quote text is empty.', text: true },
  spotlight:      { category: 'media', icon: 'star', dataSource: 'entity', desc: 'Spotlight - a featured photocard from the collection.', minGate: 'Hidden with no cards.' },
  social_embed:   { category: 'media', icon: 'signal', dataSource: 'curator', desc: 'An official social post (click-to-load).', minGate: 'Hidden when no post is set.' },
  discord:        { category: 'media', icon: 'chat', dataSource: 'curator', desc: 'The space’s Discord widget.', minGate: 'Hidden when no Discord is linked.' },
  live_now:       { category: 'live', icon: 'signal', dataSource: 'curator', desc: 'Live now - a curator-armed, auto-expiring live banner.', minGate: 'Auto-hidden past its 12h window.' },
};

function specFor(type: string): BlockSpec {
  const def = BLOCK_REGISTRY[type]!;
  const m = META[type] ?? { category: 'live' as const, icon: 'box', dataSource: 'entity' as const, desc: def.label, minGate: 'Self min-gates.' };
  return {
    type, category: m.category, icon: m.icon, name: def.label, description: m.desc,
    dataSource: m.dataSource, seoCritical: def.seoCritical, allowedZones: def.zones,
    styleOptions: m.text ? TEXTBOX : BOX, minGateRule: m.minGate,
  };
}

// Every module in the presentation registry gets a spec (derived - completeness is
// structural, proven in _vbuilder1-registry.mts), plus the doorway family and prose.
export const BLOCK_SPECS: Record<string, BlockSpec> = {
  ...Object.fromEntries(Object.keys(BLOCK_REGISTRY).map((t) => [t, specFor(t)])),
  // The doorway/nav block family: one placeable block whose FORMAT (link/button/
  // card/feature) is a style option. The crawlable href + true title never change
  // regardless of format (the doorway SEO invariant lives in <DoorwayList>).
  doorway: {
    type: 'doorway', category: 'doorway', icon: 'link', name: 'Doorway',
    description: `A link into another page (format: ${DOORWAY_FORMATS.join(' / ')}).`,
    dataSource: 'entity', seoCritical: false, allowedZones: ['main', 'side'],
    styleOptions: ['doorwayFormat', ...BOX], minGateRule: 'Hidden when its target has no content (no dead doors).',
  },
  // The prose block: arbitrary curator prose (TipTap), the future home of the
  // paragraph/heading/list/callout text blocks. Today intro/story carry prose; this
  // is the generic text block the Phase 2 editor writes into.
  prose: {
    type: 'prose', category: 'text', icon: 'text', name: 'Text',
    description: 'A rich-text block (headings, lists, quotes, callouts, marks).',
    dataSource: 'curator', seoCritical: false, allowedZones: ['main', 'side'],
    styleOptions: TEXTBOX, minGateRule: 'Hidden when empty.',
  },
};

export function blockSpec(type: string): BlockSpec | null {
  return Object.prototype.hasOwnProperty.call(BLOCK_SPECS, type) ? BLOCK_SPECS[type]! : null;
}
export function allBlockSpecs(): BlockSpec[] {
  return Object.values(BLOCK_SPECS);
}
export function blockSpecsByCategory(cat: BlockCategory): BlockSpec[] {
  return allBlockSpecs().filter((s) => s.category === cat);
}
