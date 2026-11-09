// Audit 04 section 3 (P2-2, owner 2026-11-09): the fandom level test of a Team account ("STAY level test: are you a real STAY?"), built
// from verified facts into a quiz draft the existing import reads. Pure and unit tested (fandom-test.test.ts); the CLI is
// scripts/build-fandom-test.mts. It drafts; the owner approves; nothing is published here.
//
// Template (10 questions, multiple choice, no image, medium): 3 roster / fandom name / debut song, 4 titles / albums / years,
// 2 charts / awards, 1 latest release. Every question cites a source of the draft; a fact taken from a sourced trivia file must be
// verified there, and a load-bearing one needs two sources. Results are levels named after the fandom ("Rookie STAY").
// Banned, always: ages, birth order, heights, "oldest/youngest", private life, lyrics, "best member", fandom rankings. When a member
// is under 18 (`minors`), per-member attributes are refused too. The note says "by the KpopQuiz Team", never "we STAYs".

import { checkQuizPayload } from './payload';

import type { PayloadResult, QuizDraftPayload } from './payload';
import type { ResultLevel } from '@/lib/quiz/result-levels';

export type Slot = 'roster' | 'fandom' | 'debut' | 'title' | 'album' | 'year' | 'chart' | 'award' | 'latest';
const SLOT_CLASS: Record<Slot, 'A' | 'B' | 'C' | 'D'> = { roster: 'A', fandom: 'A', debut: 'A', title: 'B', album: 'B', year: 'B', chart: 'C', award: 'C', latest: 'D' };
/** How many questions each class holds. */
export const SLOT_COUNTS: Record<'A' | 'B' | 'C' | 'D', number> = { A: 3, B: 4, C: 2, D: 1 };

export interface FandomFact {
  slot: Slot;
  question: string;
  answer: string;
  /** Three wrong answers that are real (other titles, other years, other members): a human reads them at review. */
  distractors: string[];
  source_url: string;
  fun_fact?: string;
  /** The id of the verified item in lib/trivia/sourced/{group}.json this question comes from, when it does. */
  factId?: string;
}
export interface FandomInput {
  group_slug: string;
  group_name: string;
  /** The real fandom name (not a placeholder). */
  fandom: string;
  account: string;
  /** True when a member is under 18: per-member attributes are refused. */
  minors: boolean;
  sources: Array<{ id: string; title: string; url: string }>;
  facts: FandomFact[];
}
export interface SourcedItem { id: string; status: string; answer: string; loadBearing: boolean; sources: Array<{ url: string; type: string }> }

const BANNED = /\b(ages?|aged|years? old|old(?:est|er)?|young(?:est|er)?|maknae|birthdays?|birth\s?dates?|birth\s?order|born|height|heights|tall(?:est|er)?|short(?:est)?|weigh(?:t|s)?|dating|girlfriends?|boyfriends?|relationships?|married|lyrics?|best member|favou?rite member|bias(?:es)?|ranking|ranked)\b/i;
const PER_MEMBER = /\bwhich member\b.*\b(position|vocal\w*|danc\w+|rapp\w+|visual|cent(?:er|re)|leader|from|hometown|birthplace|zodiac|blood type|nationality)\b/i;
const PLACEHOLDER_FANDOM = new Set(['', 'fan', 'fans', 'fandom', 'tbd', 'n/a', 'none', 'unknown']);

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** The levels, named after the fandom; 0, 40, 60, 80 and 100 percent. Second person: the Team never poses as a fan. */
export function fandomLevels(fandom: string): ResultLevel[] {
  return [
    { min: 0, name: `Trainee ${fandom}`, blurb: 'You know the basics. Play the easy quizzes on the group hub and come back for a rematch.' },
    { min: 40, name: `Rookie ${fandom}`, blurb: 'A solid start. The albums and the chart history are where your next points are.' },
    { min: 60, name: `Dedicated ${fandom}`, blurb: 'You know the discography well. A few records and release dates stand between you and the top.' },
    { min: 80, name: `Veteran ${fandom}`, blurb: 'Only the hardest chart and release facts got past you. Very few fans score this high.' },
    { min: 100, name: `Legendary ${fandom}`, blurb: 'A perfect score. Every question, from the basics to the records, was yours.' },
  ];
}

