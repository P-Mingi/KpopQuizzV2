// Run O1, lot E1b: fixtures of the quiz lane tests (not a test file: vitest only collects *.test.ts). A good quiz draft and an
// in-memory QuizStore that answers every read and write locally and enforces the CHECKs of editorial_drafts (012 and
// v12-g9-editorial.sql) and the unique slug of quizzes, so a test fails where the database would. Nothing here can reach production.

import type { CalendarRow, QuizDraftInsert, QuizDraftPatch, QuizStore, SlugOwner } from './pipeline';
import type { QuizDraftPayload } from './payload';
import type { QuizDraft, QuizGroup, QuizWrite, ReviewBatch } from './types';
import type { DraftStatus, EditorialAccount } from '../types';

export const NOW = Date.parse('2026-11-04T09:00:00Z');
export const MIN = 60_000;
export const DAY = 86_400_000;
export const iso = (ms: number): string => new Date(ms).toISOString();

export const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const MINA = '11111111-1111-4111-8111-111111111111';
export const JAE = '22222222-2222-4222-8222-222222222222';
export const RETIRED = '33333333-3333-4333-8333-333333333333';
export const isAdmin = (id: string): boolean => id === ADMIN;

export const ACCOUNTS: EditorialAccount[] = [
  { user_id: MINA, display_name: 'Mina', beat: 'Girl groups', active: true },
  { user_id: JAE, display_name: 'Jae', beat: 'Boy groups', active: true },
  { user_id: RETIRED, display_name: 'Sol', beat: 'Charts', active: false },
];
export const USERNAMES: Record<string, string> = { mina_team: MINA, jae_team: JAE, sol_team: RETIRED };

export const GROUPS: QuizGroup[] = [
  { id: 1, slug: 'aespa', name: 'aespa' },
  { id: 2, slug: 'bts', name: 'BTS' },
  { id: 3, slug: 'stray-kids', name: 'Stray Kids' },
  { id: 4, slug: 'ive', name: 'IVE' },
  { id: 5, slug: 'twice', name: 'TWICE' },
  { id: 6, slug: 'seventeen', name: 'SEVENTEEN' },
  { id: 7, slug: 'newjeans', name: 'NewJeans' },
  { id: 8, slug: 'itzy', name: 'ITZY' },
  { id: 9, slug: 'txt', name: 'TXT' },
  { id: 10, slug: 'ateez', name: 'ATEEZ' },
  { id: 11, slug: 'illit', name: 'ILLIT' },
  { id: 12, slug: 'le-sserafim', name: 'LE SSERAFIM' },
];

const SRC_A = 'https://en.wikipedia.org/wiki/Aespa';
const SRC_B = 'https://www.wikidata.org/wiki/Q98400000';

export function question(n: number): QuizDraftPayload['questions'][number] {
  return {
    question: `Question number ${n} about the group?`,
    options: [`Answer ${n}a`, `Answer ${n}b`, `Answer ${n}c`, `Answer ${n}d`],
    correct: n % 4,
    ...(n % 2 === 0 ? { fun_fact: `Fact ${n}: a short sentence.` } : {}),
    source_url: n % 3 === 0 ? SRC_B : SRC_A,
  };
}

/** A valid draft entry (formats.md 4, kpop form). */
export function goodPayload(over: Partial<QuizDraftPayload> = {}): QuizDraftPayload {
  return {
    site: 'kpop', account: 'mina_team', group_slug: 'aespa', title: 'How well do you know the aespa debut era?', slug: 'aespa-debut-era-check',
    description: 'Ten sourced questions on the first year of aespa.', quiz_type: 'multiple_choice', difficulty: 'medium', language: 'en',
    title_gives_nothing_away: true,
    questions: Array.from({ length: 10 }, (_, i) => question(i + 1)),
    sources: [{ id: 'S1', title: 'Wikipedia, aespa', url: SRC_A }, { id: 'S2', title: 'Wikidata, aespa', url: SRC_B }],
    notes: 'Checked against the two sources.',
    ...over,
  };
}

/** A draft entry for group `g` with a slug of its own. */
export function draftFor(g: QuizGroup, n: number, account = 'mina_team'): QuizDraftPayload {
  return goodPayload({ group_slug: g.slug, slug: `${g.slug}-era-check-${n}`, title: `How well do you know ${g.name} era ${n}?`, account });
}

export interface PublishedQuiz { id: string; slug: string; creator_id: string; title: string; group_id: number; status: string; row: QuizWrite }

export interface MemoryQuizStore extends QuizStore {
  drafts: QuizDraft[];
  quizzes: PublishedQuiz[];
  batches: ReviewBatch[];
  inserts: QuizWrite[];
  failNextInsert: boolean;
  /** Stop `insertQuiz` after the quiz exists, as a crashed run would (the quiz is written, the call throws). */
  crashAfterInsert: boolean;
}

