// Run O1, lot E1b: the quiz draft of a Team account on kpopquiz.org (docs/o1/contracts/formats.md 4), validated before it is
// stored, before an admin approves it and again before the publisher writes it. Pure and unit tested (quiz.test.ts).
//
// The entry is the stored form of the draft (editorial_drafts.payload, kind 'quiz'). On kpop the questions are the Classic
// multiple choice of today (question, 4 options, the index of the right one, an optional fun fact) plus the `source_url` the
// contract keeps; `kind`, `spoiler` and `fact_ids` (the tags of an anime draft) are accepted and never stored in the quiz.
// Rules beyond the schema, owner decisions of 2026-11-03: exactly 10 questions, multiple_choice, no image of any kind (the group
// logo is the cover), English, a title that is not the query of a hub (kpopquiz-seo 1.5), a slug that is not the hub's slug (1.6),
// every question cites one of the sources of the draft, and no source from a site the rulebook forbids (5.3: Fandom wikis and
// kprofiles are not sources; Soompi and allkpop are leads, never sources).

import { hubSlugGroup } from '@/lib/seo/hub-slugs';
import { sanitizeCreatorNote } from '@/lib/quiz/creator-note';
import { parseResultLevels } from '@/lib/quiz/result-levels';

import type { ResultLevel } from '@/lib/quiz/result-levels';

import type { QuizWrite } from './types';

export const QUIZ_QUESTION_COUNT = 10;
export const MAX_SOURCES = 20;
export const NOTES_MAX = 500;

export interface QuizDraftSource { id: string; title: string; url: string }
export interface QuizDraftQuestion {
  question: string;
  options: string[];
  correct: number;
  fun_fact?: string;
  source_url: string;
  /** Tags of an anime draft: kept in the stored draft, never in the quiz. */
  kind?: string;
  spoiler?: unknown;
  fact_ids?: string[];
}
export interface QuizDraftPayload {
  site: 'kpop';
  account: string;
  group_slug: string;
  title: string;
  slug: string;
  description?: string;
  /** Audit 04 P1-6: the instant after which the quiz is no longer published (an award show's start). ISO date or date-time, UTC. Absent = no deadline. */
  publish_by?: string;
  /** Audit 04 P2-2: a result in levels named after the fandom ("Rookie STAY"), kept in quizzes.settings.result_levels (lib/quiz/result-levels.ts). Team quizzes only. */
  result_levels?: ResultLevel[];
  quiz_type: 'multiple_choice';
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'en';
  title_gives_nothing_away: true;
  questions: QuizDraftQuestion[];
  sources: QuizDraftSource[];
  notes?: string;
}

export type PayloadResult = { ok: true; value: QuizDraftPayload } | { ok: false; error: QuizPayloadError; detail: string };

export type QuizPayloadError =
  | 'bad_payload' | 'bad_site' | 'bad_account' | 'bad_group_slug' | 'bad_title' | 'title_is_hub_query' | 'bad_slug' | 'hub_slug'
  | 'bad_description' | 'bad_publish_by' | 'bad_result_levels' | 'bad_quiz_type' | 'bad_difficulty' | 'bad_language' | 'title_gives_something_away' | 'bad_question_count'
  | 'bad_question' | 'bad_sources' | 'blocked_source' | 'image_not_allowed' | 'bad_notes';

const bad = (error: QuizPayloadError, detail: string): { ok: false; error: QuizPayloadError; detail: string } => ({ ok: false, error, detail });

/** One line, trimmed, no U+2013 or U+2014, no emoji (formats.md common.schema plainText). */
export function isPlainText(s: unknown, max: number): s is string {
  if (typeof s !== 'string' || s.length === 0 || s.length > max) return false;
  if (s !== s.trim()) return false;
  return !/[\n\r\u2013\u2014\p{Extended_Pictographic}]/u.test(s);
}

