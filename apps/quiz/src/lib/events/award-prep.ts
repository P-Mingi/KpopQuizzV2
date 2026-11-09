// Audit 04 section 4 (P1-6, owner 2026-11-09): the award-prep engine. Pure planning and drafting; the only write is a quiz DRAFT filed
// through the existing import (importQuizDrafts, created_by null) as a review batch the owner reads in full. Nothing here publishes.
//
//   T-10 to T-3  a 10 question draft from verified facts only: up to 5 past winners, up to 3 published nominees (only when the show
//                lists a nominees_url), at least 2 show facts, the rest filled from the same pools. Evergreen slug under general-kpop,
//                one Team account, publish_by = the first show day (past it the draft expires, lib/editorial/quiz/rules.ts).
//   T+1 to T+14  a watch for winners_url (a hash alert, then a revision draft once 3 winners are verified: P2-1, owner approval).
//                This version only reports the window; it fetches nothing and writes nothing.
//
// Idempotent by the key `award:{id}:{phase}`: the draft of a show is its slug, and a slug that a quiz or a draft already holds is
// skipped. Fails closed: a show that is not confirmed on an official source, a pool with too few facts, a fact outside the show's allowed
// categories, or a draft that fails checkQuizPayload produces no draft at all. A dry run reads and plans; it writes nothing.

import { checkQuizPayload } from '@/lib/editorial/quiz/payload';
import { importQuizDrafts } from '@/lib/editorial/quiz/pipeline';

import { prepWindow } from './calendar';
import { AWARD_ACCOUNT, AWARD_GROUP_SLUG } from './config';

import type { QuizDraftPayload } from '@/lib/editorial/quiz/payload';
import type { QuizStore } from '@/lib/editorial/quiz/pipeline';
import type { AwardCategory, AwardShow } from './calendar';

export type FactKind = 'winner' | 'nominee' | 'show';
export interface AwardFact {
  id: string;
  kind: FactKind;
  category: AwardCategory;
  question: string;
  answer: string;
  /** Exactly three real wrong answers (never invented): winners of other years, other nominees, real services. */
  distractors: string[];
  fun_fact?: string | null;
  /** One of the sources of the results file. */
  source_url: string;
  read_on: string;
}
export interface AwardResults { show: string; note?: string; sources: Array<{ id: string; title: string; url: string }>; facts: AwardFact[] }

const DAY = 86_400_000;
export const QUESTIONS = 10;
export const MAX_WINNERS = 5;
export const MAX_NOMINEES = 3;
export const MIN_SHOW_FACTS = 2;
/** The draft is prepared from T-10 to T-3 (days before the first show day). */
export const LAST_PREP_DAYS = 3;
export const WATCH_DAYS = 14;

export type Phase = 'prep' | 'watch';
export interface PrepAction { key: string; show: string; phase: Phase; slug: string }
export interface PrepSkip { show: string; reason: 'not_confirmed' | 'outside_window' | 'before_window' | 'past_window' | 'exists' | 'no_facts' | 'bad_draft' }
export interface PrepPlan { actions: PrepAction[]; skipped: PrepSkip[] }

