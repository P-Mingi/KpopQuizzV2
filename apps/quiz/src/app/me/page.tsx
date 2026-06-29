import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { getProfileById } from '@/lib/db/queries/profiles';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { formatJoinDate } from '@/lib/utils';
import { readPassportSpine, readPassportGroupStats, readCollectionProgress } from '@/lib/passport';
import { PassportView, type PassportTopGroup } from '@/components/profile/passport-view';

import type { Metadata } from 'next';

// M1.1 prototype: the personal K-pop Passport (/me). Reads real spine data via
// passport.ts. This is THE harmonized profile basis; /u/[username] adopts it
// after sign-off (not a second profile). Unlinked + noindex during prototype.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'My passport',
  robots: { index: false, follow: false },
};

export default async function MyPassportPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getProfileById(user.id);
  if (!profile) redirect('/onboarding');

  const [spine, groupStats, collection, groupsRes] = await Promise.all([
    readPassportSpine(supabase, user.id),
    readPassportGroupStats(supabase, user.id),
    readCollectionProgress(supabase, user.id),
    supabase.from('groups').select('id, name, logo_url, display_color'),
  ]);

  const groupMeta = new Map<number, { name: string; logo: string | null; color: string }>();
  for (const g of (groupsRes.data ?? []) as Array<{ id: number; name: string; logo_url: string | null; display_color: string }>) {
    groupMeta.set(g.id, { name: g.name, logo: g.logo_url, color: g.display_color });
  }

  const topGroups: PassportTopGroup[] = groupStats
    .filter((s) => s.songs_played > 0)
    .sort((a, b) => b.songs_played - a.songs_played)
    .slice(0, 5)
    .map((s) => {
      const meta = groupMeta.get(s.group_id);
      return {
        name: meta?.name ?? `Group ${s.group_id}`,
        logo: meta?.logo ?? null,
        color: meta?.color ?? '#E8457A',
        plays: s.songs_played,
        accuracy: s.accuracy,
      };
    });

  const levelInfo = getLevelInfo(profile.xp);
  const levelTitle = getTitleForLevel(levelInfo.level);
  const nextTitle = levelInfo.xpForNextLevel !== null ? getTitleForLevel(levelInfo.level + 1) : null;

  return (
    <PassportView
      username={profile.username}
      displayName={profile.display_name ?? profile.username}
      avatarUrl={profile.avatar_url}
      avatarBg={profile.avatar_bg}
      avatarText={profile.avatar_text}
      joinedLabel={formatJoinDate(profile.created_at)}
      level={levelInfo.level}
      levelTitleEn={levelTitle.en}
      levelTitleKr={levelTitle.kr}
      xp={profile.xp}
      xpForNext={levelInfo.xpForNextLevel}
      xpPct={levelInfo.progress}
      nextTitleEn={nextTitle?.en ?? null}
      quizzesPlayed={spine?.quizzes_played ?? 0}
      blindtestsPlayed={spine?.blindtests_played ?? 0}
      duelsVoted={spine?.duels_voted ?? 0}
      battlesPlayed={spine?.battles_played ?? 0}
      battlesWon={spine?.battles_won ?? 0}
      quizzesCreated={spine?.total_quizzes_created ?? profile.total_quizzes_created}
      streakCurrent={spine?.streak_current ?? 0}
      streakLongest={spine?.streak_longest ?? 0}
      groupsMastered={collection.groups_mastered}
      groupsTotal={collection.groups_total}
      eras={collection.eras}
      topGroups={topGroups}
    />
  );
}
