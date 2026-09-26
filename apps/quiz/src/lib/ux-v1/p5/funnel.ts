// P5 (UX v11 create): the EXISTS funnel's rules, in one pure module.
//
// components/create/create-funnel.tsx keeps its state model, validation gates and
// save calls inline and exports none of them. The v11 view (components/create/ux-v1)
// must keep them unchanged ("re-skin, never rewrite their state, validation or save
// calls"), so they are lifted here verbatim and funnel.test.ts proves parity by
// transpiling the legacy source and running both sides on the same inputs: same
// empty state, same draft restore / autosave mapping, same "has content" lock, same
// API question shapes, same gate messages, and the same requests in the same order
// (cover upload, deferred image uploads, POST /api/quiz/create with the same body).
// If either side changes, that test fails. One copy would be better: see
// v11/requests/P5.md (ORCH: make create-funnel.tsx import this module).

import { blankQuestionFor } from '@/lib/quiz-question';
import { isQuestionValid } from '@/lib/quiz-validation';
import { dataUrlToFile as realDataUrlToFile, clearDraft as realClearDraft } from '@/lib/create-draft';

import type { Draft, DraftDifficulty } from '@/lib/create-draft';
import type { QuestionData, IntruderOption } from '@/lib/quiz-question';
import type { CreatorStats } from '@/lib/creator-progress';

/** The group row the page passes in (same shape as the legacy FunnelGroup). */
export interface FunnelGroup {
  id: number;
  name: string;
  slug: string;
  display_color: string;
  text_color: string;
  logo_url: string | null;
  fandom_name: string;
}

