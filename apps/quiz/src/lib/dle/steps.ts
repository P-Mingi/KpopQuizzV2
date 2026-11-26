// Otakudle in two steps (L42, owner request of 2026-11-26): what the page reads in the play state and the words it adds. Pure, no I/O. A play state without the step fields (the SQL of
// L42 not applied, or a game other than Otakudle) is the old one board game: stepView says so and nothing else of this file is used.
import { OTAKUDLE_COLUMNS, valueLabel } from './copy';
import { stepValueFr } from './step-value-fr';
import { dleGame } from './games';

import type { DleColumnCopy } from './copy';
import type { DleGameId } from './games';
import type { DleGuess, DleLocale, DlePlayState, DlePoolEntity, DleStepCell, DleStepColumn, DleStepValue } from './types';

export interface StepView {
  /** The play state carries the step fields: two boards. */
  readonly two: boolean;
  /** A guess is a character of the right anime. */
  readonly found: boolean;
  readonly series: string | null;
  /** The title of the anime as the pool stores it. */
  readonly seriesLabel: string | null;
  /** The guess (1-based) that found the anime; the tries of step 1. */
  readonly anime: number;
  /** The guesses that are characters of the anime: the rows of the board of step 2. */
  readonly character: number;
  /** The characters of the anime in the pool. */
  readonly total: number | null;
  readonly columns: readonly DleStepColumn[];
}

const NONE: StepView = { two: false, found: false, series: null, seriesLabel: null, anime: 0, character: 0, total: null, columns: [] };

export function stepView(play: DlePlayState | null | undefined): StepView {
  if (!play || (play.step !== 1 && play.step !== 2)) return NONE;
  if (play.step === 1) return { ...NONE, two: true };
  return {
    two: true,
    found: true,
    series: play.series ?? null,
    seriesLabel: play.series_label ?? null,
    anime: play.step1_guesses ?? 0,
    character: play.step2_guesses ?? 0,
    total: typeof play.step2_total === 'number' ? play.step2_total : null,
    columns: play.step2_columns ?? [],
  };
}

/** The rows of the board of step 1: every guess but the ones of the right anime after the one that found it (those are rows of step 2 only). */
export function board1(guesses: readonly DleGuess[], v: StepView): readonly DleGuess[] {
  if (!v.found) return guesses;
  return guesses.filter((g, i) => !g.step2 || i + 1 === v.anime);
}

/** The rows of the board of step 2: the guesses that are characters of the right anime. */
export function board2(guesses: readonly DleGuess[]): readonly DleGuess[] {
  return guesses.filter((g) => g.step2 !== undefined);
}

/** The game that holds the columns of a series that existed before L42 (One Piece, Dragon Ball): their words and their values are the app's own; null for the other series. */
export function legacyGame(series: string | null): DleGameId | null {
  return series === 'one-piece' ? 'otakudle-one-piece' : series === 'dragon-ball' ? 'otakudle-dragon-ball' : null;
}

/** The words of a column of step 2: gender is the app's; the columns of L42a carry their own in both languages; the columns of One Piece and Dragon Ball are in their game's copy. */
export function columnWords(col: DleStepColumn, series: string | null, locale: DleLocale, own: (game: DleGameId) => Readonly<Record<string, DleColumnCopy>>): { label: string; help: string } {
  if (col.key === 'gender') return { label: OTAKUDLE_COLUMNS[locale].gender!.label, help: OTAKUDLE_COLUMNS[locale].gender!.help };
  if (col.label) return { label: col.label[locale] ?? col.label.en, help: col.help?.[locale] ?? col.help?.en ?? '' };
  const g = legacyGame(series);
  const c = g ? own(g)[col.key] : undefined;
  return { label: c?.label ?? col.key, help: c?.help ?? '' };
}

/** One value of step 2 in the words of a locale. */
export function stepText(col: DleStepColumn, series: string | null, value: DleStepValue | null | undefined, locale: DleLocale): string {
  if (!value || value.v === null || value.v === undefined) return '';
  if (col.key === 'gender') return valueLabel('gender', value.v, locale);
  const g = legacyGame(series);
  if (g && !col.label) return valueLabel(col.key, value.v, locale, { series: true, ...(value.l ? { label: value.l } : {}) });
  if (col.kind === 'ordinal') return (locale === 'fr' ? value.lf ?? value.l : value.l) ?? String(value.v);
  // The words of a value are the data's English; on the French page a common word reads in French (step-value-fr.ts), a proper noun stays as stored.
  const word = (x: string | number): string => (locale === 'fr' && typeof x === 'string' ? stepValueFr(x) : String(x));
  return Array.isArray(value.v) ? value.v.map(word).join(', ') : word(value.v as string | number);
}

/** The right cells of each guess of step 2, for the share. */
export function step2Counts(guesses: readonly DleGuess[]): number[] {
  return board2(guesses).map((g) => (g.step2 as readonly DleStepCell[]).filter((c) => c.status === 'correct').length);
}

