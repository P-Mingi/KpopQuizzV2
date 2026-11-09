// Run O1, lot E1b: the shapes of the quiz lane of the editorial pipeline (editorial_drafts of kind 'quiz', review_batches).
// Client safe (no server import): the admin panel and the unit tests read them.

import type { DraftSource, DraftStatus } from '../types';

/** The kind of a quiz draft (SQL 012 adds it to editorial_drafts_kind_check). DRAFT_KINDS stays the three kinds of today. */
export const QUIZ_KIND = 'quiz' as const;

/** editorial_drafts row of kind 'quiz' (the columns payload and review_batch_id exist after SQL 012). */
export interface QuizDraft {
  id: number;
  account_id: string;
  kind: typeof QUIZ_KIND;
  group_id: number | null;
  title: string;
  sources: DraftSource[];
  scheduled_at: string | null;
  status: DraftStatus;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  /** 'quiz:<slug>' once published; 'claim:<run>' while a publisher run holds it. */
  published_ref: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  /** The whole quiz draft entry (formats.md 4), validated by checkQuizPayload; unknown until then. */
  payload: unknown;
  review_batch_id: number | null;
}

export const QUIZ_DRAFT_COLS = 'id, account_id, kind, group_id, title, sources, scheduled_at, status, created_by, reviewed_by, reviewed_at, published_ref, published_at, created_at, updated_at, payload, review_batch_id';

/** review_batches row (SQL 012). */
export interface ReviewBatch {
  id: number;
  lane: string;
  label: string;
  size: number;
  sample_size: number;
  errors: number;
  status: 'open' | 'approved' | 'rejected' | 'partial';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const REVIEW_BATCH_COLS = 'id, lane, label, size, sample_size, errors, status, reviewed_by, reviewed_at, created_at';

/** The group of a quiz draft, as the store reads it. */
export interface QuizGroup { id: number; slug: string; name: string }

/** The quiz row the publisher writes: the payload of the create route (create_quiz_bypass), no image. */
export interface QuizWrite {
  creator_id: string;
  group_id: number;
  title: string;
  slug: string;
  quiz_type: 'multiple_choice';
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'en';
  questions: Array<{ question: string; options: string[]; correct: number; fun_fact?: string; source_url: string }>;
  settings: { timer: true; timer_seconds: 15; shuffle: false; show_answers: true; creator_note?: string; result_levels?: Array<{ min: number; name: string; blurb: string }> };
  question_count: number;
  cover_image_url: null;
}

/** What the admin sees of a draft while it waits: counts of the day. */
export interface QuizDayStats { publishedToday: number; cap: number; perGroupCap: number }
