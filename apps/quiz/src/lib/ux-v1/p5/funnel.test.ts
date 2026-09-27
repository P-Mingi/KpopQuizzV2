import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { blankQuestionFor } from '@/lib/quiz-question';
import { isQuestionValid } from '@/lib/quiz-validation';

import {
  DIFFICULTIES, GATE_ERROR, MIN_QUESTIONS, MIN_TITLE, RESUME_RETURN, RIGHTS_ERROR, TITLE_PLACEHOLDER, USERNAME_RE,
  draftToState, emptyState, publishPayload, publishQuiz, questionHasContent, stateToDraft, toApiQuestion,
  withQuestions, withQuizType,
} from './funnel';
import {
  checklist, detailsStatus, groupHelp, incompleteNumbers, leftOutNote, parsePasted, publishStatus, questionsStatus, rowStatus,
} from './view';

import type { Draft } from '@/lib/create-draft';
import type { QuestionData } from '@/lib/quiz-question';
import type { FunnelGroup, FunnelState, SaveDeps } from './funnel';

// ---------------------------------------------------------------------------
// "Re-skin, never rewrite their state, validation or save calls": the EXISTS funnel
// (components/create/create-funnel.tsx) keeps its rules inline. This test lifts them
// out of the source text, runs them next to lib/ux-v1/p5/funnel.ts and checks that
// both give the same state, the same gate messages and the SAME REQUESTS (url,
// method, headers, body) in the same order. If anyone edits either side, it fails.
// ---------------------------------------------------------------------------

const here = path.dirname(fileURLToPath(import.meta.url));
const FUNNEL = fs.readFileSync(path.resolve(here, '../../../components/create/create-funnel.tsx'), 'utf8');
const HOOK = fs.readFileSync(path.resolve(here, './use-create-funnel.ts'), 'utf8');
const EDITOR = fs.readFileSync(path.resolve(here, '../../../components/quiz/question-list-editor.tsx'), 'utf8');

function between(src: string, start: string, end: string): string {
  const a = src.indexOf(start);
  const b = src.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`create-funnel.tsx layout changed near "${start}": update the parity test`);
  return src.slice(a, b);
}

function transpile(src: string): string {
  return ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
}

interface LegacyPure {
  toApiQuestion: (q: QuestionData, t: string) => Record<string, unknown>;
  emptyState: () => FunnelState;
  questionHasContent: (q: QuestionData) => boolean;
}

function loadPure(): LegacyPure {
  const src = [
    between(FUNNEL, 'function toApiQuestion', '// Upload a single held-as-data-URL image'),
    between(FUNNEL, 'function emptyState', '/** A question the creator has actually started'),
    between(FUNNEL, 'function questionHasContent', 'export function CreateFunnel'),
    'return { toApiQuestion, emptyState, questionHasContent };',
  ].join('\n');
  return new Function('blankQuestionFor', transpile(src))(blankQuestionFor) as LegacyPure;
}
const legacy = loadPure();

/** The legacy publish() callback, wired to recording setters. */
function legacyPublish(state: FunnelState, groups: FunnelGroup[], deps: SaveDeps): { run: () => Promise<void>; out: Record<string, unknown> } {
  const body = between(FUNNEL, 'const publish = useCallback(async () => {', '  // --- mount: restore draft');
  const uploads = between(FUNNEL, 'async function uploadDataUrl', 'interface FunnelState');
  const toApi = between(FUNNEL, 'function toApiQuestion', '// Upload a single held-as-data-URL image');
  const src = `${toApi}\n${uploads}\nconst useCallback = (fn) => fn;\n${body}\nreturn publish;`;
  const out: Record<string, unknown> = { publishError: null, step: null, publishing: [], published: null };
  const fn = new Function(
    'dataRef', 'groups', 'isQuestionValid', 'MIN_TITLE', 'MIN_QUESTIONS', 'setPublishError', 'setStep', 'setPublishing',
    'setPublished', 'clearDraft', 'dataUrlToFile', 'fetch',
    transpile(src),
  );
  const run = fn(
    { current: state }, groups, isQuestionValid, MIN_TITLE, MIN_QUESTIONS,
    (e: string | null) => { out.publishError = e; },
    (s: number) => { out.step = s; },
    (p: boolean) => { (out.publishing as boolean[]).push(p); },
    (p: unknown) => { out.published = p; },
    deps.clearDraft,
    deps.dataUrlToFile,
    deps.fetch,
  ) as () => Promise<void>;
  return { run, out };
}

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

