// P5 (UX v11 create): presentation helpers for the flag-on funnel. Everything here
// is DERIVED from the funnel state with the shared validation (lib/quiz-validation),
// never a second set of rules: the checklist, the step status lines, the row status
// words and the "Paste several at once" parser (WIRING-MAP 6: NEW, client only).

import { questionIssues, isQuestionValid } from '@/lib/quiz-validation';
import { blankQuestionFor } from '@/lib/quiz-question';

import { SITE, SITE_ID } from '@/lib/site/registry';

import { MIN_QUESTIONS, MIN_TITLE, hasGroupChosen } from './funnel';

import type { QuestionData } from '@/lib/quiz-question';
import type { UxIconName } from '@/lib/ux-v1/a0/icons';
import type { FunnelGroup, FunnelState } from './funnel';

// ---- step 1 copy (prototype #create, cp-1) ----

export interface TypeRow { value: string; label: string; desc: string; example: string; icon: UxIconName }

/** The five quiz types, in the prototype's words (values = the legacy quiz_type ids). */
export const TYPE_ROWS: TypeRow[] = [
  { value: 'multiple_choice', label: 'Classic', desc: 'A question with 4 answers, one is correct', example: 'Who is the leader of BTS?', icon: 't-classic' },
  { value: 'true_false', label: 'True or false', desc: 'Fans mark a statement true or false', example: 'Felix was born in Australia.', icon: 't-tf' },
  { value: 'guess_from_clues', label: 'Guess from clues', desc: '3 clues, more points for fewer clues', example: 'Clue 1: born in 1997', icon: 't-clue' },
  { value: 'image', label: 'Image quiz', desc: 'A picture question with 4 answers', example: 'Which MV is this frame from?', icon: 't-image' },
  { value: 'intruder', label: 'Find the intruder', desc: '4 pictures, one does not belong', example: 'Three ONCE, one who is not', icon: 't-intruder' },
];

/** The groups a fan can pick: the DB also holds a hidden quarantine row (91 rows,
 *  90 visible groups, DESIGN-SPEC 16.10; same rule as lib/ux-v1/p1/format.ts). */
export function visibleGroups<T extends { slug: string }>(groups: T[]): T[] {
  return groups.filter((g) => !/^zzz-|quarantine/i.test(g.slug));
}

export function typeLabel(quizType: string): string {
  return TYPE_ROWS.find((t) => t.value === quizType)?.label ?? 'Classic';
}

/** One line under the difficulty control (prototype: "Medium: fans who follow the group will pass."). */
export const DIFFICULTY_HELP: Record<string, string> = {
  easy: 'Easy: any K-pop fan can pass.',
  medium: 'Medium: fans who follow the group will pass.',
  hard: 'Hard: only the most dedicated fans will pass.',
};

/** The words of step 1 for this build's site. kpop returns today's literals (group, artist, K-pop); a world site names its own
 *  topic (series) and has no fandom war, and a site without image quizzes does not offer the image type. */
const WORLD_EXAMPLES: Record<string, string> = {
  multiple_choice: 'Who is the captain of the Straw Hat Pirates?',
  true_false: 'Naruto Uzumaki is the sixth Hokage.',
  guess_from_clues: 'Clue 1: first appears in episode 1',
  intruder: 'Three Straw Hats, one who is not',
};
export function typeRowsFor(): TypeRow[] {
  if (SITE_ID === 'kpop') return TYPE_ROWS;
  return TYPE_ROWS.filter((t) => t.value !== 'image' || SITE.features.imageQuiz).map((t) => ({ ...t, example: WORLD_EXAMPLES[t.value] ?? t.example }));
}
export function difficultyHelpFor(key: string): string | undefined {
  if (SITE_ID === 'kpop') return DIFFICULTY_HELP[key];
  const topic = SITE.vocabulary.topic;
  return ({ easy: 'Easy: any fan can pass.', medium: `Medium: fans who follow the ${topic} will pass.`, hard: 'Hard: only the most dedicated fans will pass.' } as Record<string, string>)[key];
}
export interface TopicCopy {
  label: string; manySp: string; pickToContinue: string; loadFailed: string; newLabel: string; createButton: string; newChip: string; searchAnother: string;
  search: (n: number) => string; all: (n: number) => string; listLabel: string; noMatch: string; newPlaceholder: string;
  titlePlaceholder: string | null; aboutPlaceholder: string | null;
}
export function topicCopy(): TopicCopy {
  if (SITE_ID === 'kpop') {
    return {
      label: 'Group', manySp: ' groups', pickToContinue: 'Pick a group to continue.', loadFailed: 'The group list did not load. Reload the page to pick a group.',
      newLabel: 'New group or artist', createButton: 'Create group', newChip: 'new group', searchAnother: 'Search another group',
      search: (n) => `Search ${n} groups`, all: (n) => `All ${n} groups`, listLabel: 'Groups', noMatch: 'No group matches. Use New group or artist above.',
      newPlaceholder: 'e.g. Cortis', titlePlaceholder: null, aboutPlaceholder: null,
    };
  }
  const one = SITE.vocabulary.topic;
  const many = SITE.vocabulary.topicPlural;
  const Cap = one.charAt(0).toUpperCase() + one.slice(1);
  return {
    label: Cap, manySp: ` ${many}`, pickToContinue: `Pick a ${one} to continue.`, loadFailed: `The ${one} list did not load. Reload the page to pick a ${one}.`,
    newLabel: `New ${one}`, createButton: `Create ${one}`, newChip: `new ${one}`, searchAnother: `Search another ${one}`,
    search: (n) => `Search ${n} ${many}`, all: (n) => `All ${n} ${many}`, listLabel: Cap, noMatch: `No ${one} matches. Use New ${one} above.`,
    newPlaceholder: 'e.g. Frieren', titlePlaceholder: 'e.g. Only real fans can pass this', aboutPlaceholder: 'e.g. My hardest quiz yet, focused on the arcs most fans skip.',
  };
}

