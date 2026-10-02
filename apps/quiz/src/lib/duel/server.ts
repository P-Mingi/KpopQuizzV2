// The Supabase side of the duel rules (V12 G7). Server only.
//
// Existing tables, read as they are (migrations 067 / 068, never altered here):
//   duel_questions (group_slug, question_type, entity_kind, min_votes, is_active)
//   duel_ratings   (question_id, entity_id, entity_name, entity_image): the songs of a question
//   duel_votes     (question_id, option_a_id, option_b_id, winner_id, voter_hash, created_at)
// Added by docs/pending-migrations/v12-g7-this-or-that.sql (owner applied):
//   duel_vote_guard, duel_cast_song_vote(), duel_song_rankings
// Until that file is applied `applied()` is false and every caller hides itself.
//
// Every read is caught: a database blip hides the card or the section, it never
// throws into a page (ISR fail-closed).

import { createServiceRoleClient } from '@/lib/supabase/server';
import { realFandomName } from '@/lib/ux-v1/p3/model';

import { pairKey } from './pairs';
import { readFansPicked } from './service';

import type { FansPickedRow, FansPickedVote } from './fans-picked';
import type { CastResult, DuelStore, SongQuestion, StoredRank } from './service';
import type { DuelGroup, DuelSong, FansPickedResponse } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

const SONG_TYPE = 'songs';
const PAGE = 1000;

/** Title key for matching a duel song to the catalogue (case, spacing and punctuation free). */
export function titleKey(title: string): string {
  return title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/** A catalogue year is a real year or nothing. */
export function cleanYear(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1990 && v <= 2100 ? v : null;
}

function client(): SupabaseClient | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try { return createServiceRoleClient(); } catch { return null; }
}

let appliedCache: { value: boolean; until: number } | null = null;