const GROUPS: FunnelGroup[] = [
  { id: 7, name: 'BTS', slug: 'bts', display_color: '#7B5EA7', text_color: '#fff', logo_url: null, fandom_name: 'ARMY' },
  { id: 9, name: 'TWICE', slug: 'twice', display_color: '#FF5FA2', text_color: '#fff', logo_url: null, fandom_name: 'ONCE' },
  { id: 11, name: 'Cortis', slug: 'cortis', display_color: '#111', text_color: '#fff', logo_url: null, fandom_name: 'fan' },
];

const mc = (question: string, options: string[], correct: number | null, fun_fact = ''): QuestionData => ({ question, options, correct, fun_fact });
const MC_OK = [
  mc(' What was BTS first Billboard number one? ', [' Love Yourself: Tear ', 'Wings', 'Answer', 'Persona'], 0, ' A fact '),
  mc('Which song at the Grammys?', ['Dynamite', 'Boy With Luv', 'Old Town Road', 'Butter'], 0),
  mc('Map of the Soul: 7 is named after what?', ['Seven years', 'Seven members', 'A book', 'A film'], 0, 'Fact 3'),
];
const MC_HALF = mc('Which song was BTS first fully Korean number one?', ['Life Goes On', 'Dynamite', '', ''], 0);

function state(over: Partial<FunnelState> = {}): FunnelState {
  return { ...emptyState(), title: 'Ultimate BTS era quiz', group_slug: 'bts', questions: [...MC_OK, MC_HALF], ...over };
}

interface Rec { url: string; method: string; headers: unknown; body: unknown }

/** Recording fetch with scripted responses per URL (in call order). */
function recorder(script: Record<string, ({ ok: boolean; json: unknown } | 'throw')[]>): { deps: SaveDeps; calls: Rec[]; cleared: () => number } {
  const calls: Rec[] = [];
  let cleared = 0;
  const idx: Record<string, number> = {};
  const f = (async (url: string, init?: RequestInit) => {
    let body: unknown = init?.body ?? null;
    if (body instanceof FormData) {
      const file = body.get('file') as File;
      body = { form: Array.from(body.keys()), name: file.name, type: file.type, size: file.size };
    } else if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    calls.push({ url, method: init?.method ?? 'GET', headers: init?.headers ?? null, body });
    const list = script[url] ?? [];
    const i = idx[url] ?? 0;
    idx[url] = i + 1;
    const r = list[Math.min(i, list.length - 1)];
    if (!r || r === 'throw') throw new Error('network');
    return { ok: r.ok, json: async () => r.json } as Response;
  }) as unknown as typeof fetch;
  const deps: SaveDeps = {
    fetch: f,
    dataUrlToFile: async (d: string, name = 'cover.jpg') => new File([d], name, { type: 'image/jpeg' }),
    clearDraft: () => { cleared++; },
  };
  return { deps, calls, cleared: () => cleared };
}

async function both(s: FunnelState, script: Record<string, ({ ok: boolean; json: unknown } | 'throw')[]>): Promise<{ legacy: { calls: Rec[]; out: Record<string, unknown>; cleared: number }; v11: { calls: Rec[]; out: Record<string, unknown>; cleared: number } }> {
  const a = recorder(script);
  const l = legacyPublish(structuredClone(s), GROUPS, a.deps);
  await l.run();
  const b = recorder(script);
  const out: Record<string, unknown> = { publishError: null, step: null, publishing: [], published: null };
  const r = await publishQuiz(structuredClone(s), GROUPS, () => { (out.publishing as boolean[]).push(true); out.publishError = null; }, b.deps);
  // Map the outcome onto the legacy setters, as use-create-funnel.ts does.
  if (r.kind === 'blocked') { if (r.toStep) out.step = r.toStep; out.publishError = r.error; }
  if (r.kind === 'failed') { out.publishError = r.error; (out.publishing as boolean[]).push(false); }
  if (r.kind === 'published') { out.published = r.quiz; out.step = 4; }
  if (r.kind !== 'blocked') (out.publishing as boolean[]).push(false);
  return { legacy: { calls: a.calls, out: l.out, cleared: a.cleared() }, v11: { calls: b.calls, out, cleared: b.cleared() } };
}

