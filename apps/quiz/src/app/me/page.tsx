import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { getProfileById } from '@/lib/db/queries/profiles';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { formatJoinDate } from '@/lib/utils';
import { readPassportSpine, readPassportGroupStats, readCollectionProgress, computeNearMastery } from '@/lib/passport';
import { PassportView, type PassportTopGroup, type PassportNearGap, type PassportUntouched } from '@/components/profile/passport-view';
import { NotificationsStrip } from '@/components/profile/notifications-strip';

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
    supabase.from('groups').select('id, name, slug, logo_url, display_color, quiz_count'),
  ]);

  interface GMeta { name: string; slug: string; logo: string | null; color: string; quizCount: number }
  const allGroups = (groupsRes.data ?? []) as Array<{ id: number; name: string; slug: string; logo_url: string | null; display_color: string; quiz_count: number }>;
  const groupMeta = new Map<number, GMeta>();
  for (const g of allGroups) {
    groupMeta.set(g.id, { name: g.name, slug: g.slug, logo: g.logo_url, color: g.display_color, quizCount: g.quiz_count ?? 0 });
  }

  // Near-mastery nudges (personal): the next win, one step away. In-memory.
  const nearMastery: PassportNearGap[] = computeNearMastery(groupStats)
    .map((gap) => {
      const meta = groupMeta.get(gap.group_id);
      return meta ? { name: meta.name, color: meta.color, kind: gap.kind, playsNeeded: gap.playsNeeded, accuracyNow: gap.accuracyNow } : null;
    })
    .filter((x): x is PassportNearGap => x !== null)
    .slice(0, 3);

  // Untouched groups (personal): inviting start. Suggest popular ones first.
  const touched = new Set(groupStats.filter((s) => s.songs_played > 0).map((s) => s.group_id));
  const untouchedGroups = allGroups.filter((g) => !touched.has(g.id));
  const untouched: PassportUntouched = {
    count: untouchedGroups.length,
    suggestions: untouchedGroups
      .sort((a, b) => (b.quiz_count ?? 0) - (a.quiz_count ?? 0))
      .slice(0, 3)
      .map((g) => ({ name: g.name, slug: g.slug, color: g.display_color })),
  };

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
    <>
      <NotificationsStrip />
      <PassportView
      mode="personal"
      bio={profile.bio}
      nearMastery={nearMastery}
      untouched={untouched}
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
      streakLastActive={spine?.streak_last_active ?? null}
      groupsMastered={collection.groups_mastered}
      groupsTotal={collection.groups_total}
      eras={collection.eras}
      topGroups={topGroups}
      />
    </>
  );
}