export function createDuelStore(db: SupabaseClient | null = client()): DuelStore {
  return {
    async applied(): Promise<boolean> {
      if (!db) return false;
      const now = Date.now();
      if (appliedCache && appliedCache.until > now) return appliedCache.value;
      let value = false;
      try {
        const [guard, ranks] = await Promise.all([
          // a plain select, not a HEAD count: a HEAD on a missing table comes back without an error body
          db.from('duel_vote_guard').select('vote_day').limit(1),
          db.from('duel_song_rankings').select('entity_id').limit(1),
        ]);
        value = !guard.error && !ranks.error && Array.isArray(guard.data) && Array.isArray(ranks.data);
      } catch { value = false; }
      appliedCache = { value, until: now + (value ? 300_000 : 30_000) };
      return value;
    },

    async group(slug: string): Promise<(DuelGroup & { id: number }) | null> {
      if (!db) return null;
      try {
        const { data } = await db.from('groups').select('id, slug, name, fandom_name').eq('slug', slug).maybeSingle();
        if (!data) return null;
        const row = data as { id: number; slug: string; name: string; fandom_name: string | null };
        return { id: row.id, slug: row.slug, name: row.name, fandom: realFandomName(row.fandom_name) };
      } catch { return null; }
    },

    async question(groupSlug: string): Promise<SongQuestion | null> {
      if (!db) return null;
      try {
        const { data } = await db.from('duel_questions').select('id, group_slug, min_votes')
          .eq('group_slug', groupSlug).eq('question_type', SONG_TYPE).eq('entity_kind', 'song').eq('is_active', true).maybeSingle();
        if (!data) return null;
        const row = data as { id: string; group_slug: string; min_votes: number };
        return { id: row.id, groupSlug: row.group_slug, minVotes: row.min_votes };
      } catch { return null; }
    },

    async songs(question: SongQuestion, groupId: number): Promise<DuelSong[]> {
      if (!db) return [];
      try {
        const { data } = await db.from('duel_ratings').select('entity_id, entity_name, entity_image').eq('question_id', question.id).limit(PAGE);
        const rows = (data ?? []) as Array<{ entity_id: string; entity_name: string; entity_image: string | null }>;
        if (rows.length === 0) return [];
        // Years: the catalogue row with the same id (songs seeded by G7), else the
        // same title in the group's catalogue, else the blindtest list. No match = no year.
        const byId = new Map<string, number>();
        const byTitle = new Map<string, number>();
        const [own, catalogue, blindtest] = await Promise.all([
          db.from('songs').select('id, year').in('id', rows.map((r) => r.entity_id)),
          db.from('songs').select('title, year').eq('group_id', groupId).not('year', 'is', null).limit(PAGE),
          db.from('blind_test_songs').select('title, year').eq('group_id', groupId).not('year', 'is', null).limit(PAGE),
        ]);
        for (const s of (blindtest.data ?? []) as Array<{ title: string; year: unknown }>) { const y = cleanYear(s.year); if (y) byTitle.set(titleKey(s.title), y); }
        for (const s of (catalogue.data ?? []) as Array<{ title: string; year: unknown }>) { const y = cleanYear(s.year); if (y) byTitle.set(titleKey(s.title), y); }
        for (const s of (own.data ?? []) as Array<{ id: string; year: unknown }>) { const y = cleanYear(s.year); if (y) byId.set(s.id, y); }
        return rows.map((r) => ({
          id: r.entity_id,
          title: r.entity_name,
          year: byId.get(r.entity_id) ?? byTitle.get(titleKey(r.entity_name)) ?? null,
          cover: r.entity_image && /^https:\/\/cdn-images\.dzcdn\.net\//.test(r.entity_image) ? r.entity_image : null,
        }));
      } catch { return []; }
    },

    async votedToday(voter: string, questionId: string): Promise<Set<string>> {
      const out = new Set<string>();
      if (!db) return out;
      try {
        const day = new Date().toISOString().slice(0, 10);
        const { data } = await db.from('duel_vote_guard').select('pair_key').eq('voter_hash', voter).eq('question_id', questionId).eq('vote_day', day).limit(PAGE);
        for (const r of (data ?? []) as Array<{ pair_key: string }>) {
          const [a, b] = r.pair_key.split('|');
          if (a && b) out.add(pairKey(a, b));
        }
      } catch { /* fail soft: the database still refuses a second vote */ }
      return out;
    },

    async cast(input): Promise<CastResult | null> {
      if (!db) return null;
      try {
        const { data, error } = await db.rpc('duel_cast_song_vote', {
          p_question_id: input.questionId,
          p_option_a_id: input.a,
          p_option_b_id: input.b,
          p_winner_id: input.winner,
          p_voter_hash: input.voter,
        });
        if (error) return null;
        const row = (Array.isArray(data) ? data[0] : data) as { status?: string; votes_a?: number | null; votes_b?: number | null } | null | undefined;
        if (!row || typeof row.status !== 'string') return null;
        return { status: row.status as CastResult['status'], votesA: row.votes_a ?? null, votesB: row.votes_b ?? null };
      } catch { return null; }
    },

    async ranking(questionId: string): Promise<StoredRank[] | null> {
      if (!db) return null;
      try {
        const { data, error } = await db.from('duel_song_rankings')
          .select('entity_id, rank, prev_rank, movement, votes, question_votes, question_votes_prev, computed_at')
          .eq('question_id', questionId).limit(PAGE);
        if (error) return null;
        return ((data ?? []) as Array<{ entity_id: string; rank: number | null; prev_rank: number | null; movement: number | null; votes: number; question_votes: number; question_votes_prev: number; computed_at: string }>).map((r) => ({
          entityId: r.entity_id,
          rank: r.rank,
          prevRank: r.prev_rank,
          movement: r.movement,
          votes: r.votes,
          questionVotes: r.question_votes,
          questionVotesPrev: r.question_votes_prev,
          computedAt: r.computed_at,
        }));
      } catch { return null; }
    },

    async isEditorial(userId: string): Promise<boolean> {
      if (!db) return false;
      try {
        // The table is G9's (v12-g9-editorial.sql). Not there yet = nobody is editorial.
        const { data, error } = await db.from('editorial_accounts').select('user_id').eq('user_id', userId).limit(1);
        return !error && (data ?? []).length > 0;
      } catch { return false; }
    },
  };
}