// The legacy calls setPublishing(false) twice on an API error (explicit + finally):
// compare the LAST value, which is what the view renders.
function settled(o: Record<string, unknown>): Record<string, unknown> {
  const p = o.publishing as boolean[];
  return { ...o, publishing: p.length ? p[p.length - 1] : null };
}

// ---------------------------------------------------------------------------

describe('constants and state = create-funnel.tsx', () => {
  it('constants', () => {
    expect(FUNNEL).toContain(`const TITLE_PLACEHOLDER = '${TITLE_PLACEHOLDER}';`);
    expect(FUNNEL).toContain(`const MIN_QUESTIONS = ${MIN_QUESTIONS};`);
    expect(FUNNEL).toContain(`const MIN_TITLE = ${MIN_TITLE};`);
    expect(FUNNEL).toContain(`const RESUME_RETURN = '${RESUME_RETURN}';`);
    for (const d of DIFFICULTIES) expect(FUNNEL).toContain(`{ value: '${d.value}', label: '${d.label}' }`);
    expect(FUNNEL).toContain('maxLength={100}');
  });
  it('empty state', () => {
    expect(emptyState()).toEqual(legacy.emptyState());
  });
  it('questionHasContent (type lock)', () => {
    const cases: QuestionData[] = [
      ...['multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'].map((t) => blankQuestionFor(t)),
      { ...blankQuestionFor('multiple_choice'), question: '  ' },
      { ...blankQuestionFor('multiple_choice'), question: 'Q' },
      { ...blankQuestionFor('multiple_choice'), correct: 0 },
      { ...blankQuestionFor('true_false'), correct: false },
      { ...blankQuestionFor('multiple_choice'), options: ['', ' ', 'x', ''] },
      { ...blankQuestionFor('intruder'), options: [{ label: '', image_url: null }, { label: ' ', image_url: null }, { label: '', image_url: 'data:x' }, { label: '', image_url: null }] },
      { ...blankQuestionFor('intruder'), options: [{ label: 'a', image_url: null }, { label: '', image_url: null }, { label: '', image_url: null }, { label: '', image_url: null }] },
      { ...blankQuestionFor('guess_from_clues'), clues: ['', 'c', ''] },
      { ...blankQuestionFor('image'), image_url: 'data:img' },
      { ...blankQuestionFor('multiple_choice'), fun_fact: ' ' },
      { ...blankQuestionFor('multiple_choice'), fun_fact: 'f' },
    ];
    for (const q of cases) expect(questionHasContent(q)).toBe(legacy.questionHasContent(q));
  });
  it('API question shape for every type', () => {
    const qs: [QuestionData, string][] = [
      [MC_OK[0]!, 'multiple_choice'],
      [{ question: ' TF ', options: [], correct: false, fun_fact: ' ' }, 'true_false'],
      [{ question: 'Who?', options: [' a', 'b ', 'c', 'd'], correct: 3, clues: [' c1', 'c2 ', 'c3'], fun_fact: '' }, 'guess_from_clues'],
      [{ question: 'Pic', options: ['a', 'b', 'c', 'd'], correct: 1, image_url: 'https://x.supabase.co/a.jpg', fun_fact: 'f' }, 'image'],
      [{ question: 'Odd', options: [{ label: ' A ', image_url: 'https://x/1' }, { label: 'B', image_url: 'https://x/2' }, { label: 'C', image_url: 'https://x/3' }, { label: 'D', image_url: 'https://x/4' }], correct: 2 }, 'intruder'],
    ];
    for (const [q, t] of qs) expect(toApiQuestion(q, t)).toEqual(legacy.toApiQuestion(q, t));
  });
  it('draft restore and autosave mappings', () => {
    const restore = between(FUNNEL, 'setData({ title: d.title,', ');\n');
    const legacyRestore = new Function('d', 'validInitialGroup', `${transpile(`var __x = (${restore.replace('setData(', '')});`)}\nreturn __x;`) as (d: Draft, g: string | null) => FunnelState;
    const oldDraft = { title: 'Old', group_slug: null, cover: null, questions: MC_OK, updatedAt: 1 } as unknown as Draft;
    const fullDraft: Draft = { title: 'T', group_slug: 'bts', newGroup: null, difficulty: 'hard', language: 'ko', quiz_type: 'true_false', cover: 'data:c', coverRights: true, creatorNote: 'n', questions: [blankQuestionFor('true_false')], updatedAt: 2 };
    for (const d of [oldDraft, fullDraft]) for (const g of [null, 'twice']) expect(draftToState(d, g)).toEqual(legacyRestore(d, g));

    const save = between(FUNNEL, "const d: Omit<Draft, 'updatedAt'> = ", ';\n');
    const legacySave = new Function('data', `${transpile(`var __x = (${save.replace("const d: Omit<Draft, 'updatedAt'> = ", '')});`)}\nreturn __x;`) as (s: FunnelState) => unknown;
    const s = state({ cover: 'data:x', coverRights: true, newGroup: null, creatorNote: 'note' });
    expect(stateToDraft(s)).toEqual(legacySave(s));
    expect(Object.keys(stateToDraft(s))).toEqual(Object.keys(legacySave(s) as object));
  });
  it('type change and list edits', () => {
    expect(FUNNEL).toContain('setData((s) => ({ ...s, quiz_type: t.value, questions: [blankQuestionFor(t.value)] }));');
    expect(withQuizType(state(), 'intruder').questions).toEqual([blankQuestionFor('intruder')]);
    expect(withQuizType(state(), 'multiple_choice').questions).toHaveLength(4);
    expect(FUNNEL).toContain('setData((s) => ({ ...s, questions: qs.length ? qs : [blankQuestionFor(s.quiz_type)] }));');
    expect(withQuestions(state({ quiz_type: 'image' }), []).questions).toEqual([blankQuestionFor('image')]);
  });
});

