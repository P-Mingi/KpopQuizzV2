// QOTD rotation (UX v11, P1): what the daily cron does when QOTD_ROTATION_FIX=1.
// Root cause and the pure pickers: lib/quiz-bank-scheduling.ts. The logic runs on
// a small store interface so it is unit-tested without a database; the Supabase
// store below does the same writes as the existing admin routes (set-qotd,
// auto-select-qotd) and the same RPC as today's cron. Nothing here runs unless the
// cron route sees the switch on (default OFF, owner go needed).

import { fetchAllRows } from '@/lib/db/fetch-all';
import { ensureDailyQuizRpc } from '@/lib/daily-quiz';
import {
  addDays, pickBankEntryForDate, pickCatalogQotd,
} from '@/lib/quiz-bank-scheduling';
import { SITE_ID } from '@/lib/site/registry';
import { forSite, withSite } from '@/lib/site/scope';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogQuiz, OpenBankEntry, QotdLogRow } from '@/lib/quiz-bank-scheduling';
import type { SiteId } from '@/lib/site/types';

export type RotationMethod = 'existing' | 'bank' | 'bank-pulled' | 'catalog' | 'none';

export interface RotationResult {
  date: string;
  method: RotationMethod;
  quizId: string | null;
  /** Bank row moved to `date` (bank-pulled only). */
  bankId?: string;
  reason?: string;
}

export interface QotdStore {
  /** Quiz already flagged as the quiz of the day for `date`, if any. */
  qotdFor(date: string): Promise<string | null>;
  /** The existing RPC: publishes the bank row scheduled for `date` (idempotent). */
  ensureDailyQuiz(date: string): Promise<string | null>;
  /** Bank rows still verified or scheduled. */
  openBankEntries(): Promise<OpenBankEntry[]>;
  /** Group (and bank category when known) of the quiz of the day on `date`. */
  qotdNeighbour(date: string): Promise<{ group_id: number | null; category: string | null } | null>;
  /** Moves a verified/scheduled bank row to `date`. False when it could not. */
  moveBankEntry(id: string, date: string): Promise<boolean>;
  catalogCandidates(): Promise<CatalogQuiz[]>;
  logSince(date: string): Promise<QotdLogRow[]>;
  /** Flags `quizId` as the quiz of the day for `date` and logs it (selection 'auto'). */
  featureQuiz(quizId: string, date: string, score: number): Promise<void>;
}

/**
 * Makes sure `date` has a quiz of the day: the existing one, else the bank row
 * scheduled for it (today's behaviour), else the next open bank row pulled to
 * `date`, else a catalog pick. Never throws for "nothing to publish": returns
 * method 'none' with a reason so the cron can report it.
 */
export async function rotateQotd(store: QotdStore, date: string): Promise<RotationResult> {
  const existing = await store.qotdFor(date);
  if (existing) return { date, method: 'existing', quizId: existing };

  const published = await store.ensureDailyQuiz(date);
  if (published) return { date, method: 'bank', quizId: published };

  const previous = await store.qotdNeighbour(addDays(date, -1));
  const entry = pickBankEntryForDate(await store.openBankEntries(), date, previous);
  if (entry && await store.moveBankEntry(entry.id, date)) {
    const pulled = await store.ensureDailyQuiz(date);
    if (pulled) return { date, method: 'bank-pulled', quizId: pulled, bankId: entry.id };
  }

  const [candidates, recent] = await Promise.all([store.catalogCandidates(), store.logSince(addDays(date, -120))]);
  const pick = pickCatalogQotd(candidates, recent, date);
  if (!pick) return { date, method: 'none', quizId: null, reason: 'bank empty and no eligible catalog quiz' };
  await store.featureQuiz(pick.id, date, pick.score);
  return { date, method: 'catalog', quizId: pick.id };
}

/**
 * The Supabase store (service role client; server only), for the quiz of the day of `site` (default: this build's site).
 * Run O1: every read and write of a scoped table goes through forSite / withSite (a no-op on the kpop build while
 * SITE_SCOPE is off, so kpop sends today's queries); the daily publish is ensure_daily_quiz on kpop and
 * ensure_daily_quiz_v2(date, site) on another site (lib/daily-quiz.ts); the log upsert keys on (site_id, featured_date).
 */
export function supabaseQotdStore(db: SupabaseClient, site: SiteId = SITE_ID): QotdStore {
  return {
    async qotdFor(date) {
      const { data } = await forSite(db.from('quizzes').select('id'), site)
        .eq('is_quiz_of_the_day', true).eq('quiz_of_the_day_date', date).limit(1).maybeSingle();
      return (data as { id: string } | null)?.id ?? null;
    },
    async ensureDailyQuiz(date) {
      const { data, error } = await ensureDailyQuizRpc(db, date, site);
      if (error) throw new Error(`${site === 'kpop' ? 'ensure_daily_quiz' : 'ensure_daily_quiz_v2'}: ${error.message}`);
      return (data as string | null) ?? null;
    },
    async openBankEntries() {
      const { data, error } = await forSite(db.from('quiz_bank').select('id, group_id, category, scheduled_date, status'), site)
        .in('status', ['verified', 'scheduled'])
        .limit(1000);
      if (error) throw new Error(`quiz_bank: ${error.message}`);
      return (data ?? []) as OpenBankEntry[];
    },
    async qotdNeighbour(date) {
      const { data } = await forSite(db.from('quizzes').select('id, group_id'), site)
        .eq('is_quiz_of_the_day', true).eq('quiz_of_the_day_date', date).limit(1).maybeSingle();
      const q = data as { id: string; group_id: number | null } | null;
      if (!q) return null;
      const { data: bank } = await db.from('quiz_bank').select('category').eq('published_quiz_id', q.id).limit(1).maybeSingle();
      return { group_id: q.group_id, category: (bank as { category: string } | null)?.category ?? null };
    },
    async moveBankEntry(id, date) {
      const { data, error } = await forSite(db.from('quiz_bank')
        .update({ scheduled_date: date, status: 'scheduled', updated_at: new Date().toISOString() }), site)
        .eq('id', id).in('status', ['verified', 'scheduled'])
        .select('id');
      return !error && Array.isArray(data) && data.length === 1;
    },
    async catalogCandidates() {
      return fetchAllRows<CatalogQuiz>(() => forSite(db.from('quizzes')
        .select('id, group_id, quiz_type, play_count, like_count, total_completions, total_score_sum, question_count, report_count, created_at'), site)
        .eq('status', 'published')
        .order('id'));
    },
    async logSince(date) {
      const { data } = await forSite(db.from('qotd_log').select('quiz_id, featured_date'), site).gte('featured_date', date).limit(1000);
      return (data ?? []) as QotdLogRow[];
    },
    async featureQuiz(quizId, date, score) {
      // Same three writes as /api/admin/set-qotd and /api/admin/auto-select-qotd.
      await forSite(db.from('quizzes').update({ is_quiz_of_the_day: false, quiz_of_the_day_date: null }), site).eq('quiz_of_the_day_date', date);
      const { error } = await forSite(db.from('quizzes').update({ is_quiz_of_the_day: true, quiz_of_the_day_date: date }), site).eq('id', quizId);
      if (error) throw new Error(`feature quiz: ${error.message}`);
      await db.from('qotd_log').upsert(
        withSite({ quiz_id: quizId, featured_date: date, selection_method: 'auto', score }, site),
        { onConflict: 'site_id,featured_date' },
      );
    },
  };
}