/** Which shows need what at `now`. `holds(slug)` is true when a quiz or a quiz draft already has the slug. */
export function planAwardPrep(shows: readonly AwardShow[], now: number, holds: (slug: string) => boolean = () => false): PrepPlan {
  const actions: PrepAction[] = [];
  const skipped: PrepSkip[] = [];
  for (const s of shows) {
    const w = prepWindow(s);
    const first = w.to + 1;
    const lastDay = Date.parse(`${s.days[s.days.length - 1]}T00:00:00Z`) + DAY - 1;
    if (now >= first && now <= lastDay + WATCH_DAYS * DAY) {
      // T+0 to T+14: the watch window (winners). Not a draft.
      if (s.gives_awards && s.winners_url) actions.push({ key: `award:${s.id}:watch`, show: s.id, phase: 'watch', slug: s.quiz_slug });
      else skipped.push({ show: s.id, reason: 'past_window' });
      continue;
    }
    if (now < w.from) { skipped.push({ show: s.id, reason: 'before_window' }); continue; }
    if (now > lastDay + WATCH_DAYS * DAY) { skipped.push({ show: s.id, reason: 'past_window' }); continue; }
    // T-3 is a whole day: the draft is still prepared on the evening of T-3, not on T-2.
    if (now >= first - (LAST_PREP_DAYS - 1) * DAY) { skipped.push({ show: s.id, reason: 'outside_window' }); continue; }
    if (s.status !== 'confirmed') { skipped.push({ show: s.id, reason: 'not_confirmed' }); continue; }
    if (holds(s.quiz_slug)) { skipped.push({ show: s.id, reason: 'exists' }); continue; }
    actions.push({ key: `award:${s.id}:prep`, show: s.id, phase: 'prep', slug: s.quiz_slug });
  }
  return { actions, skipped };
}

