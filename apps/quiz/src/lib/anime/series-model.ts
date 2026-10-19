// Run O1, lot (b), lane LB: the pure model of the series hub blocks (A1 to A4, the facts, the FAQ, the metadata).
// No I/O: the loader (series.ts) reads, this file shapes what the blocks print. Nothing here knows a reader's
// spoiler progress; the HTML is built for the spoiler-free view and the islands refine it in the browser.

import { fitTitle } from '@/lib/seo/title-fit';
import { normalizeFactKey } from '@/lib/trivia/fact-key';

import { t, tPlural } from './copy';
import { SPOILER_FREE_LEVEL, computeSpoilerLevel, isRevealedTo, levelOfRow } from './spoilers/core';
import { MIN_OSHI_PICKS, MIN_PLAYABLE_THEMES } from './types';

import type { Metadata } from 'next';
import type { SeriesFactRow, SeriesHub, SeriesQuizRow, SeriesSourceRow } from './series';
import type { ArcKind, ArcRow, CharacterRole, CharacterRow, QuestionSpoiler, SeriesRow, SeriesThemeRow, SpoilerArc, SpoilerLevel, SpoilerProgress, SpoilerScope, ThemeKind } from './types';

/** Facts on the hub (A "Facts" block) and the floor of the /{series}-trivia page (= TRIVIA_MIN_FACTS of the shared trivia page). */
export const HUB_FACT_LIMIT = 9;
export const SERIES_TRIVIA_MIN = 9;

/** An absolute http(s) URL, else null: a source link is never a script or a relative path. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// A1: header facts
// ---------------------------------------------------------------------------------------------------------------

export interface HeaderFact { readonly key: string; readonly label: string; readonly value: string }

function count(n: number, approx: boolean): string {
  const v = n.toLocaleString('en-US');
  return approx ? t('hub.approx', { count: v }) : v;
}

function yearsText(series: Pick<SeriesRow, 'anime_start_year' | 'anime_end_year' | 'manga_start_year' | 'manga_end_year'>): string | null {
  const start = series.anime_start_year ?? series.manga_start_year ?? null;
  if (start === null) return null;
  const end = series.anime_start_year !== null ? series.anime_end_year : series.manga_end_year;
  if (end === null || end === undefined) return t('hub.since', { year: start });
  return end === start ? String(start) : `${start}-${end}`;
}

export function studioNames(series: Pick<SeriesRow, 'studios'>): string[] {
  const list = Array.isArray(series.studios) ? series.studios : [];
  return list.map((s) => (s && typeof s === 'object' && !Array.isArray(s) ? (s as { name?: unknown }).name : null))
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
}

export function authorNames(series: Pick<SeriesRow, 'authors'>): string[] {
  const list = Array.isArray(series.authors) ? series.authors : [];
  return list.map((a) => (a && typeof a === 'object' && !Array.isArray(a) ? (a as { name?: unknown }).name : null))
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
}

/**
 * The header facts, each only when it is known, in the order of the hub: titles, studios, years, status, length. The
 * English title is listed when it differs from the name the page already prints (`groupName`).
 */
export function headerFacts(series: SeriesRow, groupName?: string): HeaderFact[] {
  const out: HeaderFact[] = [];
  const add = (key: string, label: string, value: string | null): void => {
    if (value && value.trim()) out.push({ key, label, value: value.trim() });
  };
  if (groupName !== undefined && series.title_en.trim().toLowerCase() !== groupName.trim().toLowerCase()) add('english', t('hub.english'), series.title_en);
  add('native', t('hub.native'), series.title_native);
  add('romaji', t('hub.romaji'), series.title_romaji);
  const studios = studioNames(series);
  add('studios', t('hub.studios'), studios.length ? studios.join(', ') : null);
  const authors = authorNames(series);
  add('authors', t('hub.authors'), authors.length ? authors.join(', ') : null);
  add('years', t('hub.years'), yearsText(series));
  add('status', t('hub.status'), t(`hub.status.${series.status === 'between_seasons' ? 'betweenSeasons' : series.status}` as 'hub.status.airing'));
  if (series.episodes !== null && series.episodes > 0) add('episodes', t('hub.episodes'), count(series.episodes, false));
  if (series.chapters !== null && series.chapters > 0) add('chapters', t('hub.chapters'), count(series.chapters, series.chapters_approx));
  if (series.volumes !== null && series.volumes > 0) add('volumes', t('hub.volumes'), count(series.volumes, false));
  return out;
}