describe('publish = create-funnel.tsx publish() (same requests, same outcome)', () => {
  const OK_UPLOAD = { ok: true, json: { url: 'https://abc.supabase.co/storage/v1/object/public/quiz-images/u/1.jpg' } };
  const OK_CREATE = { ok: true, json: { id: 'q1', slug: 'ultimate-bts-era-quiz', creator_stats: { quizzes_created: 3, plays_received: 10 } } };
  const cases: [string, FunnelState, Record<string, ({ ok: boolean; json: unknown } | 'throw')[]>][] = [
    ['blocked: no group', state({ group_slug: null }), {}],
    ['blocked: short title', state({ title: 'Hey ' }), {}],
    ['blocked: 2 complete questions', state({ questions: [MC_OK[0]!, MC_OK[1]!, MC_HALF] }), {}],
    ['blocked: cover rights', state({ cover: 'data:image/jpeg;base64,AAAA', coverRights: false }), {}],
    ['blocked: 1-char custom group', state({ group_slug: null, newGroup: 'X' }), {}],
    ['classic, data-url cover, known group', state({ cover: 'data:image/jpeg;base64,AAAA', coverRights: true, creatorNote: '  My note  ' }), { '/api/quiz/upload-image': [OK_UPLOAD], '/api/quiz/create': [OK_CREATE] }],
    ['classic, https cover, custom group', state({ group_slug: null, newGroup: ' Cortis Jr ', cover: 'https://abc.supabase.co/x.jpg', coverRights: true, difficulty: 'hard', language: 'ko' }), { '/api/quiz/create': [OK_CREATE] }],
    ['classic, cover upload refused -> published without a cover', state({ cover: 'data:image/png;base64,BBBB', coverRights: true }), { '/api/quiz/upload-image': [{ ok: false, json: { url: 'https://abc.supabase.co/not-trusted.jpg', error: 'too big' } }], '/api/quiz/create': [OK_CREATE] }],
    ['image type, question pictures uploaded', state({ quiz_type: 'image', questions: [0, 1, 2].map((i) => ({ question: `Pic ${i}`, options: ['a', 'b', 'c', 'd'], correct: i, image_url: i === 1 ? 'https://abc.supabase.co/q.jpg' : `data:image/jpeg;base64,${i}`, fun_fact: '' })) }), { '/api/quiz/upload-image': [OK_UPLOAD], '/api/quiz/create': [OK_CREATE] }],
    ['intruder type, option pictures uploaded', state({ quiz_type: 'intruder', questions: [0, 1, 2].map((i) => ({ question: `Odd ${i}`, options: [0, 1, 2, 3].map((j) => ({ label: `L${j}`, image_url: j === 0 ? `data:image/jpeg;base64,${i}${j}` : `https://abc.supabase.co/${i}${j}.jpg` })), correct: i })) }), { '/api/quiz/upload-image': [OK_UPLOAD], '/api/quiz/create': [OK_CREATE] }],
    ['true/false', state({ quiz_type: 'true_false', questions: [true, false, true].map((c, i) => ({ question: `S${i}`, options: [], correct: c, fun_fact: i ? '' : 'f' })) }), { '/api/quiz/create': [OK_CREATE] }],
    ['clues', state({ quiz_type: 'guess_from_clues', questions: [0, 1, 2].map((i) => ({ question: `Who ${i}`, options: ['a', 'b', 'c', 'd'], correct: 0, clues: ['c1', 'c2', 'c3'], fun_fact: '' })) }), { '/api/quiz/create': [OK_CREATE] }],
    ['API 400 with details', state(), { '/api/quiz/create': [{ ok: false, json: { error: 'Validation error', details: ['Question 1: x', 'Question 2: y'] } }] }],
    ['API 500 with error', state(), { '/api/quiz/create': [{ ok: false, json: { error: 'Failed to create quiz' } }] }],
    ['API 500 without body fields', state(), { '/api/quiz/create': [{ ok: false, json: {} }] }],
    ['question picture upload fails', state({ quiz_type: 'image', questions: [0, 1, 2].map((i) => ({ question: `Pic ${i}`, options: ['a', 'b', 'c', 'd'], correct: 0, image_url: `data:image/jpeg;base64,${i}`, fun_fact: '' })) }), { '/api/quiz/upload-image': [{ ok: false, json: { error: 'Unsupported' } }] }],
    ['network down', state(), { '/api/quiz/create': ['throw'] }],
  ];
  it.each(cases)('%s', async (_name, s, script) => {
    const r = await both(s, script);
    expect(r.v11.calls).toEqual(r.legacy.calls);
    expect(settled(r.v11.out)).toEqual(settled(r.legacy.out));
    expect(r.v11.cleared).toBe(r.legacy.cleared);
  });
  it('payload keys in the legacy order', () => {
    const lit = between(FUNNEL, 'const payload = {', '};');
    const keys = [...lit.matchAll(/^\s{8}([a-z_]+):/gm)].map((m) => m[1]);
    const p = publishPayload(state(), GROUPS[0], 'https://c', MC_OK);
    expect(Object.keys(p)).toEqual(['group_id', ...keys]);
    expect(lit).toContain("...(g ? { group_id: g.id } : { group_name: (d.newGroup ?? '').trim() }),");
    expect(lit).toContain("settings: { timer: true, timer_seconds: 15, shuffle: false, show_answers: true, creator_note: d.creatorNote?.trim() || undefined },");
  });
  it('gate messages are the legacy ones', () => {
    expect(FUNNEL).toContain('setPublishError(`Add a title (${MIN_TITLE}+ chars), pick a group, and complete at least ${MIN_QUESTIONS} questions.`);');
    expect(GATE_ERROR).toBe('Add a title (5+ chars), pick a group, and complete at least 3 questions.');
    expect(FUNNEL).toContain(`setPublishError('${RIGHTS_ERROR}');`);
  });
});