/** A stable shuffle of four options from the fact id, so a re-run builds the same draft. */
function placeAnswer(fact: AwardFact): { options: string[]; correct: number } {
  let h = 2166136261;
  for (const c of fact.id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const correct = h % 4;
  const options = [...fact.distractors];
  options.splice(correct, 0, fact.answer);
  return { options, correct };
}

/** The 10 facts of a show's draft: winners, nominees (published only), show facts; fewer than 10 usable facts means none. */
export function pickFacts(show: AwardShow, facts: readonly AwardFact[]): AwardFact[] | null {
  const ok = facts.filter((f) => show.allowed_categories.includes(f.category)
    && (show.gives_awards || f.kind === 'show')
    && (f.kind !== 'nominee' || show.nominees_url !== null)
    && f.distractors.length === 3 && new Set([f.answer, ...f.distractors].map((x) => x.toLowerCase())).size === 4);
  const winners = ok.filter((f) => f.kind === 'winner');
  const nominees = ok.filter((f) => f.kind === 'nominee');
  const shows = ok.filter((f) => f.kind === 'show');
  if (shows.length < MIN_SHOW_FACTS) return null;
  const picked: AwardFact[] = [...winners.slice(0, MAX_WINNERS), ...nominees.slice(0, MAX_NOMINEES)];
  // Fill to 10 with the show facts, then the rest of the winners and nominees.
  for (const f of [...shows, ...winners.slice(MAX_WINNERS), ...nominees.slice(MAX_NOMINEES)]) {
    if (picked.length >= QUESTIONS) break;
    picked.push(f);
  }
  if (picked.length < QUESTIONS) return null;
  // Order: winners, nominees, then show facts (the file order inside a kind).
  const rank = { winner: 0, nominee: 1, show: 2 } as const;
  return picked.slice(0, QUESTIONS).sort((a, b) => rank[a.kind] - rank[b.kind]);
}

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The evergreen name of a show: no year, no edition number, no parenthesis ("Melon Music Awards 2026 (MMA2026, the 18th)" is "Melon Music Awards"). */
export function plainName(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').replace(/\b20\d{2}\b/g, '').replace(/^\d+(?:st|nd|rd|th)\s+/i, '').replace(/\s+/g, ' ').trim();
}

/** "November 14 and 15", or "December 31 and January 1" across a month. */
export function daysLabel(days: readonly string[]): string {
  const parts = days.map((d) => ({ m: Number(d.slice(5, 7)), d: Number(d.slice(8, 10)) }));
  return parts.map((p, i) => (i === 0 || p.m !== parts[i - 1]!.m ? `${MONTHS[p.m]} ${p.d}` : String(p.d))).reduce((acc, x, i, all) => (i === 0 ? x : i === all.length - 1 ? `${acc} and ${x}` : `${acc}, ${x}`), '');
}

const titleOf = (show: AwardShow): string => `${plainName(show.name)} quiz: past winners and show facts`;

/** The import payload of a show's draft, or null when the facts are not enough or the payload fails the quiz check. */
export function buildAwardDraft(show: AwardShow, results: AwardResults, opts: { title?: string; account?: string } = {}): QuizDraftPayload | null {
  const facts = pickFacts(show, results.facts);
  if (!facts) return null;
  const urls = new Set(results.sources.map((s) => s.url));
  if (facts.some((f) => !urls.has(f.source_url))) return null;
  const payload = {
    site: 'kpop', account: opts.account ?? AWARD_ACCOUNT, group_slug: AWARD_GROUP_SLUG, title: opts.title ?? titleOf(show), slug: show.quiz_slug,
    description: `Ten sourced questions on the ${plainName(show.name)}: who won in past years, and facts about the show on ${daysLabel(show.days)}.`,
    publish_by: show.days[0],
    quiz_type: 'multiple_choice', difficulty: 'medium', language: 'en', title_gives_nothing_away: true,
    sources: results.sources.map((s) => ({ id: s.id, title: s.title, url: s.url })),
    questions: facts.map((f) => {
      const { options, correct } = placeAnswer(f);
      return { question: f.question, options, correct, ...(f.fun_fact ? { fun_fact: f.fun_fact } : {}), source_url: f.source_url };
    }),
    notes: `Prepared by award-prep for ${show.id}; facts read on ${[...new Set(facts.map((f) => f.read_on))].join(', ')}.`,
  };
  const r = checkQuizPayload(payload);
  return r.ok ? r.value : null;
}

// ----------------------------------------------------------------------------------------------------------------------
// The run

export interface AwardPrepDeps {
  now: number;
  /** A dry run reads and plans; it never calls the import. */
  dry: boolean;
  store: QuizStore;
  shows: readonly AwardShow[];
  results: (showId: string) => AwardResults | null;
  /** The Team account the drafts are filed under (default: the placeholder of config.ts). */
  account?: string;
}
export interface AwardPrepReport {
  dry: boolean;
  actions: PrepAction[];
  skipped: PrepSkip[];
  drafts: Array<{ key: string; slug: string; questions: number }>;
  imported: number;
  rejected: Array<{ slug: string | null; error: string }>;
}

export async function runAwardPrep(d: AwardPrepDeps): Promise<AwardPrepReport> {
  const slugs = d.shows.map((s) => s.quiz_slug);
  const [owners, drafted] = await Promise.all([d.store.slugOwners(slugs), d.store.quizDraftSlugs(slugs)]);
  const plan = planAwardPrep(d.shows, d.now, (slug) => owners.has(slug) || drafted.has(slug));
  const skipped = [...plan.skipped];
  const payloads: QuizDraftPayload[] = [];
  const drafts: AwardPrepReport['drafts'] = [];
  for (const a of plan.actions) {
    if (a.phase !== 'prep') continue; // the watch window is reported by the plan only
    const show = d.shows.find((s) => s.id === a.show)!;
    const results = d.results(show.id);
    if (!results) { skipped.push({ show: show.id, reason: 'no_facts' }); continue; }
    const payload = buildAwardDraft(show, results, d.account ? { account: d.account } : {});
    if (!payload) { skipped.push({ show: show.id, reason: 'bad_draft' }); continue; }
    payloads.push(payload);
    drafts.push({ key: a.key, slug: payload.slug, questions: payload.questions.length });
  }
  let imported = 0;
  let rejected: AwardPrepReport['rejected'] = [];
  if (!d.dry && payloads.length) {
    const r = await importQuizDrafts(d.store, payloads, { adminId: null, label: `Award drafts of ${new Date(d.now).toISOString().slice(0, 10)}`, now: d.now, fullReview: true });
    if (r.ok) { imported = r.value.created.length; rejected = r.value.rejected.map((x) => ({ slug: x.slug, error: x.error })); }
    else rejected = [{ slug: null, error: r.error }];
  }
  return { dry: d.dry, actions: plan.actions, skipped, drafts, imported, rejected };
}
