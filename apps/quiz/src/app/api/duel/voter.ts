// Who is voting (V12 G7). The signed-in user when there is a session, else the
// random browser id of lib/anon-id.ts sent in the x-duel-anon header. Neither is
// stored: lib/duel/token.ts turns the identity into the voter hash.

import { isUuid } from '@/lib/anon-claim';
import { createServerClient } from '@/lib/supabase/server';

import type { Voter } from '@/lib/duel/service';
import type { NextRequest } from 'next/server';

export const ANON_HEADER = 'x-duel-anon';

export async function resolveVoter(req: NextRequest): Promise<Voter | null> {
  let userId: string | null = null;
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch { userId = null; }
  if (userId) return { identity: `u:${userId}`, userId };
  const anon = req.headers.get(ANON_HEADER);
  return isUuid(anon) ? { identity: `a:${anon.toLowerCase()}`, userId: null } : null;
}

export const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;