/** "37 episodes and 108 chapters", for the length FAQ; null when neither count is known. */
export function lengthText(series: Pick<SeriesRow, 'episodes' | 'chapters' | 'seasons'>): string | null {
  const parts: string[] = [];
  if (series.seasons !== null && series.seasons > 0) parts.push(tPlural('hub.lengthSeasons', series.seasons));
  if (series.episodes !== null && series.episodes > 0) parts.push(tPlural('hub.lengthEpisodes', series.episodes));
  if (series.chapters !== null && series.chapters > 0) parts.push(tPlural('hub.lengthChapters', series.chapters));
  return parts.length ? parts.join(', ') : null;
}

/** What `series.airing` holds when it holds a record (the shape is the owner's of the data lot: only these fields are read). */
export interface AiringRecord {
  readonly episode: number | null;
  readonly nextDate: string | null;
  readonly sourceUrl: string | null;
}

/** "Now airing" shows only with a record: a non-empty object. Anything else (null, a list, a string) is no record. */
export function airingRecord(airing: unknown): AiringRecord | null {
  if (typeof airing !== 'object' || airing === null || Array.isArray(airing)) return null;
  const a = airing as Record<string, unknown>;
  if (Object.keys(a).length === 0) return null;
  const episode = typeof a.episode === 'number' && Number.isInteger(a.episode) && a.episode > 0 ? a.episode : null;
  const nextDate = typeof a.next_air_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.next_air_date) ? a.next_air_date : null;
  const sourceUrl = typeof a.source_url === 'string' ? safeUrl(a.source_url) : null;
  return { episode, nextDate, sourceUrl };
}

export interface SourceLink {
  readonly key: string;
  readonly label: string;
  readonly url: string | null;
  readonly fields: readonly string[];
}

const SOURCE_LABEL: Record<SeriesSourceRow['source'], string> = {
  wikipedia: 'Wikipedia', wikidata: 'Wikidata', musicbrainz: 'MusicBrainz', official: 'Official site',
};

/** "Sources (i)": one entry per source and URL, with the fields it backs; a row with no valid URL has no link. */
export function sourceLinks(sources: readonly SeriesSourceRow[], series: Pick<SeriesRow, 'official_url'>): SourceLink[] {
  const byKey = new Map<string, { label: string; url: string | null; fields: string[] }>();
  const push = (source: SeriesSourceRow['source'], url: string | null, field: string | null): void => {
    const key = `${source}|${url ?? ''}`;
    const cur = byKey.get(key) ?? { label: SOURCE_LABEL[source], url, fields: [] };
    if (field && !cur.fields.includes(field)) cur.fields.push(field);
    byKey.set(key, cur);
  };
  for (const s of sources) push(s.source, safeUrl(s.source_url), s.field);
  const official = safeUrl(series.official_url);
  if (official) push('official', official, null);
  return [...byKey.entries()].map(([key, v]) => ({ key, label: v.label, url: v.url, fields: v.fields }));
}

// ---------------------------------------------------------------------------------------------------------------
// A2: arcs
// ---------------------------------------------------------------------------------------------------------------

/** The arcs as the spoiler shield takes them. */
export function shieldArcs(arcs: readonly ArcRow[]): SpoilerArc[] {
  return arcs.map((a) => ({ ord: a.ord, name: a.name, mangaOnly: a.manga_only, animeOnly: a.anime_only }));
}

export function mangaOnlyOrds(arcs: readonly ArcRow[]): Set<number> {
  return new Set(arcs.filter((a) => a.manga_only).map((a) => a.ord));
}

export function arcName(arcs: readonly ArcRow[], ord: number): string {
  return arcs.find((a) => a.ord === ord)?.name ?? t('hub.arcFallback', { ord });
}

/**
 * The spoiler level of a quiz page, computed on the server: the stricter of the stored level (quizzes.spoiler_arc_ord and
 * spoiler_scope, set at publish) and the level of the questions' own tags. Never taken from the client.
 */
export function quizSpoilerLevel(
  hub: Pick<SeriesHub, 'arcs' | 'quizzes'> | null,
  slug: string,
  questions: readonly { readonly spoiler?: QuestionSpoiler | undefined }[],
): SpoilerLevel {
  const computed = computeSpoilerLevel(questions, hub ? mangaOnlyOrds(hub.arcs) : undefined);
  const row = hub?.quizzes.find((q) => q.slug === slug);
  const stored = row ? levelOfRow(row) : SPOILER_FREE_LEVEL;
  if (computed.arcOrd !== stored.arcOrd) return computed.arcOrd > stored.arcOrd ? computed : stored;
  if (computed.arcOrd === 0) return SPOILER_FREE_LEVEL;
  return { arcOrd: computed.arcOrd, scope: computed.scope === 'manga' || stored.scope === 'manga' ? 'manga' : stored.scope ?? computed.scope };
}

