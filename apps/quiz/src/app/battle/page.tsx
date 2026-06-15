import { createServerClient } from '@/lib/supabase/server';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { BattleGame } from '@/components/battle/battle-game';

import type { Metadata } from 'next';

// E4 - the real async 1v1 quick-match battle (Type 1). Signed-in players earn
// battle XP; anon players play with no account.
export const metadata: Metadata = {
  title: '1v1 K-pop Battle',
  description: 'Battle a real fan head to head: 7 questions, fastest and sharpest wins.',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function BattlePage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const groups = await safeFetch(getAllGroups(), [], '[battle] groups');
  const picker = groups.slice(0, 12).map((g) => ({ slug: g.slug, name: g.name }));
  return <BattleGame groups={picker} signedIn={!!user} />;
}
