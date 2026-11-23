// KpopCards: /kpopcards/u/<nickname>, a player's page: the showcase of three starred cards and the badges. Nicknames only. Closed to search engines.
import { notFound } from 'next/navigation';

import { PlayerView } from '@/components/cards/ranking-view';
import { robotsFor } from '@/lib/site/indexing';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

// The [site] layout allows no param that was not generated at build (dynamicParams = false, O1 guard). An empty list of static params is not
// enough: a production server then answers every value with NoFallbackError (a 404; seen with next start on 2026-11-13). The rule of the
// hub's open-ended pages (as u/[username]): rendered per request, dynamicParams = true.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export const metadata: Metadata = { title: 'Player', robots: robotsFor(false) };

/** The shape of a nickname (the rule of GET /api/cards/player/<nickname>). */
const NICKNAME = /^[A-Za-z0-9_]{3,20}$/;

/**
 * True, false, or null when it cannot be known (no database settings, a read that failed). One read of `profiles` by nickname, the same lookup as cards_profile (112-social.sql), by the
 * service role: it writes nothing and returns no field of the profile.
 */
async function nicknameExists(nickname: string): Promise<boolean | null> {
  try {
    const { data, error } = await createServiceRoleClient().from('profiles').select('id').eq('username', nickname.toLowerCase()).limit(1);
    if (error) return null;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return null;
  }
}

export default async function KpopCardsPlayerPage({ params }: { params: Promise<{ nickname: string }> }): Promise<React.ReactElement> {
  const { nickname: raw } = await params;
  let nickname: string;
  try { nickname = decodeURIComponent(raw); } catch { notFound(); }
  // SEO-LAUNCH-1 (lane D, agent 1 P2): an unknown nickname is a real 404, not a 200 page that says "not here". A nickname that cannot exist (its shape) or that no profile has answers 404;
  // when the lookup itself cannot be made (null), the page renders as it always did, so a database hiccup never turns a real player's page into a 404.
  if (!NICKNAME.test(nickname) || (await nicknameExists(nickname)) === false) notFound();
  return <PlayerView nickname={nickname} />;
}