export interface QuizLevelInfo {
  readonly arc: number;
  readonly scope: SpoilerScope | null;
  readonly arcName: string;
}

/** The spoiler level and arc name of every quiz, by slug (the card labels of A2). */
export function quizLevels(quizzes: readonly SeriesQuizRow[], arcs: readonly ArcRow[]): Record<string, QuizLevelInfo> {
  const out: Record<string, QuizLevelInfo> = {};
  for (const q of quizzes) {
    const arc = q.spoiler_arc_ord !== null && q.spoiler_arc_ord > 0 ? q.spoiler_arc_ord : 0;
    out[q.slug] = { arc, scope: arc === 0 ? null : (q.spoiler_scope ?? 'both'), arcName: arc === 0 ? '' : arcName(arcs, arc) };
  }
  return out;
}

export interface ArcQuizGroup {
  readonly ord: number;
  readonly title: string;
  readonly slugs: readonly string[];
}

/** Quizzes grouped by `spoiler_arc_ord`: the spoiler-free ones first, then each arc in story order. Empty groups are left out. */
export function groupQuizzesByArc(quizzes: readonly SeriesQuizRow[], arcs: readonly ArcRow[]): ArcQuizGroup[] {
  const by = new Map<number, string[]>();
  for (const q of quizzes) {
    const ord = q.spoiler_arc_ord !== null && q.spoiler_arc_ord > 0 ? q.spoiler_arc_ord : 0;
    by.set(ord, [...(by.get(ord) ?? []), q.slug]);
  }
  return [...by.keys()].sort((a, b) => a - b).map((ord) => ({
    ord,
    title: ord === 0 ? t('hub.noArc') : arcName(arcs, ord),
    slugs: by.get(ord) ?? [],
  }));
}

export interface StoryMapNode {
  readonly ord: number;
  readonly name: string;
  readonly kindLabel: string;
  readonly kind: ArcKind;
  readonly range: string | null;
  readonly mangaOnly: boolean;
  readonly animeOnly: boolean;
  readonly quizzes: number;
  readonly children: readonly StoryMapNode[];
}

function rangeText(a: ArcRow): string | null {
  if (a.episode_from !== null && a.episode_to !== null) return t('hub.arcEpisodes', { from: a.episode_from, to: a.episode_to });
  if (a.chapter_from !== null && a.chapter_to !== null) return t('hub.arcChapters', { from: a.chapter_from, to: a.chapter_to });
  return null;
}

/** The story map: sagas hold their arcs (parent_id), everything in story order; each node counts its quizzes. */
export function storyMap(arcs: readonly ArcRow[], quizzes: readonly SeriesQuizRow[]): StoryMapNode[] {
  const perArc = new Map<number, number>();
  for (const q of quizzes) if (q.spoiler_arc_ord !== null && q.spoiler_arc_ord > 0) perArc.set(q.spoiler_arc_ord, (perArc.get(q.spoiler_arc_ord) ?? 0) + 1);
  const ids = new Set(arcs.map((a) => a.id));
  const node = (a: ArcRow): StoryMapNode => ({
    ord: a.ord,
    name: a.name,
    kind: a.kind,
    kindLabel: t(`hub.arcKind.${a.kind}` as 'hub.arcKind.arc'),
    range: rangeText(a),
    mangaOnly: a.manga_only,
    animeOnly: a.anime_only,
    quizzes: perArc.get(a.ord) ?? 0,
    children: arcs.filter((c) => c.parent_id === a.id && c.id !== a.id).sort((x, y) => x.ord - y.ord).map(node),
  });
  return arcs
    .filter((a) => a.parent_id === null || !ids.has(a.parent_id))
    .sort((x, y) => x.ord - y.ord)
    .map(node);
}

// ---------------------------------------------------------------------------------------------------------------
// A3: characters
// ---------------------------------------------------------------------------------------------------------------

export interface CharacterTileData {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly role: CharacterRole;
  /** Oshi picks, only at MIN_OSHI_PICKS or more (the threshold rule), else null. */
  readonly picks: number | null;
}

export interface CharacterSplit {
  readonly open: readonly CharacterTileData[];
  /** Characters above the reader's progress: only their number is known to the page, never a name. */
  readonly lockedCount: number;
}

