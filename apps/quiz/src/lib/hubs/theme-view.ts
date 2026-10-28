// What a General K-pop theme page shows (SEO phase 1, PR 15), from the theme config and the published quizzes of
// the category. Pure. Only quizzes that are still published and not held are listed, in the plan's order; a quiz
// listed in a section never repeats in "Also fits this topic". Every number on the page comes from this list.

import { GENERAL_THEMES, HELD_FROM_THEMES, THEME_MIN_LISTED } from './general-themes';
import { quizAverage } from '@/lib/quiz/quiz-average';

import type { GeneralTheme } from './general-themes';
import type { HubQuiz } from '@/lib/ux-v1/p3/model';

export interface ThemeCard {
  slug: string;
  title: string;
  quizType: string;
  difficulty: string;
  plays: number;
  questions: number;
  /** From 30 completed plays (lib/quiz/quiz-average.ts), else null. */
  averagePct: number | null;
  createdAt: string;
}

export interface ThemeView {
  theme: GeneralTheme;
  sections: Array<{ heading: string | null; quizzes: ThemeCard[] }>;
  also: ThemeCard[];
  /** Quizzes in the sections (the "Also fits" listings are not counted). */
  listed: number;
  questions: number;
  levels: { easy: number; medium: number; hard: number };
  /** The newest created_at of a listed quiz (the page's content date), or null. */
  updated: string | null;
  first: ThemeCard | null;
  /** The intro with its {count}. */
  intro: string;
  /** Under THEME_MIN_LISTED listed quizzes the page is noindex and out of the sitemap. */
  indexable: boolean;
}

const held = new Set(HELD_FROM_THEMES);

function card(q: HubQuiz): ThemeCard {
  return {
    slug: q.slug, title: q.title, quizType: q.quiz_type, difficulty: q.difficulty, plays: q.play_count,
    questions: q.question_count, createdAt: q.created_at,
    averagePct: quizAverage({ quiz_type: q.quiz_type as Parameters<typeof quizAverage>[0]['quiz_type'], total_score_sum: q.total_score_sum, total_completions: q.total_completions, question_count: q.question_count })?.pct ?? null,
  };
}

export function buildThemeView(theme: GeneralTheme, published: HubQuiz[]): ThemeView {
  const bySlug = new Map(published.map((q) => [q.slug, q]));
  const pick = (slugs: readonly string[]): ThemeCard[] => slugs
    .filter((s) => !held.has(s))
    .map((s) => bySlug.get(s))
    .filter((q): q is HubQuiz => q !== undefined)
    .map(card);
  const sections = theme.sections.map((s) => ({ heading: s.heading, quizzes: pick(s.slugs) })).filter((s) => s.quizzes.length > 0);
  const inSections = new Set(sections.flatMap((s) => s.quizzes.map((q) => q.slug)));
  const also = pick(theme.alsoFits).filter((q) => !inSections.has(q.slug));
  const all = sections.flatMap((s) => s.quizzes);
  const levels = { easy: 0, medium: 0, hard: 0 };
  for (const q of all) if (q.difficulty === 'easy' || q.difficulty === 'medium' || q.difficulty === 'hard') levels[q.difficulty] += 1;
  const updated = all.reduce<string | null>((m, q) => (m === null || q.createdAt > m ? q.createdAt : m), null);
  return {
    theme,
    sections,
    also,
    listed: all.length,
    questions: all.reduce((n, q) => n + q.questions, 0),
    levels,
    updated,
    first: all[0] ?? null,
    intro: theme.intro.replace('{count}', String(all.length)),
    indexable: all.length >= THEME_MIN_LISTED,
  };
}

// The short name of each theme in running text (PR 16: the category hub's description and FAQ). Every theme has
// one (pinned by theme-view.test.ts).
export const TOPIC_NAMES: Readonly<Record<string, string>> = {
  'kpop-history-quiz': 'K-pop history',
  'kpop-debut-quiz': 'debuts',
  'kpop-company-quiz': 'companies',
  'kpop-fandom-quiz': 'fandoms',
  'kpop-discography-quiz': 'discography',
  'kpop-dance-quiz': 'dance',
  'kpop-awards-quiz': 'awards',
  'kpop-drama-variety-quiz': 'TV shows',
  'kpop-idol-quiz': 'idols',
  'kpop-groups-quiz': 'groups',
};

/** "K-pop history, debuts, ... and groups", in the given order. */
export function topicList(themes: readonly GeneralTheme[]): string {
  const names = themes.map((t) => TOPIC_NAMES[t.slug] ?? t.h1);
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The theme whose sections list this quiz (its primary theme; one at most, pinned by general-themes.test.ts). */
export function primaryTheme(slug: string): GeneralTheme | null {
  if (held.has(slug)) return null;
  return GENERAL_THEMES.find((t) => t.sections.some((s) => s.slugs.includes(slug))) ?? null;
}

/**
 * The published quizzes that follow this one on its theme page, in the page's order, wrapping to the start
 * (PR 16b: the "More ... quizzes" grid of a General K-pop quiz). Never the quiz itself, never a held one.
 */
export function themeNext(theme: GeneralTheme, slug: string, publishedSlugs: ReadonlySet<string>, max: number): string[] {
  const order = theme.sections.flatMap((s) => s.slugs).filter((s) => !held.has(s));
  const at = order.indexOf(slug);
  if (at < 0) return [];
  const after = [...order.slice(at + 1), ...order.slice(0, at)];
  return after.filter((s) => publishedSlugs.has(s)).slice(0, max);
}

/** The listed count of every theme, for the sibling rows, the hub section and the sitemap. */
export function themeCounts(publishedSlugs: ReadonlySet<string>): Map<string, number> {
  return new Map(GENERAL_THEMES.map((t) => [
    t.slug,
    t.sections.reduce((n, s) => n + s.slugs.filter((slug) => !held.has(slug) && publishedSlugs.has(slug)).length, 0),
  ]));
}