export function memoryQuizStore(opts: { accounts?: EditorialAccount[]; groups?: QuizGroup[] } = {}): MemoryQuizStore {
  const accounts = opts.accounts ?? ACCOUNTS;
  const groups = opts.groups ?? GROUPS;
  let draftSeq = 0;
  let batchSeq = 0;
  const m: MemoryQuizStore = {
    drafts: [], quizzes: [], batches: [], inserts: [], failNextInsert: false, crashAfterInsert: false,
    async accounts() { return accounts; },
    async accountIdsByUsername(names) {
      const active = new Set(accounts.map((a) => a.user_id));
      return new Map(names.filter((n) => USERNAMES[n] && active.has(USERNAMES[n]!)).map((n) => [n, USERNAMES[n]!] as const));
    },
    async groupsBySlug(slugs) { return new Map(groups.filter((g) => slugs.includes(g.slug)).map((g) => [g.slug, g] as const)); },
    async groupsByIds(ids) { return new Map(groups.filter((g) => ids.includes(g.id)).map((g) => [g.id, g] as const)); },
    async publishedQuizCounts(ids) { return new Map(ids.map((id) => [id, m.quizzes.filter((q) => q.group_id === id && q.status === 'published').length] as const)); },
    async slugOwners(slugs) {
      return new Map(m.quizzes.filter((q) => slugs.includes(q.slug)).map((q) => [q.slug, { id: q.id, creator_id: q.creator_id, title: q.title } as SlugOwner] as const));
    },
    async quizTitleOwners(titles) {
      const out = new Map<string, string[]>();
      for (const q of m.quizzes) if (titles.includes(q.title)) out.set(q.title.toLowerCase(), [...(out.get(q.title.toLowerCase()) ?? []), q.slug]);
      return out;
    },
    async quizDraftSlugs(slugs) {
      return new Set(m.drafts.filter((d) => d.status !== 'rejected').map((d) => (d.payload as QuizDraftPayload).slug).filter((s) => slugs.includes(s)));
    },
    async listQuizDrafts(limit, status) { return [...m.drafts].filter((d) => !status || d.status === status).reverse().slice(0, limit); },
    async getQuizDrafts(ids) { return m.drafts.filter((d) => ids.includes(d.id)); },
    async draftsOfBatch(id) { return m.drafts.filter((d) => d.review_batch_id === id); },
    async insertQuizDraft(row: QuizDraftInsert) {
      const d: QuizDraft = {
        id: ++draftSeq, account_id: row.account_id, kind: 'quiz', group_id: row.group_id, title: row.title, sources: row.sources, scheduled_at: null, status: 'draft',
        created_by: row.created_by, reviewed_by: null, reviewed_at: null, published_ref: null, published_at: null, created_at: iso(NOW), updated_at: iso(NOW),
        payload: row.payload, review_batch_id: row.review_batch_id,
      };
      m.drafts.push(d);
      return d;
    },
    async updateQuizDraft(id, patch: QuizDraftPatch, when) {
      const d = m.drafts.find((x) => x.id === id);
      if (!d || !(when.status as DraftStatus[]).includes(d.status)) return null;
      if (when.unclaimed && d.published_ref !== null) return null;
      const next = { ...d, ...patch };
      // The table's own CHECKs (v12-g9-editorial.sql), so the test fails where the database would.
      if ((next.status === 'approved' || next.status === 'published') && (!next.reviewed_by || !next.reviewed_at)) throw new Error('editorial_drafts_reviewed_chk');
      if (next.status === 'approved' && !next.scheduled_at) throw new Error('editorial_drafts_schedule_chk');
      if (next.status === 'published' && (!next.published_ref || !next.published_at)) throw new Error('editorial_drafts_published_chk');
      Object.assign(d, next);
      return d;
    },
    async approvedQuizDue(nowIso) { return m.drafts.filter((d) => d.status === 'approved' && !!d.scheduled_at && d.scheduled_at <= nowIso); },
    async calendarRows(since): Promise<CalendarRow[]> {
      return [
        ...m.drafts.filter((d) => d.status === 'approved' && !!d.scheduled_at && d.scheduled_at >= since).map((d) => ({ id: d.id, group_id: d.group_id, at: d.scheduled_at! })),
        ...m.drafts.filter((d) => d.status === 'published' && !!d.published_at && d.published_at >= since).map((d) => ({ id: null, group_id: d.group_id, at: d.published_at! })),
      ];
    },
    async publishedQuizzesBetween(start, end) {
      return m.drafts.filter((d) => d.status === 'published' && !!d.published_at && d.published_at >= start && d.published_at < end).map((d) => ({ group_id: d.group_id }));
    },
    async insertQuiz(row) {
      if (m.failNextInsert) { m.failNextInsert = false; throw new Error('stubbed failure'); }
      if (m.quizzes.some((q) => q.slug === row.slug)) throw new Error('quizzes_slug_key');
      m.inserts.push(row);
      const q: PublishedQuiz = { id: `quiz-${m.quizzes.length + 1}`, slug: row.slug, creator_id: row.creator_id, title: row.title, group_id: row.group_id, status: 'published', row };
      m.quizzes.push(q);
      if (m.crashAfterInsert) { m.crashAfterInsert = false; throw new Error('the run stopped after the insert'); }
      return { id: q.id, slug: q.slug };
    },
    async createReviewBatch(row) {
      const b: ReviewBatch = { id: ++batchSeq, lane: 'editorial-quiz', label: row.label, size: row.size, sample_size: row.sample_size, errors: 0, status: 'open', reviewed_by: null, reviewed_at: null, created_at: iso(NOW) };
      m.batches.push(b);
      return b;
    },
    async listReviewBatches(limit) { return [...m.batches].reverse().slice(0, limit); },
    async getReviewBatch(id) { return m.batches.find((b) => b.id === id) ?? null; },
    async closeReviewBatch(id, row) {
      const b = m.batches.find((x) => x.id === id);
      if (!b || b.status !== 'open') return null;
      Object.assign(b, row);
      return b;
    },
  };
  return m;
}

/** Files `n` drafts of distinct groups as one batch and returns their ids. */
export async function seedDrafts(m: MemoryQuizStore, payloads: QuizDraftPayload[], batch: number | null = null): Promise<number[]> {
  const ids: number[] = [];
  for (const p of payloads) {
    const g = GROUPS.find((x) => x.slug === p.group_slug)!;
    const d = await m.insertQuizDraft({ account_id: USERNAMES[p.account]!, group_id: g.id, title: p.title, sources: [], created_by: ADMIN, payload: p, review_batch_id: batch });
    ids.push(d.id);
  }
  return ids;
}