/** Hosts a quiz source may never be (COMMON rule 8, check C10, kpopquiz-seo 5.2 and 5.3). */
export const BLOCKED_SOURCE_HOSTS: readonly string[] = [
  'kprofiles.com', 'fandom.com', 'wikia.com', 'soompi.com', 'allkpop.com', 'myanimelist.net', 'jikan.moe', 'animethemes.moe', 'anilist.co', 'sporcle.com',
];

/** The https URL of a source: lowercase host, at most 500 characters. Null when it is not one. */
export function sourceUrlOf(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 500) return null;
  return /^https:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#][^\s<>"']*)?$/.test(raw) ? raw : null;
}

export function isBlockedSource(url: string): boolean {
  const host = /^https:\/\/([a-z0-9.-]+)/.exec(url)?.[1] ?? '';
  return BLOCKED_SOURCE_HOSTS.some((b) => host === b || host.endsWith(`.${b}`));
}

const words = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** True when a title is the query of a hub: "{group} quiz", "{group} test", "{group} trivia" or "quiz {group}" (kpopquiz-seo 1.5). */
export function isHubQueryTitle(title: string, groupSlug: string): boolean {
  const t = words(title);
  const g = words(groupSlug);
  if (!t || !g) return false;
  return ['quiz', 'test', 'trivia'].some((k) => t === `${g} ${k}` || t === `${k} ${g}`);
}

