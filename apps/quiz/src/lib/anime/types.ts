// Run O1 contract o1-contract-v1: the anime domain's names and shapes (schema.sql 009, 011, 014, 015; cookies.md 7;
// rpcs.md 3). Types and constants only. Nothing on the kpop path imports this module; K1, O2 to O6 and E1 build on
// it. Row types come from the generated lib/db/contract.types.ts, so they follow schema.sql by construction.
//
// Sources: S 2.4 to 2.7 (series data), 3.3 to 3.5 (question kinds, validation, spoiler tags), 4.4 (daily bank),
// BACKLOG 5.1 ("anime question JSON = existing shape + {kind, spoiler {arc, scope}, fact_ids, source_url}").

import type { TableRow } from '../db/contract.types';
import type {
  GuessFromCluesQuestion, IntruderQuestion, MultipleChoiceQuestion, TrueFalseQuestion,
} from '../db/types';

// ---------------------------------------------------------------------------------------------------------------
// 1. Series data (schema.sql 011, 014)
// ---------------------------------------------------------------------------------------------------------------

export type SeriesRow = TableRow<'public.series'>;
export type ArcRow = TableRow<'public.arcs'>;
export type CharacterRow = TableRow<'public.characters'>;
export type EpisodeRow = TableRow<'public.episodes'>;
export type SeriesThemeRow = TableRow<'public.series_themes'>;
export type SeriesProgressRow = TableRow<'public.series_progress'>;
export type FavouriteCharacterRow = TableRow<'public.favourite_characters'>;
export type DailyOpeningRow = TableRow<'public.daily_openings'>;

export type SeriesType = SeriesRow['type'];
export type SeriesStatus = SeriesRow['status'];
export type SeriesTier = NonNullable<SeriesRow['tier']>;
export type ArcKind = ArcRow['kind'];
export type CharacterRole = CharacterRow['role'];
export type ThemeKind = SeriesThemeRow['kind'];
/** `status` of arcs, characters, episodes and themes: only 'published' rows are public (RLS). */
export type ContentStatus = ArcRow['status'];
/** The medium a reader follows (`series_progress.medium`). */
export type SpoilerMedium = SeriesProgressRow['medium'];

/** One element of `series.studios` (S 2.4: with the seasons it made when the studio changed). F0 decision 66. */
export interface SeriesStudio {
  readonly name: string;
  readonly seasons?: readonly number[];
}

/** One element of `series.authors` (S 2.4: story, art, or both). F0 decision 66. */
export interface SeriesAuthor {
  readonly name: string;
  readonly role: 'story' | 'art' | 'story_art';
}

/** The anime topic row of a series in `groups` (site_id 'anime'); `series.group_id` points at it, 1:1. */
export const ANIME_MIX_SLUG = 'anime-mix';

/** Series slug (naming.md, routes.md 4): `groups.slug` of the anime topic row, unique across sites. */
export const SERIES_SLUG_RE = /^[a-z0-9-]{1,60}$/;

/** Blind test qualification of a series playlist and the series page link (S 2.6, BACKLOG O6). */
export const MIN_PLAYABLE_THEMES = 15;

/** Oshi counts show only from this many picks (the threshold rule; the `favourite_character_counts` view). */
export const MIN_OSHI_PICKS = 30;

// ---------------------------------------------------------------------------------------------------------------
// 2. Questions (S 3.3 to 3.5, BACKLOG 5.1)
// ---------------------------------------------------------------------------------------------------------------

/**
 * The per-question kind tag (S 3.3); no new engine type. `lore` (the rules and terms of the story's world) is the
 * kind S 4.7's sample quiz uses for three questions, which E1's done test must pass (F0 decision 75). A new kind is a
 * CR (an optional format field, 5.2). formats.md 2 and `anime-question.schema.json` list the same values.
 */
export const ANIME_QUESTION_KINDS = [
  'character', 'quote', 'arc', 'episode', 'music', 'ability', 'production', 'manga', 'odd_one_out', 'lore',
] as const;
export type AnimeQuestionKind = (typeof ANIME_QUESTION_KINDS)[number];

/** `quizzes.spoiler_scope` and a question tag's scope (schema.sql 011). */
export const SPOILER_SCOPES = ['anime', 'manga', 'both'] as const;
export type SpoilerScope = (typeof SPOILER_SCOPES)[number];

/** A question's spoiler tag: `arc` is an arc `ord` of the series, 0 for a spoiler-free question (S 3.5). */
export interface QuestionSpoiler {
  readonly arc: number;
  readonly scope: SpoilerScope;
}

