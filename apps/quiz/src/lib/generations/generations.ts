// The one reader of K-pop generation labels (SEO Mission 2, part C; rulebook section 5.6).
//
// Every page that says which generation a group belongs to reads it here: the generations
// hub (/articles/kpop-generations-explained), its timeline image, and the group hubs and
// trivia pages (lib/seo/answer-first.ts, the hub eyebrow). The data is one versioned file,
// group-generations.json, so the site never gives two answers for the same group.
//
// Each labelled group carries a confidence level:
//   consensus   the debut year sits inside one generation in every dating our sources give:
//               the number is shown ("3rd generation");
//   attributed  a named source places the group, or a note qualifies the label:
//               "commonly described as 4th generation", with the source;
//   contested   the group sits where the sources disagree and none places it: both views;
//   newest      a debut from 2023 on: "newest wave", and a number only when a named source
//               uses it for that group, always marked as not official.
// Solo artists, the one singer-songwriter duo and the groups based outside Korea carry no
// label: generations describe Korean idol groups.
//
// Debut years and agencies come from each act's Wikipedia article; Wikidata ids are written
// by scripts/wikidata-group-generations.mts, never typed. Pure module: no I/O.

import raw from './group-generations.json';

export type Confidence = 'consensus' | 'attributed' | 'contested' | 'newest';
export type Unlabelled = 'solo' | 'duo' | 'abroad';

export interface GenerationSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
  /** ISO day of publication, null for a living reference (Wikipedia). */
  date: string | null;
  /** How the source is named next to a fact ("Korea Times, 2025"). */
  short: string;
}

export interface GenerationLabel {
  confidence: Confidence;
  /** The generation shown, or null (contested, or newest with no source using a number). */
  generation: number | null;
  /** Contested only: the two generations the sources disagree between. */
  range: readonly [number, number] | null;
  sources: readonly GenerationSource[];
  /** A sourced qualifier shown with the label, or null. */
  note: string | null;
}

export interface GroupGeneration {
  slug: string;
  /** The groups table name (official stylization). */
  name: string;
  debutYear: number;
  /** A qualifier for the debut year ("formed in 2017"), or null. */
  debutNote: string | null;
  /** The company that formed or launched the act, as its Wikipedia article names it. */
  agency: string | null;
  wikipedia: string;
  wikidata: string;
  label: GenerationLabel | null;
  /** Why an act has no label (solo artist, duo, based outside Korea), else null. */
  unlabelled: Unlabelled | null;
}

export interface GenerationEra {
  generation: number;
  start: number;
  /** The second start year some sources give (the 4th generation: 2018 or 2020). */
  startAlt: number | null;
  /** Last debut year of the era, null for the open newest wave. */
  end: number | null;
  /** False for the 5th generation, a label that is not official. */
  official: boolean;
  startText: string;
  changed: string;
  examples: readonly string[];
  sources: readonly GenerationSource[];
}

export interface GenerationData {
  version: number;
  /** ISO day the labels were last reviewed against their sources. */
  reviewed: string;
  sources: readonly GenerationSource[];
  eras: readonly GenerationEra[];
  /** Every act of the file, oldest debut first, then by name. */
  groups: readonly GroupGeneration[];
}

type RawSource = { publisher: string; title: string; url: string; date: string | null; short: string };
type RawLabel = { confidence: string; generation: number | null; range?: number[]; sources: string[]; note?: string };
type RawGroup = {
  name: string; debutYear: number | null; debutNote?: string; agency: string | null; wikipedia: string; wikidata: string;
  label?: RawLabel | null; unlabelled?: string;
};
type RawEra = {
  generation: number; start: number; startAlt?: number; end: number | null; official?: boolean; startText: string;
  changed: string; examples: string[]; sources: string[];
};
type RawData = { version: number; reviewed: string; sources: Record<string, RawSource>; eras: RawEra[]; groups: Record<string, RawGroup> };

const CONFIDENCES: readonly string[] = ['consensus', 'attributed', 'contested', 'newest'];
const UNLABELLED: readonly string[] = ['solo', 'duo', 'abroad'];

