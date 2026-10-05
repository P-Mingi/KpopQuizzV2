import { unstable_cache } from 'next/cache';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { isMissingTable } from '@/lib/ux-v1/p8/features';
import { isUxV12 } from '@/lib/ux-v12';

import type { EditorialAccount } from './types';

// Who is an editorial (team) account (SYSTEM.md 5.6). One cached, server-only read
// of editorial_accounts (closed table: service role), shared by every surface that
// shows a person (feed, post, replies, activity, notifications, passport model).
//
// Fails soft, always to "nobody is editorial":
//   flag off                      no read at all (v11 code paths, byte for byte)
//   table missing (SQL pending)   [] and cached 5 min like the P8 feature probe
//   any other read error          [] for this render, NOT cached
// So until the owner applies v12-g9-editorial.sql and inserts the accounts, no
// surface changes.

async function readAccounts(): Promise<EditorialAccount[]> {
  const svc = createServiceRoleClient();
  const { data, error, status } = await svc.from('editorial_accounts').select('user_id, display_name, beat, active').order('created_at', { ascending: true }).limit(50);
  if (error) {
    if (isMissingTable(error, status)) return [];
    throw new Error(`editorial accounts: ${error.message}`);
  }
  return (data ?? []) as EditorialAccount[];
}

const cachedAccounts = unstable_cache(readAccounts, ['v12:editorial:accounts:v1'], { revalidate: 300, tags: ['editorial'] });

/** Every editorial account row (active or retired). [] when the flag is off, the
 *  table does not exist yet or the read failed. */
export async function getEditorialAccounts(): Promise<EditorialAccount[]> {
  if (!isUxV12()) return [];
  try {
    return await cachedAccounts();
  } catch (err) {
    console.error('[editorial] accounts read failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

export interface TeamIdentity { displayName: string; beat: string }

/** Active editorial accounts by user id: the Team badge and every exclusion key on this. */
export async function getTeamMap(): Promise<Map<string, TeamIdentity>> {
  const out = new Map<string, TeamIdentity>();
  for (const a of await getEditorialAccounts()) if (a.active) out.set(a.user_id, { displayName: a.display_name, beat: a.beat });
  return out;
}

export async function getTeamIds(): Promise<Set<string>> {
  return new Set((await getTeamMap()).keys());
}

/** True for an active editorial account. They never act as fans: the P8 write
 *  routes (like, reply, vote, challenge, fan debate) refuse them. */
export async function isEditorialUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  return (await getTeamMap()).has(userId);
}

/** Drop the rows whose user is an editorial account (boards, fan counts, activity). */
export function withoutTeam<T>(rows: T[], team: ReadonlySet<string>, userOf: (r: T) => string | null | undefined): T[] {
  if (!team.size) return rows;
  return rows.filter((r) => { const u = userOf(r); return !u || !team.has(u); });
}