/** Why a fact is refused ([] = fine). */
export function factProblems(f: FandomFact, minors: boolean): string[] {
  const out: string[] = [];
  const text = [f.question, f.answer, ...f.distractors, f.fun_fact ?? ''].join(' ');
  if (BANNED.test(text)) out.push(`"${f.question}" asks about something the Team never asks (age, birth order, height, private life, lyrics, a best member or a ranking)`);
  if (minors && PER_MEMBER.test(f.question)) out.push(`"${f.question}" is a per-member question, and a member is under 18`);
  if (f.distractors.length !== 3) out.push(`"${f.question}" needs exactly three wrong answers`);
  if (new Set([f.answer, ...f.distractors].map((x) => x.trim().toLowerCase())).size !== 4) out.push(`"${f.question}" has two equal options`);
  return out;
}

export type BuildResult =
  | { ok: true; payload: QuizDraftPayload; levels: ResultLevel[]; review: string[] }
  | { ok: false; errors: string[] };

/** The draft of a fandom level test, or every reason it cannot be built. */
export function buildFandomTest(input: FandomInput, sourced: ReadonlyMap<string, SourcedItem> = new Map()): BuildResult {
  const errors: string[] = [];
  const fandom = input.fandom.trim();
  if (PLACEHOLDER_FANDOM.has(fandom.toLowerCase()) || fandom.toLowerCase() === input.group_name.trim().toLowerCase()) errors.push('the fandom name is empty, a placeholder or the group name');
  const counts: Record<'A' | 'B' | 'C' | 'D', number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const f of input.facts) counts[SLOT_CLASS[f.slot]]++;
  if (input.facts.length !== 10) errors.push(`a fandom test needs 10 verified facts, this has ${input.facts.length}`);
  for (const k of ['A', 'B', 'C', 'D'] as const) if (counts[k] !== SLOT_COUNTS[k]) errors.push(`slot class ${k} needs ${SLOT_COUNTS[k]} questions, this has ${counts[k]}`);
  for (const f of input.facts) {
    errors.push(...factProblems(f, input.minors));
    if (f.factId) {
      const item = sourced.get(f.factId);
      if (!item) errors.push(`fact ${f.factId} is not in the sourced file`);
      else {
        if (item.status !== 'verified') errors.push(`fact ${f.factId} is ${item.status}, not verified`);
        if (item.answer.trim().toLowerCase() !== f.answer.trim().toLowerCase()) errors.push(`fact ${f.factId}: the answer differs from the verified one ("${item.answer}")`);
        if (item.loadBearing && !(item.sources.length >= 2 && item.sources.some((s) => s.type === 'official' || s.type === 'wikidata'))) errors.push(`fact ${f.factId} is load-bearing and needs two sources, one official or Wikidata`);
      }
    }
  }
  if (errors.length) return { ok: false, errors };

  const groupName = input.group_name.trim();
  const slug = `${fandom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-level-test`;
  const levels = fandomLevels(fandom);
  const raw = {
    site: 'kpop', account: input.account, group_slug: input.group_slug, title: `${fandom} level test: are you a real ${fandom}?`, slug,
    description: `Ten sourced questions on ${groupName}, from the basics to chart records. Your result is a ${fandom} level, not just a score.`,
    result_levels: levels,
    quiz_type: 'multiple_choice', difficulty: 'medium', language: 'en', title_gives_nothing_away: true,
    sources: input.sources,
    questions: input.facts.map((f) => {
      // The right answer sits at a stable place drawn from the question text, so a re-run builds the same draft.
      let h = 2166136261;
      for (const c of f.question) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
      const correct = h % 4;
      const options = [...f.distractors];
      options.splice(correct, 0, f.answer);
      return { question: f.question, options, correct, ...(f.fun_fact ? { fun_fact: f.fun_fact } : {}), source_url: f.source_url };
    }),
    notes: `By the KpopQuiz Team. Drafted from ${input.facts.length} sourced facts; the owner reads every wrong answer before approval.`,
  };
  const checked: PayloadResult = checkQuizPayload(raw);
  if (!checked.ok) return { ok: false, errors: [`${checked.error}: ${checked.detail}`] };
  return {
    ok: true, payload: checked.value, levels,
    review: [`Read the 30 wrong answers: each must be a real title, year or name, never invented.`, `The title is "${cap(checked.value.title)}"; the slug is ${slug}.`],
  };
}