/** Build the typed snapshot once. A malformed file throws at import, so it fails the build and the tests. */
function normalize(data: RawData): GenerationData {
  const sources = new Map<string, GenerationSource>(
    Object.entries(data.sources).map(([id, s]) => [id, { id, ...s }]),
  );
  const src = (id: string, where: string): GenerationSource => {
    const s = sources.get(id);
    if (!s) throw new Error(`[generations] unknown source "${id}" (${where})`);
    return s;
  };
  const groups = Object.entries(data.groups).map(([slug, g]): GroupGeneration => {
    if (g.debutYear == null) throw new Error(`[generations] ${slug}: no debut year`);
    let label: GenerationLabel | null = null;
    if (g.label) {
      if (!CONFIDENCES.includes(g.label.confidence)) throw new Error(`[generations] ${slug}: bad confidence`);
      const r = g.label.range;
      label = {
        confidence: g.label.confidence as Confidence,
        generation: g.label.generation,
        range: r && r.length === 2 ? [r[0]!, r[1]!] : null,
        sources: g.label.sources.map((id) => src(id, slug)),
        note: g.label.note ?? null,
      };
    }
    const unlabelled = g.unlabelled && UNLABELLED.includes(g.unlabelled) ? (g.unlabelled as Unlabelled) : null;
    return {
      slug,
      name: g.name,
      debutYear: g.debutYear,
      debutNote: g.debutNote ?? null,
      agency: g.agency,
      wikipedia: g.wikipedia,
      wikidata: g.wikidata,
      label,
      unlabelled: label ? null : unlabelled,
    };
  });
  groups.sort((a, b) => a.debutYear - b.debutYear || a.name.localeCompare(b.name, 'en'));
  return {
    version: data.version,
    reviewed: data.reviewed,
    sources: [...sources.values()],
    eras: data.eras.map((e) => ({
      generation: e.generation,
      start: e.start,
      startAlt: e.startAlt ?? null,
      end: e.end,
      official: e.official !== false,
      startText: e.startText,
      changed: e.changed,
      examples: e.examples,
      sources: e.sources.map((id) => src(id, `era ${e.generation}`)),
    })),
    groups,
  };
}

const SNAPSHOT: GenerationData = normalize(raw as unknown as RawData);
const BY_SLUG: ReadonlyMap<string, GroupGeneration> = new Map(SNAPSHOT.groups.map((g) => [g.slug, g]));

/**
 * The generation record of one group, or null when the file has no entry for it (a group
 * added to the directory after the last review). Callers keep their previous output on null.
 */
export function groupGeneration(slug: string): GroupGeneration | null {
  return BY_SLUG.get(slug) ?? null;
}

/** The whole file (eras, sources, every act), for the generations hub and its timeline image. */
export function generationData(): GenerationData {
  return SNAPSHOT;
}

// ---------------------------------------------------------------------------------------
// Words. Every sentence about a generation is written here, so the hub, the group pages and
// the timeline say it the same way. No em or en dashes.

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

function rangeWords(label: GenerationLabel): [string, string] {
  const [lo, hi] = label.range ?? [3, 4];
  return [ordinal(lo), ordinal(hi)];
}

/** Short form for a hero eyebrow: "3rd gen", "3rd or 4th gen", "Newest wave". */
export function generationShort(label: GenerationLabel): string {
  if (label.confidence === 'newest') return 'Newest wave';
  if (label.confidence === 'contested' || label.generation == null) {
    const [lo, hi] = rangeWords(label);
    return `${lo} or ${hi} gen`;
  }
  return `${ordinal(label.generation)} gen`;
}

/** The generation cell of the hub table. */
export function generationCell(g: GroupGeneration): string {
  const l = g.label;
  if (!l) return 'Not labelled';
  if (l.confidence === 'newest') return l.generation ? `Newest wave (often called ${ordinal(l.generation)})` : 'Newest wave';
  if (l.confidence === 'contested' || l.generation == null) {
    const [lo, hi] = rangeWords(l);
    return `${lo} or ${hi}`;
  }
  return ordinal(l.generation);
}