/** The tags every anime question carries on top of the engine's shape (BACKLOG 5.1). */
export interface AnimeQuestionTags {
  readonly kind: AnimeQuestionKind;
  readonly spoiler: QuestionSpoiler;
  /** Verified fact ids the question rests on; required for Team accounts (S 3.4 rule 8). */
  readonly fact_ids?: readonly string[];
  /** An allowed source (COMMON rule 8); required for Team accounts. */
  readonly source_url?: string;
}

/** An intruder option on anime: text label only, never an image (S 3.4 rule 1). */
export interface AnimeIntruderOption {
  readonly label: string;
  readonly image_url?: undefined;
}

/** An intruder question on anime: the engine's shape with text-only options. */
export type AnimeIntruderQuestion = Omit<IntruderQuestion, 'options'> & {
  readonly options: readonly [AnimeIntruderOption, AnimeIntruderOption, AnimeIntruderOption, AnimeIntruderOption];
};

/** An anime question as stored in `quizzes.questions`: no image type on anime (S 3.4 rule 1). */
export type AnimeQuestion = (
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | GuessFromCluesQuestion
  | AnimeIntruderQuestion
) & AnimeQuestionTags;

/** The categories of an anime daily bank row (`quiz_bank.category`, schema.sql 009; S 4.4). */
export const ANIME_BANK_CATEGORIES = [
  'series_specific', 'who_am_i', 'name_the_series', 'music', 'creators_studios', 'odd_one_out', 'crossover',
] as const;
export type AnimeBankCategory = (typeof ANIME_BANK_CATEGORIES)[number];

// ---------------------------------------------------------------------------------------------------------------
// 3. Spoiler level and progress (S 2.7, 3.4 rule 5; cookies.md 7)
// ---------------------------------------------------------------------------------------------------------------

/** A quiz's spoiler level, computed on the server, never taken from the client (S 3.4 rule 5). */
export interface SpoilerLevel {
  /** `quizzes.spoiler_arc_ord`: the highest tag, 0 when every question is spoiler-free. */
  readonly arcOrd: number;
  /** `quizzes.spoiler_scope`: null when `arcOrd` is 0. */
  readonly scope: SpoilerScope | null;
}

/** "Show everything": the progress value above every arc (fits `series_progress.arc_ord`, a smallint). */
export const SPOILER_SHOW_ALL = 32767;

/**
 * A reader's progress on one series: `series_progress` when signed in, `anime.spoiler.v1` for a guest
 * (cookies.md 7: `{[seriesSlug]: {arc, scope}}` where `scope` is the medium followed). `arc` 0 is the spoiler-free
 * view (the default of a first visit), SPOILER_SHOW_ALL is "Show everything".
 */
export interface SpoilerProgress {
  readonly arc: number;
  readonly scope: SpoilerMedium;
}

/** The guest store under the localStorage key `anime.spoiler.v1`, keyed by series slug. */
export type AnimeSpoilerStore = Readonly<Record<string, SpoilerProgress>>;
export const ANIME_SPOILER_STORE_KEY = 'anime.spoiler.v1';

/** What the spoiler shield needs of an arc (from `arcs`). */
export interface SpoilerArc {
  readonly ord: number;
  readonly name: string;
  readonly mangaOnly: boolean;
  readonly animeOnly: boolean;
}

/** The signatures of O3's spoiler core (`lib/anime/spoilers/`). */
export interface AnimeSpoilerFns {
  /**
   * `arcOrd` = the highest `spoiler.arc` of the questions (0 when none is tagged, then `scope` null). `scope`:
   * 'manga' when a tagged question has scope 'manga' or an arc whose ord is in `mangaOnlyArcs`; else 'anime' when
   * every tagged question has scope 'anime'; else 'both'.
   */
  computeSpoilerLevel(
    questions: readonly { readonly spoiler?: QuestionSpoiler }[],
    mangaOnlyArcs?: ReadonlySet<number>,
  ): SpoilerLevel;
  /**
   * "Safe for you" (S 2.7; O2's quiz cards and O3's quiz page): true when `level.arcOrd` is 0, or when
   * `progress.arc >= level.arcOrd` and not (`level.scope` 'manga' with `progress.scope` 'anime').
   */
  isSafeFor(level: SpoilerLevel, progress: SpoilerProgress): boolean;
}

/**
 * Props of `SpoilerShield` (O3, components/spoilers/): "I follow the [Anime / Manga] and I have seen up to [arc]",
 * "Spoiler-free view", "Show everything". It reads and writes the guest store (try/catch) or `series_progress`,
 * and tells its page through `onChange`; with no stored value the progress is the spoiler-free view.
 */
export interface SpoilerShieldProps {
  readonly seriesSlug: string;
  readonly groupId: number;
  readonly arcs: readonly SpoilerArc[];
  readonly signedIn: boolean;
  readonly onChange?: (progress: SpoilerProgress) => void;
}