describe('the other calls and effects (textual cross-check with the hook)', () => {
  it('username claim and check', () => {
    expect(FUNNEL).toContain('/^[a-z0-9_]{3,20}$/');
    expect(String(USERNAME_RE)).toBe('/^[a-z0-9_]{3,20}$/');
    expect(FUNNEL).toContain("fetch('/api/auth/create-profile', {\n        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u }),");
    expect(FUNNEL).toContain('fetch(`/api/auth/check-username?username=${encodeURIComponent(u)}`)');
    expect(FUNNEL).toContain('}, 400);');
    expect(HOOK).toContain('}, 400);');
  });
  it('title check, autosave, step memory, session read, resume', () => {
    expect(FUNNEL).toContain('fetch(`/api/quiz/title-check?title=${encodeURIComponent(t)}`)');
    for (const src of [FUNNEL, HOOK]) {
      expect(src).toContain("supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()");
      expect(src).toContain("params.get('resume') === 'publish'");
      expect(src).toContain("completeCount(d.questions, d.quiz_type ?? 'multiple_choice') >= MIN_QUESTIONS");
      expect(src).toContain('if (hydrated && step <= 3) saveStep(step);');
      expect(src).toContain('if (prof && !autoPubFired.current) { autoPubFired.current = true; void publish(); }');
      expect(src).toContain('const u = username.trim().toLowerCase();');
    }
    // debounces: title check 500, autosave 500 (v11: no autosave once published)
    expect(FUNNEL).toContain('}, [data, hydrated]);');
    expect(HOOK).toContain('if (!hydrated || published) return;');
    expect((FUNNEL.match(/}, 500\);/g) ?? []).length).toBe(2);
    expect((HOOK.match(/}, 500\);/g) ?? []).length).toBe(2);
    // the sign-in return path
    expect(FUNNEL).toContain('/auth/callback?returnTo=${encodeURIComponent(RESUME_RETURN)}');
  });
  it('cover rules', () => {
    expect(FUNNEL).toContain('const err = validateImageFile(file);');
    expect(HOOK).toContain('const err = validateImageFile(file);');
    expect(FUNNEL).toContain('setData((s) => ({ ...s, cover: url, coverRights: false }));');
    expect(HOOK).toContain('setData((s) => ({ ...s, cover: url, coverRights: false }));');
    expect(FUNNEL).toContain("setCoverError('That image could not be processed. Please try a different one.');");
    expect(HOOK).toContain("setCoverError('That image could not be processed. Please try a different one.');");
  });
  it('the question list editor keeps its model (EXISTS question-list-editor.tsx)', () => {
    // v11 list operations mirror these; see question-list.tsx.
    expect(EDITOR).toContain('if (questions.length <= 1) return;');
    expect(EDITOR).toContain('const copy: QuestionData = JSON.parse(JSON.stringify(questions[i]));');
    expect(EDITOR).toContain("onChange={(e) => onPatch({ ...q, fun_fact: e.target.value.slice(0, 280) })}");
    expect(EDITOR).toContain('maxLength={500}');
    expect(EDITOR).toContain('maxLength={200}');
  });
});