/** The characters the input offers: before the anime is found all of them, after it only the ones of that anime (the title the pool stores in its series column). */
export function offered(entities: readonly DlePoolEntity[], v: StepView): readonly DlePoolEntity[] {
  if (!v.found || !v.seriesLabel) return entities;
  return entities.filter((e) => e.attrs.series?.v === v.seriesLabel);
}

export interface StepCopy {
  readonly bannerTitle: (n: number, series: string) => string;
  readonly bannerText: (total: number | null) => string;
  readonly board1Title: string;
  readonly board2Title: string;
  readonly board1Caption: string;
  readonly board2Caption: string;
  readonly placeholder: (series: string) => string;
  readonly proposeLabel: (series: string) => string;
  readonly wonLine: (total: number, anime: number, character: number) => string;
  readonly gaveUpLine: (total: number, anime: number | null) => string;
  readonly shareOutcome: (total: number, anime: number, character: number) => string;
  readonly shareLine1: string;
  readonly shareLine2: string;
  readonly step1Label: string;
  readonly step2Label: string;
  readonly emptyStep2: string;
  readonly rowHead2: string;
  readonly announceFound: (n: number, series: string) => string;
  readonly stepSr: (n: 1 | 2) => string;
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

const COPY: Readonly<Record<DleLocale, StepCopy>> = {
  en: {
    bannerTitle: (n, s) => `Anime found in ${n} ${plural(n, 'guess', 'guesses')}: ${s}.`,
    bannerText: (k) => (k === null ? 'Now find the character.' : `Now find the character among its ${k}.`),
    board1Title: 'Step 1: the anime',
    board2Title: 'Step 2: the character',
    board1Caption: 'Each guess compared with the anime of the day',
    board2Caption: 'Each character of the anime compared with the character of the day',
    placeholder: (s) => `A character of ${s}`,
    proposeLabel: (s) => `Propose a character of ${s}`,
    wonLine: (t, a, c) => `Found in ${t} ${plural(t, 'guess', 'guesses')}: anime in ${a}, character in ${c}.`,
    gaveUpLine: (t, a) => (a === null ? `You gave up after ${t} ${plural(t, 'guess', 'guesses')}, before finding the anime.` : `You gave up after ${t} ${plural(t, 'guess', 'guesses')}: anime found in ${a}.`),
    shareOutcome: (t, a, c) => `found in ${t} ${plural(t, 'guess', 'guesses')} (anime in ${a}, character in ${c})`,
    shareLine1: 'Anime',
    shareLine2: 'Character',
    step1Label: 'anime',
    step2Label: 'character',
    emptyStep2: 'The clues of the character will show here',
    rowHead2: 'Character',
    announceFound: (n, s) => `Anime found in ${n} ${plural(n, 'guess', 'guesses')}: ${s}. Step 2 is open.`,
    stepSr: (n) => `Step ${n} of 2`,
  },
  fr: {
    bannerTitle: (n, s) => `Anime trouvé en ${n} ${plural(n, 'essai', 'essais')} : ${s}.`,
    bannerText: (k) => (k === null ? 'Trouve maintenant le personnage.' : `Trouve maintenant le personnage parmi ses ${k}.`),
    board1Title: 'Étape 1 : l’anime',
    board2Title: 'Étape 2 : le personnage',
    board1Caption: 'Chaque essai comparé avec l’anime du jour',
    board2Caption: 'Chaque personnage de l’anime comparé avec le personnage du jour',
    placeholder: (s) => `Un personnage de ${s}`,
    proposeLabel: (s) => `Proposer un personnage de ${s}`,
    wonLine: (t, a, c) => `Trouvé en ${t} ${plural(t, 'essai', 'essais')} : anime en ${a}, personnage en ${c}.`,
    gaveUpLine: (t, a) => (a === null ? `Tu as abandonné après ${t} ${plural(t, 'essai', 'essais')}, avant d’avoir trouvé l’anime.` : `Tu as abandonné après ${t} ${plural(t, 'essai', 'essais')} : anime trouvé en ${a}.`),
    shareOutcome: (t, a, c) => `trouvé en ${t} ${plural(t, 'essai', 'essais')} (anime en ${a}, personnage en ${c})`,
    shareLine1: 'Anime',
    shareLine2: 'Personnage',
    step1Label: 'anime',
    step2Label: 'personnage',
    emptyStep2: 'Les indices du personnage apparaîtront ici',
    rowHead2: 'Personnage',
    announceFound: (n, s) => `Anime trouvé en ${n} ${plural(n, 'essai', 'essais')} : ${s}. L’étape 2 est ouverte.`,
    stepSr: (n) => `Étape ${n} sur 2`,
  },
};

export const stepCopy = (locale: DleLocale): StepCopy => COPY[locale];

/** Is this game the one that has two steps (only the Otakudle across all series). */
export const hasSteps = (game: DleGameId): boolean => game === 'otakudle' && !dleGame(game).series;
