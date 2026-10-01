// P10: the Quizzes tab's draft row reads this device's create draft (the funnel's own
// localStorage read, A0's "started" rule). Node tests with an in-memory localStorage.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DRAFT_CONTINUE_HREF, UNTITLED_DRAFT, draftRowView, readLocalDraftRow } from './local-draft';

import type { Draft } from '@/lib/create-draft';
import type { QuestionData } from '@/lib/quiz-question';

const NOW = Date.parse('2026-09-25T20:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const KEY = 'kq_create_draft_v1'; // lib/create-draft.ts

const mc = (question: string, options: string[], correct: number | null): QuestionData => ({ question, options, correct, fun_fact: '' });
const OK = [
  mc('Which Stray Kids b-side opens NOEASY?', ['Cheese', 'Sorry, I Love You', 'Thunderous', 'Surfin'], 0),
  mc('Who wrote Surfin?', ['3RACHA', 'Bang Chan', 'Felix', 'Han'], 0),
];
const HALF = mc('Which album has Gone Away?', ['NOEASY', '', '', ''], 0);
const BLANK = mc('', ['', '', '', ''], null);

function draft(over: Partial<Draft> = {}): Draft {
  return { title: 'Stray Kids b-sides deep cut', group_slug: 'stray-kids', quiz_type: 'multiple_choice', cover: null, questions: [...OK, HALF], updatedAt: NOW - 2 * DAY, ...over };
}

/** In-memory localStorage that records every write. */
function storage(init: Record<string, string> = {}): { writes: string[] } {
  const m = new Map(Object.entries(init));
  const writes: string[] = [];
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { writes.push(`set ${k}`); m.set(k, String(v)); },
    removeItem: (k: string) => { writes.push(`remove ${k}`); m.delete(k); },
  });
  return { writes };
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('draftRowView (pure)', () => {
  it('the prototype line: Draft · complete of total questions · edited <time ago>', () => {
    expect(draftRowView(draft(), NOW)).toEqual({ title: 'Stray Kids b-sides deep cut', line: 'Draft · 2 of 3 questions · edited 2 days ago' });
    expect(draftRowView(draft({ questions: [HALF], updatedAt: NOW - 3 * 60 * 60 * 1000 }), NOW)!.line).toBe('Draft · 0 of 1 question · edited 3 hours ago');
    expect(draftRowView(draft({ updatedAt: NOW - 30 * 1000 }), NOW)!.line).toBe('Draft · 2 of 3 questions · edited just now');
  });

  it('counts complete questions with the funnel rules for the draft type', () => {
    const tf = (question: string, correct: boolean | null): QuestionData => ({ question, options: [], correct, fun_fact: '' });
    expect(draftRowView(draft({ quiz_type: 'true_false', questions: [tf('Han is the leader', false), tf('Felix is Australian', true), tf('Bang Chan is the maknae', null)] }), NOW)!.line)
      .toBe('Draft · 2 of 3 questions · edited 2 days ago');
  });

  it('a started draft without a title shows "Untitled quiz"', () => {
    expect(draftRowView(draft({ title: '   ', questions: [HALF] }), NOW)!.title).toBe(UNTITLED_DRAFT);
  });

  it('no row for no draft, a blank autosave or a ?group= preset only (A0 rule, same as the menu count)', () => {
    expect(draftRowView(null, NOW)).toBeNull();
    expect(draftRowView(draft({ title: '', questions: [BLANK] }), NOW)).toBeNull();
    expect(draftRowView(draft({ title: '', group_slug: 'bts', questions: [BLANK] }), NOW)).toBeNull();
  });

  it('Continue opens the funnel, which restores the draft from this device', () => {
    expect(DRAFT_CONTINUE_HREF).toBe('/create');
  });
});

describe('readLocalDraftRow (this device, no server)', () => {
  it('reads the funnel key and writes nothing for a live draft', () => {
    const s = storage({ [KEY]: JSON.stringify(draft()) });
    vi.useFakeTimers({ now: NOW });
    expect(readLocalDraftRow(NOW)).toEqual({ title: 'Stray Kids b-sides deep cut', line: 'Draft · 2 of 3 questions · edited 2 days ago' });
    expect(s.writes).toEqual([]);
  });

  it('none on the server, with no draft, or a malformed one', () => {
    expect(readLocalDraftRow(NOW)).toBeNull(); // no window
    storage();
    expect(readLocalDraftRow(NOW)).toBeNull();
    storage({ [KEY]: '{not json' });
    expect(readLocalDraftRow(NOW)).toBeNull();
  });

  it('an expired draft (7 days) is none: the funnel\'s own read drops it, as it does on /create', () => {
    const s = storage({ [KEY]: JSON.stringify(draft({ updatedAt: NOW - 8 * DAY })) });
    vi.useFakeTimers({ now: NOW });
    expect(readLocalDraftRow(NOW)).toBeNull();
    expect(s.writes).toEqual(['remove kq_create_draft_v1', 'remove kq_create_step_v1']);
  });

  it('old drafts (pre quiz_type, legacy answers shape) migrate like the funnel', () => {
    const legacy = { title: 'Old MC draft', group_slug: 'bts', cover: null, updatedAt: NOW - DAY, questions: [{ question: 'Q?', answers: ['a', 'b', 'c', 'd'], correctIndex: 1, funFact: '' }] };
    storage({ [KEY]: JSON.stringify(legacy) });
    vi.useFakeTimers({ now: NOW });
    expect(readLocalDraftRow(NOW)).toEqual({ title: 'Old MC draft', line: 'Draft · 1 of 1 question · edited yesterday' });
  });
});