/** Fans picked for one group, for a server component (G8's hub section) or the API route. */
export async function getFansPicked(groupSlug: string): Promise<FansPickedResponse> {
  return readFansPicked(createDuelStore(), groupSlug);
}

// ---- the nightly ranking (api/cron/fans-picked) --------------------------------

export interface RankingSource {
  questions(): Promise<SongQuestion[]>;
  entityIds(questionId: string): Promise<string[]>;
  votes(questionId: string): Promise<FansPickedVote[]>;
  editorialUserIds(): Promise<string[]>;
  save(question: SongQuestion, rows: FansPickedRow[], totals: { votes: number; votesPrev: number }, computedAt: string): Promise<void>;
  pruneGuard(beforeDay: string): Promise<void>;
}

export function createRankingSource(db: SupabaseClient): RankingSource {
  return {
    async questions(): Promise<SongQuestion[]> {
      const { data, error } = await db.from('duel_questions').select('id, group_slug, min_votes')
        .eq('question_type', SONG_TYPE).eq('entity_kind', 'song').eq('is_active', true).neq('group_slug', 'general').order('group_slug').limit(PAGE);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ id: string; group_slug: string; min_votes: number }>).map((r) => ({ id: r.id, groupSlug: r.group_slug, minVotes: r.min_votes }));
    },

    async entityIds(questionId: string): Promise<string[]> {
      const { data, error } = await db.from('duel_ratings').select('entity_id').eq('question_id', questionId).limit(PAGE);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ entity_id: string }>).map((r) => r.entity_id);
    },

    // PostgREST caps a select at 1000 rows: the vote log is read page by page, in a
    // stable order (created_at, id).
    async votes(questionId: string): Promise<FansPickedVote[]> {
      const out: FansPickedVote[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await db.from('duel_votes').select('option_a_id, option_b_id, winner_id, voter_hash, created_at')
          .eq('question_id', questionId).order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as Array<{ option_a_id: string; option_b_id: string; winner_id: string; voter_hash: string | null; created_at: string }>;
        for (const r of rows) out.push({ a: r.option_a_id, b: r.option_b_id, winner: r.winner_id, voterHash: r.voter_hash, at: Date.parse(r.created_at) });
        if (rows.length < PAGE) break;
      }
      return out;
    },

    async editorialUserIds(): Promise<string[]> {
      // G9's table. Missing (not applied yet) = no editorial account exists.
      const { data, error } = await db.from('editorial_accounts').select('user_id').limit(PAGE);
      if (error) return [];
      return ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
    },

    async save(question, rows, totals, computedAt): Promise<void> {
      const payload = rows.map((r) => ({
        question_id: question.id,
        entity_id: r.entityId,
        group_slug: question.groupSlug,
        rank: r.rank,
        prev_rank: r.prevRank,
        movement: r.movement,
        strength: Number(r.strength.toFixed(6)),
        votes: r.votes,
        wins: r.wins,
        question_votes: totals.votes,
        question_votes_prev: totals.votesPrev,
        computed_at: computedAt,
      }));
      if (payload.length > 0) {
        const { error } = await db.from('duel_song_rankings').upsert(payload, { onConflict: 'question_id,entity_id' });
        if (error) throw new Error(error.message);
      }
      // rows of songs that left the question (this run did not touch them)
      const { error: delError } = await db.from('duel_song_rankings').delete().eq('question_id', question.id).lt('computed_at', computedAt);
      if (delError) throw new Error(delError.message);
    },

    async pruneGuard(beforeDay: string): Promise<void> {
      const { error } = await db.from('duel_vote_guard').delete().lt('vote_day', beforeDay);
      if (error) throw new Error(error.message);
    },
  };
}

export function duelServiceClient(): SupabaseClient | null {
  return client();
}