// ---------------------------------------------------------------------------
// v11 presentation (derived from the same validation)
// ---------------------------------------------------------------------------

describe('v11 presentation helpers', () => {
  it('row status words', () => {
    expect(rowStatus(MC_OK[0]!, 'multiple_choice')).toEqual({ ok: true, label: 'Ready' });
    expect(rowStatus(MC_HALF, 'multiple_choice')).toEqual({ ok: false, label: '2 answers missing' });
    expect(rowStatus(mc('Q', ['a', '', 'c', 'd'], 0), 'multiple_choice')).toEqual({ ok: false, label: '1 answer missing' });
    expect(rowStatus(blankQuestionFor('multiple_choice'), 'multiple_choice')).toEqual({ ok: false, label: 'Missing question' });
    expect(rowStatus({ ...blankQuestionFor('true_false'), question: 'S' }, 'true_false')).toEqual({ ok: false, label: 'Pick true or false' });
    expect(rowStatus(mc('Q', ['a', 'b', 'c', 'd'], null), 'multiple_choice')).toEqual({ ok: false, label: 'No correct answer' });
  });
  it('checklist and notes', () => {
    const s = state({ cover: 'data:x', coverRights: true });
    const rows = checklist(s, GROUPS);
    expect(rows.map((r) => [r.label, r.ok, r.end])).toEqual([
      ['Title', true, '21 characters'],
      ['Type and group', true, 'Classic · BTS'],
      ['3 complete questions', true, '3 of 4'],
      ['Cover image', true, 'Added'],
      ['Fun fact on every question', false, '2 of 4 · optional'],
    ]);
    expect(checklist(state({ cover: 'data:x', coverRights: false }), GROUPS)[3]).toMatchObject({ ok: false, warn: true, end: 'Confirm your rights' });
    expect(leftOutNote(s)).toBe('Question 4 is not complete, so it will not be published.');
    expect(leftOutNote(state({ questions: [...MC_OK, MC_HALF, MC_HALF] }))).toBe('Questions 4 and 5 are not complete, so they will not be published.');
    expect(leftOutNote(state({ questions: MC_OK }))).toBeNull();
    expect(incompleteNumbers([MC_HALF, ...MC_OK], 'multiple_choice')).toEqual([1]);
  });
  it('bar status lines', () => {
    expect(detailsStatus(state(), GROUPS, true)).toEqual({ strong: '3 of 3', rest: ' required done · draft saved on this device', ok: true });
    expect(detailsStatus(emptyState(), GROUPS, false)).toEqual({ strong: '1 of 3', rest: ' required done · your draft saves on this device', ok: false });
    expect(questionsStatus([...MC_OK, MC_HALF], 'multiple_choice')).toEqual({ strong: '3 complete', rest: ' questions · 1 needs work', ok: true });
    expect(questionsStatus([MC_OK[0]!], 'multiple_choice')).toEqual({ strong: '1 complete', rest: ' question · 2 more to publish', ok: false });
    expect(publishStatus(state(), GROUPS, 3)).toEqual({ strong: 'Ready', rest: ' · question 4 is left out', ok: true });
    expect(publishStatus(state({ questions: MC_OK }), GROUPS, 3)).toEqual({ strong: 'Ready', rest: ' · 3 questions go live', ok: true });
    expect(publishStatus(state({ group_slug: null }), GROUPS, 3).strong).toBe('Not ready');
  });
  it('group help uses the real fandom name', () => {
    expect(groupHelp(state(), GROUPS)).toBe('Your quiz appears on the BTS page and counts for ARMY in the fandom war.');
    expect(groupHelp(state({ group_slug: 'cortis' }), GROUPS)).toBe('Your quiz appears on the Cortis page and counts for Cortis fans in the fandom war.');
    expect(groupHelp(state({ group_slug: null, newGroup: 'Newbies' }), GROUPS)).toContain('Newbies is a new group');
  });
  it('paste parser (classic: 5 lines, first answer correct; true/false: 2 lines)', () => {
    const text = 'Who is the leader of BTS?\nRM\nJin\nSuga\nV\n\n1. Which year did TWICE debut?\nA) 2015\nB) 2016\nC) 2014\nD) 2017\n\nBroken block\nonly two';
    const r = parsePasted(text, 'multiple_choice');
    expect(r.skipped).toBe(1);
    expect(r.questions).toHaveLength(2);
    for (const q of r.questions) {
      expect(isQuestionValid(q, 'multiple_choice')).toBe(true);
      expect((q.options as string[])[q.correct as number]).toBe(q.question.startsWith('Who') ? 'RM' : '2015');
      expect(q.options).toHaveLength(4);
    }
    const tf = parsePasted('Felix was born in Australia.\ntrue\nJisoo is the maknae\nFALSE\nNo answer line', 'true_false');
    expect(tf.questions.map((q) => q.correct)).toEqual([true, false]);
    expect(tf.skipped).toBe(1);
    expect(tf.questions.every((q) => isQuestionValid(q, 'true_false'))).toBe(true);
    expect(parsePasted('a\nb\nc\nd\ne', 'intruder')).toEqual({ questions: [], skipped: 1 });
  });
});

describe('no em or en dash in the v11 copy', () => {
  it('lib/ux-v1/p5 sources', () => {
    for (const f of fs.readdirSync(here)) {
      const src = fs.readFileSync(path.join(here, f), 'utf8');
      expect(src.includes(String.fromCharCode(0x2014)) || src.includes(String.fromCharCode(0x2013)), f).toBe(false);
    }
  });
});
