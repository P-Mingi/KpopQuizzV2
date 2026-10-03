import { getTeamIds } from '@/lib/editorial/accounts';
import { createPublicReadClient } from '@/lib/supabase/server';

// Usernames of the active editorial (team) accounts, for the reads that return a
// username but no user id (ranked ladder rows, quiz author names, community rows).
// getTeamIds() answers "nobody" with NEXT_PUBLIC_UX_V12 off or before the owner applies
// the editorial SQL: then this reads nothing and returns an empty set, so every
// caller keeps today's output byte for byte.
//
// A failed read THROWS: an exclusion fails closed (the caller's block says it could
// not load) rather than listing a team account as a fan.
export async function teamUsernames(): Promise<Set<string>> {
  const ids = [...(await getTeamIds())];
  if (ids.length === 0) return new Set();
  const { data, error } = await createPublicReadClient().from('profiles').select('username').in('id', ids);
  if (error) throw new Error(`[editorial] team usernames: ${error.message}`);
  return new Set(((data ?? []) as Array<{ username: string | null }>).map((p) => p.username).filter((u): u is string => Boolean(u)));
}

/** Team ids and usernames together, for surfaces that match either. Empty sets when nobody is editorial. */
export async function teamKeys(): Promise<{ ids: Set<string>; usernames: Set<string> }> {
  const ids = await getTeamIds();
  if (ids.size === 0) return { ids, usernames: new Set() };
  return { ids, usernames: await teamUsernames() };
}