export function confidenceLabel(c: Confidence): string {
  return { consensus: 'Consensus', attributed: 'Attributed', contested: 'Contested', newest: 'Newest' }[c];
}

/** Why an act has no label, in a few words for the table. */
export function unlabelledReason(u: Unlabelled | null): string {
  if (u === 'solo') return 'Solo artist';
  if (u === 'duo') return 'Singer-songwriter duo';
  if (u === 'abroad') return 'Based outside Korea';
  return 'Not reviewed yet';
}

/** The answer to "What generation is {name}?", without its sources (see generationAnswerText). */
export function generationAnswer(name: string, label: GenerationLabel): string {
  const note = label.note ? ` ${label.note}` : '';
  switch (label.confidence) {
    case 'consensus':
      return label.generation != null
        ? `${name} is a ${ordinal(label.generation)} generation K-pop group.${note}`
        : contestedAnswer(name, label);
    case 'attributed':
      return label.generation != null
        ? `${name} is commonly described as a ${ordinal(label.generation)} generation K-pop group.${note}`
        : contestedAnswer(name, label);
    case 'contested':
      return contestedAnswer(name, label);
    case 'newest':
      return label.generation != null
        ? `${name} belongs to the newest wave of K-pop groups and is often labelled ${ordinal(label.generation)} generation, a label that is not official.${note}`
        : `${name} belongs to the newest wave of K-pop groups. The term 5th generation, used for some groups that debuted from 2023, is not official.${note}`;
  }
}

function contestedAnswer(name: string, label: GenerationLabel): string {
  const [lo, hi] = rangeWords(label);
  const why = lo === '3rd' && hi === '4th'
    ? ' some date the 4th generation from around 2018, while others count every group that debuted in the 2010s as 3rd generation.'
    : ' the sources we follow disagree.';
  return `Whether ${name} is a ${lo} or ${hi} generation K-pop group is debated:${why}`;
}

/** "Source: Korea Times, 2025." or "Sources: a; b." */
export function sourcesSentence(sources: readonly GenerationSource[]): string {
  if (sources.length === 0) return '';
  return `${sources.length === 1 ? 'Source' : 'Sources'}: ${sources.map((s) => s.short).join('; ')}.`;
}

/** The full plain-text answer, sources included (group pages, trivia pages). */
export function generationAnswerText(name: string, label: GenerationLabel): string {
  return `${generationAnswer(name, label)} ${sourcesSentence(label.sources)}`;
}

/** One sentence for a group's answer-first lead. */
export function generationLead(name: string, label: GenerationLabel): string {
  switch (label.confidence) {
    case 'consensus':
      if (label.generation != null) return `${name} belongs to the ${ordinal(label.generation)} generation of K-pop.`;
      break;
    case 'attributed':
      if (label.generation != null) return `${name} is commonly described as ${ordinal(label.generation)} generation K-pop.`;
      break;
    case 'newest':
      return `${name} belongs to the newest wave of K-pop.`;
    case 'contested':
      break;
  }
  const [lo, hi] = rangeWords(label);
  return `Whether ${name} is ${lo} or ${hi} generation K-pop is debated.`;
}

/** The debut years of one era in words: "1996 to 2002", "around 2018 or 2020 to 2022", "2023 on". */
export function eraYears(e: GenerationEra): string {
  const start = e.startAlt ? `around ${e.start} or ${e.startAlt}` : String(e.start);
  return e.end == null ? `${start} on` : `${start} to ${e.end}`;
}

/** "1st gen 1996 to 2002, 2nd gen 2003 to 2011, ..." over the official eras (no 5th). */
export function erasSummary(): string {
  const parts = SNAPSHOT.eras.filter((e) => e.official).map((e) => `${ordinal(e.generation)} gen ${eraYears(e)}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join('');
}

/** The URL of the generations hub, the cluster owner for "kpop generations" (TARGETS.md). */
export const GENERATIONS_HUB_PATH = '/articles/kpop-generations-explained';

/** The downloadable timeline image (app/(site)/data/kpop-generations-timeline.svg). */
export const GENERATIONS_TIMELINE_PATH = '/data/kpop-generations-timeline.svg';