export function characterTile(c: Pick<CharacterRow, 'id' | 'slug' | 'name' | 'role'>, oshiCounts: Readonly<Record<number, number>>): CharacterTileData {
  const picks = oshiCounts[c.id];
  return { id: c.id, slug: c.slug, name: c.name, role: c.role, picks: typeof picks === 'number' && picks >= MIN_OSHI_PICKS ? picks : null };
}

/** The characters a reader may see: spoiler_level 0 for the spoiler-free view (what the HTML carries), the rest locked. */
export function splitCharacters(
  characters: readonly CharacterRow[],
  oshiCounts: Readonly<Record<number, number>>,
  progress: SpoilerProgress = { arc: 0, scope: 'anime' },
): CharacterSplit {
  const open = characters.filter((c) => isRevealedTo(c.spoiler_level, progress)).map((c) => characterTile(c, oshiCounts));
  return { open, lockedCount: characters.length - open.length };
}

// ---------------------------------------------------------------------------------------------------------------
// A4: openings and endings
// ---------------------------------------------------------------------------------------------------------------

export interface OpeningRow {
  readonly id: number;
  readonly kind: ThemeKind;
  readonly kindLabel: string;
  readonly number: number;
  readonly title: string;
  readonly artist: string;
  readonly season: number | null;
}

export function openingRows(themes: readonly SeriesThemeRow[]): OpeningRow[] {
  return themes.map((th) => ({
    id: th.id,
    kind: th.kind,
    kindLabel: t(`hub.openingKind.${th.kind}` as 'hub.openingKind.op'),
    number: th.number,
    title: th.title,
    artist: th.artist,
    season: th.season,
  }));
}

/** Themes whose preview a visitor can play (deezer_playable true: the audio lot's check). */
export function playableThemeCount(themes: readonly Pick<SeriesThemeRow, 'deezer_playable'>[]): number {
  return themes.filter((th) => th.deezer_playable === true).length;
}

/** The blind test link of the series, only at MIN_PLAYABLE_THEMES playable themes or more. */
export function blindTestHref(slug: string, themes: readonly Pick<SeriesThemeRow, 'deezer_playable'>[]): string | null {
  return playableThemeCount(themes) >= MIN_PLAYABLE_THEMES ? `/blindtest/series-${slug}` : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Facts (trivia) and the FAQ
// ---------------------------------------------------------------------------------------------------------------

/** The series' facts, unique by their key, in the order of `trivia.weight` (the loader's order). */
export function uniqueFacts(trivia: readonly SeriesFactRow[]): SeriesFactRow[] {
  const seen = new Set<string>();
  const out: SeriesFactRow[] = [];
  for (const f of trivia) {
    const text = f.fact.trim();
    const key = normalizeFactKey(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...f, fact: text });
  }
  return out;
}

export function hasTriviaPage(trivia: readonly SeriesFactRow[], min: number = SERIES_TRIVIA_MIN): boolean {
  return uniqueFacts(trivia).length >= min;
}

export interface SeriesFaq { readonly q: string; readonly a: string; readonly text: string }