// ---- constants (create-funnel.tsx) ----
export const TITLE_PLACEHOLDER = 'e.g. Only real ITZY stans can pass this';
export const MIN_QUESTIONS = 3; // I1: publish floor (matches /api/quiz/create + the DB constraint)
export const MIN_TITLE = 5;
export const RESUME_RETURN = '/create?resume=publish';
export const TITLE_MAX = 100;
/** Inline username claim (a signed-in account without a profile). */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export const DIFFICULTIES: { value: DraftDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export const GATE_ERROR = `Add a title (${MIN_TITLE}+ chars), pick a group, and complete at least ${MIN_QUESTIONS} questions.`;
export const RIGHTS_ERROR = 'Please confirm you have the right to use your cover image (on the first step).';
export const PUBLISH_FAILED = 'Could not publish. Try again.';
export const PUBLISH_OFFLINE = 'Could not publish. Check your connection and try again.';

// ---- state (create-funnel.tsx FunnelState) ----
export interface FunnelState {
  title: string;
  group_slug: string | null;
  newGroup: string | null; // Q-B1: a brand-new custom group name (sent as group_name at publish)
  difficulty: DraftDifficulty;
  language: string;
  quiz_type: string; // Q-B6: chosen on step 1, locked once questions exist
  cover: string | null;
  coverRights: boolean; // H9: "I have the right to use this image"
  creatorNote: string; // SEO indexguard PART 4: optional "About your quiz" note
  questions: QuestionData[];
}

export function emptyState(): FunnelState {
  return { title: '', group_slug: null, newGroup: null, difficulty: 'medium', language: 'en', quiz_type: 'multiple_choice', cover: null, coverRights: false, creatorNote: '', questions: [blankQuestionFor('multiple_choice')] };
}

/** The first render's state: a known ?group= deep link is pre-selected (a saved draft still wins). */
export function initialState(validInitialGroup: string | null): FunnelState {
  return validInitialGroup ? { ...emptyState(), group_slug: validInitialGroup } : emptyState();
}

/** /create?group=<slug> is honoured only for a known slug. */
export function validGroupSlug(groups: FunnelGroup[], slug: string | null | undefined): string | null {
  return slug && groups.some((g) => g.slug === slug) ? slug : null;
}

/** A question the creator has actually started filling in (locks the type picker so
 *  switching types mid-draft can't silently drop data). */
export function questionHasContent(q: QuestionData): boolean {
  if (q.question.trim()) return true;
  if (q.correct !== null) return true;
  if (Array.isArray(q.options)) {
    for (const o of q.options) {
      if (typeof o === 'string' ? o.trim() : (o.label?.trim() || o.image_url)) return true;
    }
  }
  if (q.clues?.some((c) => c.trim())) return true;
  if (q.image_url) return true;
  if (q.fun_fact?.trim()) return true;
  return false;
}

/** Restore a saved draft (mount). Old drafts predate newGroup / difficulty / language / type, all default safely. */
export function draftToState(d: Draft, validInitialGroup: string | null): FunnelState {
  return { title: d.title, group_slug: d.group_slug ?? validInitialGroup, newGroup: d.newGroup ?? null, difficulty: d.difficulty ?? 'medium', language: d.language ?? 'en', quiz_type: d.quiz_type ?? 'multiple_choice', cover: d.cover, coverRights: d.coverRights ?? false, creatorNote: d.creatorNote ?? '', questions: d.questions };
}

/** What the debounced autosave writes (saveDraft stamps updatedAt). */
export function stateToDraft(data: FunnelState): Omit<Draft, 'updatedAt'> {
  return { title: data.title, group_slug: data.group_slug, newGroup: data.newGroup, difficulty: data.difficulty, language: data.language, quiz_type: data.quiz_type, cover: data.cover, coverRights: data.coverRights, creatorNote: data.creatorNote, questions: data.questions };
}

/** Changing the type resets the questions to one blank of the new type (legacy onClick). */
export function withQuizType(s: FunnelState, quizType: string): FunnelState {
  if (quizType === s.quiz_type) return s;
  return { ...s, quiz_type: quizType, questions: [blankQuestionFor(quizType)] };
}

/** The list editor's onChange: an empty list falls back to one blank question of the type. */
export function withQuestions(s: FunnelState, qs: QuestionData[]): FunnelState {
  return { ...s, questions: qs.length ? qs : [blankQuestionFor(s.quiz_type)] };
}

// ---- step 1 gate (the legacy "Start adding questions" button's disabled rule) ----
export interface DetailsGate { title: boolean; group: boolean; rights: boolean }

export function hasGroupChosen(s: FunnelState, groups: FunnelGroup[]): boolean {
  return !!groups.find((g) => g.slug === s.group_slug) || !!s.newGroup;
}

export function detailsGate(s: FunnelState, groups: FunnelGroup[]): DetailsGate {
  return {
    title: s.title.trim().length >= MIN_TITLE,
    group: hasGroupChosen(s, groups),
    rights: !(s.cover && !s.coverRights),
  };
}

export function detailsReady(s: FunnelState, groups: FunnelGroup[]): boolean {
  const g = detailsGate(s, groups);
  return g.title && g.group && g.rights;
}

/** The legacy `ready` (step 3): title, group and enough complete questions. */
export function publishReady(s: FunnelState, groups: FunnelGroup[], nComplete: number): boolean {
  return s.title.trim().length >= MIN_TITLE && hasGroupChosen(s, groups) && nComplete >= MIN_QUESTIONS;
}

// ---- save calls (create-funnel.tsx) ----

/** The API question payload for the chosen type (trims text; images are already
 *  uploaded to https URLs by uploadDeferredImages before this runs). */
export function toApiQuestion(q: QuestionData, quizType: string): Record<string, unknown> {
  const out: Record<string, unknown> = { question: q.question.trim() };
  if (q.fun_fact && q.fun_fact.trim()) out.fun_fact = q.fun_fact.trim();
  if (quizType === 'true_false') {
    out.correct = q.correct;
    return out;
  }
  if (quizType === 'intruder') {
    out.correct = q.correct;
    out.options = (q.options as IntruderOption[]).map((o) => ({ label: o.label.trim(), image_url: o.image_url }));
    return out;
  }
  // multiple_choice / image / guess_from_clues share the 4-option index model.
  out.correct = q.correct;
  out.options = (q.options as string[]).map((o) => o.trim());
  if (quizType === 'guess_from_clues') out.clues = (q.clues ?? []).map((c) => c.trim());
  if (quizType === 'image') out.image_url = q.image_url;
  return out;
}

export interface SaveDeps {
  fetch: typeof fetch;
  dataUrlToFile: (dataUrl: string, name?: string) => Promise<File>;
  clearDraft: () => void;
}

const REAL_DEPS: SaveDeps = {
  fetch: (...args) => fetch(...args),
  dataUrlToFile: realDataUrlToFile,
  clearDraft: realClearDraft,
};

/** Upload one held-as-data-URL image through the SAME secure endpoint the cover
 *  uses (auth + magic-byte + size + type checks server side). */
export async function uploadDataUrl(dataUrl: string, deps: SaveDeps = REAL_DEPS): Promise<string> {
  const file = await deps.dataUrlToFile(dataUrl, 'question.jpg');
  const fd = new FormData();
  fd.append('file', file);
  const res = await deps.fetch('/api/quiz/upload-image', { method: 'POST', body: fd });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Image upload failed');
  return data.url;
}

/** At publish, replace per-question data-URL images (image + intruder types) with
 *  uploaded https URLs. Other types pass through untouched. */
export async function uploadDeferredImages(questions: QuestionData[], quizType: string, deps: SaveDeps = REAL_DEPS): Promise<QuestionData[]> {
  if (quizType !== 'image' && quizType !== 'intruder') return questions;
  return Promise.all(questions.map(async (q) => {
    if (quizType === 'image' && typeof q.image_url === 'string' && q.image_url.startsWith('data:')) {
      return { ...q, image_url: await uploadDataUrl(q.image_url, deps) };
    }
    if (quizType === 'intruder') {
      const opts = await Promise.all((q.options as IntruderOption[]).map(async (o) =>
        (typeof o.image_url === 'string' && o.image_url.startsWith('data:'))
          ? { ...o, image_url: await uploadDataUrl(o.image_url, deps) }
          : o));
      return { ...q, options: opts };
    }
    return q;
  }));
}

/** POST /api/quiz/create body, keys in the legacy order. */
export function publishPayload(d: FunnelState, g: FunnelGroup | undefined, coverUrl: string | undefined, withImages: QuestionData[]): Record<string, unknown> {
  return {
    ...(g ? { group_id: g.id } : { group_name: (d.newGroup ?? '').trim() }),
    title: d.title.trim(),
    quiz_type: d.quiz_type,
    difficulty: d.difficulty,
    language: d.language,
    cover_image_url: coverUrl,
    questions: withImages.map((q) => toApiQuestion(q, d.quiz_type)),
    settings: { timer: true, timer_seconds: 15, shuffle: false, show_answers: true, creator_note: d.creatorNote?.trim() || undefined },
  };
}

export interface PublishedQuiz { id: string; slug: string; creator_stats?: CreatorStats | null }

export type PublishOutcome =
  /** Refused before any request (the legacy early returns). `toStep` = the legacy setStep(1). */
  | { kind: 'blocked'; error: string; toStep?: 1 }
  | { kind: 'failed'; error: string }
  | { kind: 'published'; quiz: PublishedQuiz };

/**
 * The legacy publish(): gate, cover upload (a data URL is uploaded now that the fan
 * is signed in; an https cover is kept), deferred question images, then
 * POST /api/quiz/create. Only complete questions are sent. On success the draft is
 * cleared. `onStart` runs where the legacy sets publishing = true.
 */
export async function publishQuiz(d: FunnelState, groups: FunnelGroup[], onStart: () => void = () => {}, deps: SaveDeps = REAL_DEPS): Promise<PublishOutcome> {
  const g = groups.find((x) => x.slug === d.group_slug);
  const complete = d.questions.filter((q) => isQuestionValid(q, d.quiz_type));
  const hasG = !!g || !!(d.newGroup && d.newGroup.trim().length >= 2);
  if (!hasG || d.title.trim().length < MIN_TITLE || complete.length < MIN_QUESTIONS) {
    return { kind: 'blocked', error: GATE_ERROR };
  }
  // H9: a cover can only be published once the user confirms they may use it.
  if (d.cover && !d.coverRights) {
    return { kind: 'blocked', error: RIGHTS_ERROR, toStep: 1 };
  }
  onStart();
  try {
    // 1. upload the cover (held as a data URL) now that we are authed
    let coverUrl: string | undefined;
    if (d.cover) {
      if (d.cover.startsWith('data:')) {
        const file = await deps.dataUrlToFile(d.cover);
        const fd = new FormData();
        fd.append('file', file);
        const up = await deps.fetch('/api/quiz/upload-image', { method: 'POST', body: fd });
        const upData = (await up.json()) as { url?: string; error?: string };
        if (up.ok && upData.url) coverUrl = upData.url;
      } else {
        coverUrl = d.cover;
      }
    }
    // 2. per-question images held as data URLs, same endpoint
    const withImages = await uploadDeferredImages(complete, d.quiz_type, deps);
    // 3. create the quiz (existing group -> group_id; brand-new group -> group_name)
    const payload = publishPayload(d, g, coverUrl, withImages);
    const res = await deps.fetch('/api/quiz/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string; details?: string[] };
      return { kind: 'failed', error: err.details?.join(' ') ?? err.error ?? PUBLISH_FAILED };
    }
    const out = (await res.json()) as PublishedQuiz;
    deps.clearDraft();
    return { kind: 'published', quiz: out };
  } catch {
    return { kind: 'failed', error: PUBLISH_OFFLINE };
  }
}

// ---- auth-adjacent reads and the username claim (byte-identical calls) ----

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/** GET /api/auth/check-username (debounced 400 ms by the caller). */
export async function checkUsername(u: string, f: typeof fetch = fetch): Promise<UsernameStatus> {
  try {
    const res = await f(`/api/auth/check-username?username=${encodeURIComponent(u)}`);
    const j = (await res.json()) as { available?: boolean };
    return j.available ? 'available' : 'taken';
  } catch {
    return 'idle';
  }
}

/** POST /api/auth/create-profile { username } (the inline claim). Returns an error message or null. */
export async function claimUsername(u: string, f: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await f('/api/auth/create-profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) return j.error ?? 'Could not claim that username.';
    return null;
  } catch {
    return 'Could not claim username. Try again.';
  }
}

/** GET /api/quiz/title-check (soft, non-blocking dedup nudge; debounced 500 ms by the caller). */
export async function titleExists(title: string, f: typeof fetch = fetch): Promise<boolean> {
  try {
    const r = await f(`/api/quiz/title-check?title=${encodeURIComponent(title)}`);
    const j = (await r.json()) as { exists?: boolean };
    return !!j?.exists;
  } catch {
    return false;
  }
}