/** Help line under the group field. */
export function groupHelp(s: FunnelState, groups: FunnelGroup[]): string {
  const g = groups.find((x) => x.slug === s.group_slug);
  if (g) {
    const fandom = g.fandom_name && g.fandom_name !== 'fan' ? g.fandom_name : `${g.name} fans`;
    return SITE.features.fandomWar ? `Your quiz appears on the ${g.name} page and counts for ${fandom} in the fandom war.` : `Your quiz appears on the ${g.name} page.`;
  }
  if (s.newGroup) return `${s.newGroup} is a new ${SITE_ID === 'kpop' ? 'group' : SITE.vocabulary.topic}: it is added with your quiz and checked by our team.`;
  return SITE_ID === 'kpop' ? 'Pick the group or artist your quiz is about.' : `Pick the ${SITE.vocabulary.topic} your quiz is about.`;
}

// ---- step 2: row status words ----

export interface RowStatus { ok: boolean; label: string }

/**
 * "Ready" or the first issue from questionIssues() (the rules the API enforces). The
 * prototype words "2 answers missing" are used for empty answers of the 4-answer types.
 */
export function rowStatus(q: QuestionData, quizType: string): RowStatus {
  const issues = questionIssues(q, quizType);
  if (issues.length === 0) return { ok: true, label: 'Ready' };
  const first = issues[0]!;
  if (first.code === 'empty-option' && Array.isArray(q.options) && (q.options as unknown[]).every((o) => typeof o === 'string')) {
    const missing = (q.options as string[]).filter((o) => !o.trim()).length || 4 - (q.options as string[]).length;
    if (missing > 0) return { ok: false, label: `${missing} answer${missing === 1 ? '' : 's'} missing` };
  }
  return { ok: false, label: first.label };
}

// ---- step bar status lines (prototype CSTT) ----

export interface BarStatus { strong: string; rest: string; ok: boolean }

export function detailsStatus(s: FunnelState, groups: FunnelGroup[], saved: boolean): BarStatus {
  const done = [s.title.trim().length >= MIN_TITLE, !!s.quiz_type, hasGroupChosen(s, groups)].filter(Boolean).length;
  return {
    strong: `${done} of 3`,
    rest: ` required done · ${saved ? 'draft saved on this device' : 'your draft saves on this device'}`,
    ok: done === 3,
  };
}

export function questionsStatus(questions: QuestionData[], quizType: string): BarStatus {
  const n = questions.filter((q) => isQuestionValid(q, quizType)).length;
  const k = questions.length - n;
  const rest = k > 0
    ? ` question${n === 1 ? '' : 's'} · ${k} ${k === 1 ? 'needs' : 'need'} work`
    : n >= MIN_QUESTIONS ? ` question${n === 1 ? '' : 's'} · ready to publish` : ` question${n === 1 ? '' : 's'} · ${MIN_QUESTIONS - n} more to publish`;
  return { strong: `${n} complete`, rest, ok: n >= MIN_QUESTIONS };
}

/** Numbers (1-based) of the questions that will not be published. */
export function incompleteNumbers(questions: QuestionData[], quizType: string): number[] {
  return questions.map((q, i) => (isQuestionValid(q, quizType) ? 0 : i + 1)).filter((n) => n > 0);
}

function listWords(nums: number[]): string {
  if (nums.length === 1) return `question ${nums[0]}`;
  const head = nums.slice(0, -1).join(', ');
  return `questions ${head} and ${nums[nums.length - 1]}`;
}

export function publishStatus(s: FunnelState, groups: FunnelGroup[], nComplete: number): BarStatus {
  const title = s.title.trim().length >= MIN_TITLE;
  const group = hasGroupChosen(s, groups);
  if (!title) return { strong: 'Not ready', rest: ` · add a title (${MIN_TITLE}+ characters)`, ok: false };
  if (!group) return { strong: 'Not ready', rest: ' · pick a group', ok: false };
  if (nComplete < MIN_QUESTIONS) {
    const more = MIN_QUESTIONS - nComplete;
    return { strong: 'Not ready', rest: ` · finish ${more} more question${more === 1 ? '' : 's'}`, ok: false };
  }
  if (s.cover && !s.coverRights) return { strong: 'Not ready', rest: ' · confirm the rights to your cover', ok: false };
  const left = incompleteNumbers(s.questions, s.quiz_type);
  if (left.length === 0) return { strong: 'Ready', rest: ` · ${nComplete} questions go live`, ok: true };
  return { strong: 'Ready', rest: ` · ${listWords(left)} ${left.length === 1 ? 'is' : 'are'} left out`, ok: true };
}