/** Why a slug is refused for the group it is filed under, or null: the hub slugs "{group}-quiz", "-test" and "-trivia" (rulebook 1.6). */
export function slugRefusal(slug: string, groupSlug: string, isGroupSlug: (s: string) => boolean = () => false): 'bad_slug' | 'hub_slug' | null {
  if (slug.length === 0 || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'bad_slug';
  const hub = hubSlugGroup(slug);
  if (hub && (hub.group === groupSlug || isGroupSlug(hub.group))) return 'hub_slug';
  return null;
}

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
/** A publish_by value as an instant (ms, UTC): "2026-11-14" is the start of that day, "2026-11-14T09:00:00Z" is exact. Null when it is neither. */
export function publishByMs(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const t = Date.parse(`${v}T00:00:00Z`);
    return Number.isFinite(t) && new Date(t).toISOString().startsWith(v) ? t : null;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/.test(v)) { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  return null;
}

const IMAGE_KEYS = /^(image|image_url|img|cover|cover_image_url|photo|picture|thumbnail)$/i;
const QUESTION_KEYS = new Set(['question', 'options', 'correct', 'fun_fact', 'source_url', 'kind', 'spoiler', 'fact_ids']);
const TOP_KEYS = new Set(['site', 'account', 'group_slug', 'title', 'slug', 'description', 'publish_by', 'result_levels', 'quiz_type', 'difficulty', 'language', 'title_gives_nothing_away', 'questions', 'sources', 'notes']);

function hasImageKey(v: unknown, depth = 0): boolean {
  if (depth > 4 || v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return v.some((x) => hasImageKey(x, depth + 1));
  return Object.entries(v as Record<string, unknown>).some(([k, x]) => IMAGE_KEYS.test(k) || hasImageKey(x, depth + 1));
}

/**
 * Validates a quiz draft entry. `detail` is a one line reason for the admin (it names the question). The slug is checked
 * for its own shape and for the hub slug of its own group here; the other groups' hubs and the slugs already taken need the
 * database (slugRefusal with isGroupSlug, the store's slugsTaken).
 */
export function checkQuizPayload(raw: unknown): PayloadResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return bad('bad_payload', 'The draft is not an object.');
  const p = raw as Record<string, unknown>;
  if (hasImageKey(p)) return bad('image_not_allowed', 'A quiz draft carries no image: the group logo is the cover.');
  for (const k of Object.keys(p)) if (!TOP_KEYS.has(k)) return bad('bad_payload', `Unknown field "${k}".`);

  if (p.site !== 'kpop') return bad('bad_site', 'The site of the draft must be kpop.');
  if (typeof p.account !== 'string' || !/^[a-z0-9_]{3,20}$/.test(p.account)) return bad('bad_account', 'The account is a username (3 to 20 letters, digits or underscores).');
  if (typeof p.group_slug !== 'string' || !/^[a-z0-9-]{1,60}$/.test(p.group_slug)) return bad('bad_group_slug', 'The group slug is lowercase words joined by hyphens.');
  if (!isPlainText(p.title, 100) || p.title.length < 5) return bad('bad_title', 'The title needs 5 to 100 characters on one line, with no dash and no emoji.');
  if (isHubQueryTitle(p.title, p.group_slug)) return bad('title_is_hub_query', 'The title is the query of the group hub. Name what the quiz asks.');
  if (typeof p.slug !== 'string') return bad('bad_slug', 'The slug is missing.');
  const refusal = slugRefusal(p.slug, p.group_slug);
  if (refusal === 'hub_slug') return bad('hub_slug', 'The slug is the slug of the group hub ("{group}-quiz", "-test" or "-trivia").');
  if (refusal) return bad('bad_slug', 'The slug is lowercase letters, digits and single hyphens, 80 characters at most.');
  if (p.description !== undefined && (!isPlainText(p.description, 280))) return bad('bad_description', 'The description is one line of 280 characters at most, with no dash and no emoji.');
  if (p.publish_by !== undefined && publishByMs(p.publish_by) === null) return bad('bad_publish_by', 'publish_by is a UTC date (2026-11-14) or date-time (2026-11-14T09:00:00Z).');
  if (p.result_levels !== undefined && parseResultLevels({ result_levels: p.result_levels }) === null) return bad('bad_result_levels', 'result_levels are 2 to 8 levels with distinct thresholds from 0 to 100, one of them 0, each with a name and a blurb.');
  if (p.quiz_type !== 'multiple_choice') return bad('bad_quiz_type', 'The quiz type is multiple_choice.');
  if (typeof p.difficulty !== 'string' || !(DIFFICULTIES as readonly string[]).includes(p.difficulty)) return bad('bad_difficulty', 'The difficulty is easy, medium or hard.');
  if (p.language !== 'en') return bad('bad_language', 'The language is en.');
  if (p.title_gives_nothing_away !== true) return bad('title_gives_something_away', 'The author must confirm the title gives no answer away.');
  if (p.notes !== undefined && !isPlainText(p.notes, NOTES_MAX)) return bad('bad_notes', 'The notes are one line of 500 characters at most.');

  // Sources first: the questions cite them.
  if (!Array.isArray(p.sources) || p.sources.length < 1 || p.sources.length > MAX_SOURCES) return bad('bad_sources', 'A draft lists 1 to 20 sources.');
  const sources: QuizDraftSource[] = [];
  for (const [i, s] of (p.sources as unknown[]).entries()) {
    const o = (s ?? {}) as Record<string, unknown>;
    const url = sourceUrlOf(o.url);
    if (typeof o.id !== 'string' || !/^S[1-9][0-9]?$/.test(o.id) || !isPlainText(o.title, 160) || !url) return bad('bad_sources', `Source ${i + 1} needs an id (S1 to S99), a title and an https link.`);
    if (isBlockedSource(url)) return bad('blocked_source', `Source ${i + 1} is a site the rulebook does not allow as a source.`);
    if (sources.some((x) => x.id === o.id || x.url === url)) return bad('bad_sources', `Source ${i + 1} repeats an id or a link.`);
    sources.push({ id: o.id, title: o.title, url });
  }
  const urls = new Set(sources.map((s) => s.url));

  if (!Array.isArray(p.questions) || p.questions.length !== QUIZ_QUESTION_COUNT) return bad('bad_question_count', `A quiz holds exactly ${QUIZ_QUESTION_COUNT} questions.`);
  const questions: QuizDraftQuestion[] = [];
  for (const [i, qv] of (p.questions as unknown[]).entries()) {
    const n = i + 1;
    const q = (qv ?? {}) as Record<string, unknown>;
    if (qv === null || typeof qv !== 'object' || Array.isArray(qv)) return bad('bad_question', `Question ${n} is not an object.`);
    for (const k of Object.keys(q)) if (!QUESTION_KEYS.has(k)) return bad('bad_question', `Question ${n} has an unknown field "${k}".`);
    if (!isPlainText(q.question, 300)) return bad('bad_question', `Question ${n}: the text is one line of 300 characters at most, with no dash and no emoji.`);
    if (!Array.isArray(q.options) || q.options.length !== 4) return bad('bad_question', `Question ${n}: it needs 4 options.`);
    const options: string[] = [];
    for (const [j, o] of (q.options as unknown[]).entries()) {
      if (!isPlainText(o, 120)) return bad('bad_question', `Question ${n}: option ${j + 1} is one line of 120 characters at most, with no dash and no emoji.`);
      options.push(o);
    }
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return bad('bad_question', `Question ${n}: the 4 options must differ.`);
    if (!Number.isInteger(q.correct) || (q.correct as number) < 0 || (q.correct as number) > 3) return bad('bad_question', `Question ${n}: the right answer is an index from 0 to 3.`);
    if (q.fun_fact !== undefined && !isPlainText(q.fun_fact, 280)) return bad('bad_question', `Question ${n}: the fun fact is one line of 280 characters at most, with no dash and no emoji.`);
    const url = sourceUrlOf(q.source_url);
    if (!url || !urls.has(url)) return bad('bad_question', `Question ${n}: its source_url must be one of the sources of the draft.`);
    const same = questions.findIndex((x) => words(x.question) === words(q.question as string));
    if (same !== -1) return bad('bad_question', `Question ${n} repeats question ${same + 1}.`);
    const out: QuizDraftQuestion = { question: q.question, options, correct: q.correct as number, source_url: url };
    if (q.fun_fact !== undefined) out.fun_fact = q.fun_fact as string;
    if (typeof q.kind === 'string') out.kind = q.kind;
    if (q.spoiler !== undefined) out.spoiler = q.spoiler;
    if (Array.isArray(q.fact_ids)) out.fact_ids = (q.fact_ids as unknown[]).filter((f): f is string => typeof f === 'string');
    questions.push(out);
  }

  const value: QuizDraftPayload = {
    site: 'kpop', account: p.account, group_slug: p.group_slug, title: p.title, slug: p.slug,
    quiz_type: 'multiple_choice', difficulty: p.difficulty as QuizDraftPayload['difficulty'], language: 'en', title_gives_nothing_away: true,
    questions, sources,
  };
  if (p.description !== undefined) value.description = p.description as string;
  if (p.publish_by !== undefined) value.publish_by = p.publish_by as string;
  if (p.result_levels !== undefined) value.result_levels = parseResultLevels({ result_levels: p.result_levels })!;
  if (p.notes !== undefined) value.notes = p.notes as string;
  return { ok: true, value };
}

/** The `sources` column of editorial_drafts (DraftSource rows: label and link) from the sources of the draft. */
export function draftSourcesOf(p: QuizDraftPayload): Array<{ label: string; url: string }> {
  return p.sources.map((s) => ({ label: s.title, url: s.url }));
}

/**
 * The quiz the publisher writes: the same payload the create route sends to create_quiz_bypass, for a Team account.
 * Questions keep question, options, correct, fun_fact and source_url (formats.md 4); the settings are the create funnel's;
 * the description becomes the creator note the page prints (sanitized as the create route does); no cover image.
 */
export function quizRowFor(accountId: string, groupId: number, p: QuizDraftPayload): QuizWrite {
  const note = sanitizeCreatorNote(p.description);
  return {
    creator_id: accountId,
    group_id: groupId,
    title: p.title,
    slug: p.slug,
    quiz_type: 'multiple_choice',
    difficulty: p.difficulty,
    language: 'en',
    questions: p.questions.map((q) => ({
      question: q.question, options: [...q.options], correct: q.correct, ...(q.fun_fact ? { fun_fact: q.fun_fact } : {}), source_url: q.source_url,
    })),
    settings: { timer: true, timer_seconds: 15, shuffle: false, show_answers: true, ...(note ? { creator_note: note } : {}), ...(p.result_levels ? { result_levels: p.result_levels } : {}) },
    question_count: p.questions.length,
    cover_image_url: null,
  };
}