/** The FAQ of the hub: each answer only from a real value of the data (count, studios, length, blind test). */
export function seriesFaqs(hub: SeriesHub, brand: string): SeriesFaq[] {
  const name = hub.series.title_en;
  const vars = { name, brand };
  const out: SeriesFaq[] = [];
  const add = (q: string, a: string): void => { out.push({ q, a, text: a }); };
  const n = hub.quizzes.length;
  if (n > 0) add(t('hub.faq.count.q', vars), t('hub.faq.count.a', { ...vars, count: n.toLocaleString('en-US') }));
  add(t('hub.faq.spoilers.q', vars), t('hub.faq.spoilers.a', vars));
  add(t('hub.faq.free.q', vars), t('hub.faq.free.a', vars));
  const studios = studioNames(hub.series);
  if (studios.length) add(t('hub.faq.studio.q', vars), t('hub.faq.studio.a', { ...vars, studios: studios.join(', ') }));
  const length = lengthText(hub.series);
  if (length) add(t('hub.faq.length.q', vars), t('hub.faq.length.a', { ...vars, length }));
  if (blindTestHref(hub.group.slug, hub.themes)) add(t('hub.faq.openings.q', vars), t('hub.faq.openings.a', vars));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The hub text and metadata
// ---------------------------------------------------------------------------------------------------------------

/** A hub with fewer published quizzes than this is noindex,follow (registry seo.minPublishedForIndexableHub). */
export const MIN_PUBLISHED_FOR_INDEX = 3;

export function hubIndexable(published: number, min: number = MIN_PUBLISHED_FOR_INDEX): boolean {
  return published >= min;
}

export function hubEyebrow(published: number): string {
  return published > 0 ? tPlural('hub.eyebrow', published) : t('hub.eyebrow.none');
}

export function hubIntro(name: string, published: number, seoIntro: string | null): string {
  if (seoIntro && seoIntro.trim()) return seoIntro.trim();
  return published > 0 ? t('hub.intro', { name, count: published.toLocaleString('en-US') }) : t('hub.introEmpty', { name });
}

const OG_IMAGE = (origin: string, slug: string): string => `${origin}/api/og/group/${slug}`;

/** Metadata of /{series}-quiz: the clean URL is the canonical (?arc, ?q, ?role and ?progress never index), noindex,follow under 3 quizzes. */
export function seriesHubMetadata(hub: SeriesHub, origin: string, brand: string): Metadata {
  const name = hub.series.title_en;
  const slug = hub.group.slug;
  const n = hub.quizzes.length;
  const title = fitTitle(
    n >= 2 ? `${name} Quiz: ${n} Fan-Made Tests Without Spoilers` : `${name} Quiz: Fan-Made Tests Without Spoilers`,
    n >= 2 ? `${name} Quiz: ${n} Fan-Made Tests` : `${name} Quiz: Fan-Made Tests`,
    `${name} Quiz`,
  );
  const description = n >= 2
    ? `Play ${n} free ${name} quizzes made by fans. Set how far you have watched or read, and only get questions that are safe for you.`
    : `Play the free ${name} quiz made by fans. Set how far you have watched or read, and only get questions that are safe for you.`;
  const url = `${origin}/${slug}-quiz`;
  const image = OG_IMAGE(origin, slug);
  return {
    title,
    description,
    alternates: { canonical: `/${slug}-quiz` },
    openGraph: {
      title: `${name} Quiz | ${brand}`,
      description: `${n} free ${name} quizzes. Can you pass them all?`,
      url,
      images: [{ url: image, width: 1200, height: 630, alt: `${name} Quiz` }],
    },
    twitter: { card: 'summary_large_image', images: [image] },
    ...(hubIndexable(n) ? {} : { robots: { index: false, follow: true } }),
  };
}

/** Metadata of /{series}-trivia (the page itself answers 404 under SERIES_TRIVIA_MIN facts). */
export function seriesTriviaMetadata(hub: SeriesHub, factCount: number, origin: string, brand: string): Metadata {
  const name = hub.series.title_en;
  const slug = hub.group.slug;
  const image = OG_IMAGE(origin, slug);
  return {
    title: fitTitle(
      `${name} Trivia: ${factCount} Sourced Facts for Fans`,
      `${name} Trivia: ${factCount} Facts for Fans`,
      `${name} Trivia: ${factCount} Facts`,
    ),
    description: `${factCount} facts about ${name}, each with its source, then test yourself with fan-made quizzes.`,
    alternates: { canonical: `/${slug}-trivia` },
    openGraph: {
      title: `${name} Trivia | ${brand}`,
      description: `Facts about ${name} with their sources.`,
      url: `${origin}/${slug}-trivia`,
      siteName: brand,
      type: 'article',
      images: [{ url: image, width: 1200, height: 630, alt: `${name} Trivia` }],
    },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

/** Metadata of /anime-mix-quiz, the hub of the whole catalog (not a series): the same rules, no spoiler claim of one story. */
export function mixHubMetadata(group: { readonly slug: string; readonly name: string; readonly quiz_count: number }, origin: string, brand: string): Metadata {
  const n = group.quiz_count;
  const image = OG_IMAGE(origin, group.slug);
  return {
    title: fitTitle(
      n >= 2 ? `${group.name} Quiz: ${n} Fan-Made Tests` : `${group.name} Quiz: Fan-Made Tests`,
      `${group.name} Quiz`,
    ),
    description: `Play free ${group.name} quizzes made by fans, with questions from many series. Set how far you have watched or read, and only get questions that are safe for you.`,
    alternates: { canonical: `/${group.slug}-quiz` },
    openGraph: {
      title: `${group.name} Quiz | ${brand}`,
      description: `Free ${group.name} quizzes. Can you pass them all?`,
      url: `${origin}/${group.slug}-quiz`,
      images: [{ url: image, width: 1200, height: 630, alt: `${group.name} Quiz` }],
    },
    twitter: { card: 'summary_large_image', images: [image] },
    ...(hubIndexable(n) ? {} : { robots: { index: false, follow: true } }),
  };
}