// ---- step 3 checklist (WIRING-MAP 6: the 6 booleans from the same validation) ----

export interface CheckRow { id: string; ok: boolean; warn: boolean; label: string; end: string; toStep?: 1 | 2 }

export function checklist(s: FunnelState, groups: FunnelGroup[]): CheckRow[] {
  const g = groups.find((x) => x.slug === s.group_slug);
  const groupName = g?.name ?? s.newGroup ?? null;
  const total = s.questions.length;
  const nComplete = s.questions.filter((q) => isQuestionValid(q, s.quiz_type)).length;
  const titleLen = s.title.trim().length;
  const facts = s.questions.filter((q) => (q.fun_fact ?? '').trim().length > 0).length;
  const coverBlocked = !!s.cover && !s.coverRights;
  return [
    { id: 'title', ok: titleLen >= MIN_TITLE, warn: false, label: 'Title', end: titleLen >= MIN_TITLE ? `${titleLen} characters` : `${MIN_TITLE} characters or more`, toStep: 1 },
    { id: 'type-group', ok: !!groupName, warn: false, label: 'Type and group', end: `${typeLabel(s.quiz_type)} · ${groupName ?? 'no group yet'}`, toStep: 1 },
    { id: 'questions', ok: nComplete >= MIN_QUESTIONS, warn: false, label: `${MIN_QUESTIONS} complete questions`, end: `${nComplete} of ${total}`, toStep: 2 },
    { id: 'cover', ok: !!s.cover && !coverBlocked, warn: !s.cover || coverBlocked, label: 'Cover image', end: coverBlocked ? 'Confirm your rights' : s.cover ? 'Added' : 'Recommended', toStep: 1 },
    { id: 'facts', ok: total > 0 && facts === total, warn: facts < total, label: 'Fun fact on every question', end: `${facts} of ${total} · optional`, toStep: 2 },
  ];
}

/** The line under the checklist ("Question 4 is not complete ..."), or null. */
export function leftOutNote(s: FunnelState): string | null {
  const left = incompleteNumbers(s.questions, s.quiz_type);
  if (left.length === 0) return null;
  const words = listWords(left);
  const cap = words.charAt(0).toUpperCase() + words.slice(1);
  return `${cap} ${left.length === 1 ? 'is' : 'are'} not complete, so ${left.length === 1 ? 'it' : 'they'} will not be published.`;
}

// ---- "Paste several at once" (NEW, client only; no backend) ----

/** Deterministic slot for the correct answer, so pasted questions do not all have
 *  the answer in position A (options are not shuffled at play time). */
function slotFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % 4;
}

export interface PasteResult { questions: QuestionData[]; skipped: number }

/**
 * Classic: blocks of 5 lines (the question, then the correct answer first, then 3
 * wrong answers). True or false: blocks of 2 lines (the statement, then "true" or
 * "false"). Blocks are separated by blank lines or simply follow each other. A block
 * that does not fit is skipped and counted. Other types have no paste format.
 */
export function parsePasted(text: string, quizType: string): PasteResult {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*]|\d+[.)]|[A-Da-d][.)])\s+/, '').trim());
  const blocks: string[][] = [];
  let cur: string[] = [];
  const size = quizType === 'true_false' ? 2 : 5;
  for (const l of lines) {
    if (!l) { if (cur.length) { blocks.push(cur); cur = []; } continue; }
    cur.push(l);
    if (cur.length === size) { blocks.push(cur); cur = []; }
  }
  if (cur.length) blocks.push(cur);

  const out: QuestionData[] = [];
  let skipped = 0;
  for (const b of blocks) {
    if (quizType === 'multiple_choice' && b.length === 5) {
      const [question, right, ...wrong] = b as [string, string, string, string, string];
      const slot = slotFor(question);
      const options = [...wrong];
      options.splice(slot, 0, right);
      out.push({ ...blankQuestionFor('multiple_choice'), question: question.slice(0, 500), options: options.map((o) => o.slice(0, 200)), correct: slot });
    } else if (quizType === 'true_false' && b.length === 2 && /^(true|false)$/i.test(b[1]!)) {
      out.push({ ...blankQuestionFor('true_false'), question: b[0]!.slice(0, 500), correct: b[1]!.toLowerCase() === 'true' });
    } else {
      skipped++;
    }
  }
  return { questions: out, skipped };
}

export const PASTE_TYPES = ['multiple_choice', 'true_false'];

export function pasteHelp(quizType: string): string {
  return quizType === 'true_false'
    ? 'One statement per line, then "true" or "false" on the next line. Leave a blank line between questions.'
    : 'Five lines per question: the question, the correct answer, then 3 wrong answers. Leave a blank line between questions.';
}
