import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';

import type { P8Features } from './types';

// Which community stores exist. The pending migration
// docs/pending-migrations/v11-p8-community.sql adds community_likes,
// community_debates (+ votes), community_challenges and community_replies. Until
// the owner applies it, the controls that need them are hidden (hearts on threads,
// debates and comments) or disabled with an honest line (fan debates and challenge
// posts in the editor), and the /api/ux-v1/p8 write routes answer 503 not_live.
//
// Probe = a GET select limit 1 (a HEAD request on a missing table answers 204 with
// no error through supabase-js, measured 2026-09-26, so it cannot tell).

const MISSING = new Set(['PGRST205', '42P01']);

/** True when the error means "this table does not exist (yet)". */
export function isMissingTable(err: { code?: string | null; message?: string | null } | null | undefined, status?: number): boolean {
  if (!err) return false;
  if (err.code && MISSING.has(err.code)) return true;
  if (status === 404) return true;
  return /could not find the table|does not exist/i.test(err.message ?? '');
}

async function probe(table: string, col: string): Promise<boolean> {
  const db = createPublicReadClient();
  const { error, status } = await db.from(table).select(col).limit(1);
  if (!error) return true;
  if (isMissingTable(error, status)) return false;
  // Any other failure (network, timeout): throw so the cache does not store a wrong
  // "not live"; callers fall back to all-off for this render.
  throw new Error(`p8 probe ${table}: ${error.message}`);
}

async function readFeatures(): Promise<P8Features> {
  const [likes, fanDebates, challenges] = await Promise.all([
    probe('community_likes', 'target_id'),
    probe('community_debates', 'id'),
    probe('community_challenges', 'id'),
  ]);
  return { likes, fanDebates, challenges };
}

export const NO_FEATURES: P8Features = { likes: false, fanDebates: false, challenges: false };

/** Cached 5 min: applying the migration turns the controls on within minutes. */
export const getP8Features = unstable_cache(readFeatures, ['ux-v1:p8:features:v1'], { revalidate: 300, tags: ['community'] });

/** Uncached probe for the write routes (they must never write to a missing table). */
export async function tableLive(table: 'community_likes' | 'community_debates' | 'community_debate_votes' | 'community_challenges' | 'community_replies'): Promise<boolean> {
  const col = table === 'community_likes' ? 'target_id' : table === 'community_debate_votes' ? 'debate_id' : 'id';
  return probe(table, col);
}
