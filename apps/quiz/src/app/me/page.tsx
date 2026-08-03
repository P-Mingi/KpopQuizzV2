import { redirect } from 'next/navigation';
import Link from 'next/link';

import { createServerClient } from '@/lib/supabase/server';
import { getProfileById } from '@/lib/db/queries/profiles';
import { getQuizzesByCreator } from '@/lib/db/queries/quizzes';
import { getLatestPersonalityMatch } from '@/lib/personality/data';
import { safeFetch } from '@/lib/error-handling';
import { ProfileTabs } from '@/app/u/[username]/profile-tabs';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { formatJoinDate } from '@/lib/utils';
import { readPassportSpine, readPassportGroupStats, readCollectionProgress, computeNearMastery, computeClimbs, computeMilestones, snapshotIfStale } from '@/lib/passport';
import { passportAccent } from '@/lib/passport-themes';
import { PassportView, type PassportTopGroup, type PassportNearGap, type PassportUntouched, type PassportClimb } from '@/components/profile/passport-view';
import { SpaceMembershipsCard } from '@/components/verse/space-memberships-card';
import { ContributionGraph } from '@/components/verse/contribution-graph';
import { PhotocardCollectionCard } from '@/components/verse/photocard-collection-card';
import { BadgeShelf } from '@/components/profile/badge-shelf';
import { PassportShare } from '@/components/profile/passport-share';
import { FanCardShare } from '@/components/profile/fan-card-share';

import type { Metadata } from 'next';
import type { BadgeDefinition } from '@/lib/db/types';

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

  const [spine, groupStats, collection, groupsRes, badgeDefsRes, userBadgesRes] = await Promise.all([
    readPassportSpine(supabase, user.id),
    readPassportGroupStats(supabase, user.id),
    readCollectionProgress(supabase, user.id),
    supabase.from('groups').select('id, name, slug, logo_url, display_color, quiz_count'),
    // M1.29: /me runs the same layout as /u, badge shelf included.
    supabase.from('badge_definitions').select('*').order('sort_order'),
    supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', user.id),
  ]);
  const allBadges = (badgeDefsRes.data ?? []) as BadgeDefinition[];
  const userBadgeRows = (userBadgesRes.data ?? []) as Array<{ badge_id: string; earned_at: string }>;
  const earnedBadgeIds = userBadgeRows.map((b) => b.badge_id);
  const badgeEarnedAt = Object.fromEntries(userBadgeRows.map((b) => [b.badge_id, b.earned_at]));

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

  // Progression (M1.4, personal only). Forward snapshot first (cheap, weekly-gated),
  // then read this user's snapshots to compute honest accuracy climbs. Milestones
  // come from current counters and show immediately.
  await snapshotIfStale(supabase, user.id, spine?.snapshot_at ?? null, groupStats);

  const { data: snapRows } = await supabase
    .from('passport_group_snapshots')
    .select('group_id, taken_on, accuracy')
    .eq('user_id', user.id);

  const climbs: PassportClimb[] = computeClimbs((snapRows ?? []) as Array<{ group_id: number; taken_on: string; accuracy: number }>, groupStats)
    .map((c) => {
      const meta = groupMeta.get(c.group_id);
      return { name: meta?.name ?? `Group ${c.group_id}`, color: meta?.color ?? '#E8457A', fromPct: c.fromPct, toPct: c.toPct };
    })
    .slice(0, 2);

  const milestones = computeMilestones({
    groupsMastered: collection.groups_mastered,
    quizzesPlayed: spine?.quizzes_played ?? 0,
    blindtestsPlayed: spine?.blindtests_played ?? 0,
    battlesWon: spine?.battles_won ?? 0,
    streakLongest: spine?.streak_longest ?? 0,
  });

  // Identity (M1.6): theme accent + pinned ult chips (slugs -> meta).
  const accent = passportAccent(spine?.profile_theme);
  const bySlug = new Map(allGroups.map((g) => [g.slug, g]));
  const ultGroups = (spine?.ult_groups ?? [])
    .map((slug) => { const g = bySlug.get(slug); return g ? { name: g.name, slug: g.slug, color: g.display_color } : null; })
    .filter((x): x is { name: string; slug: string; color: string } => x !== null);

  const levelInfo = getLevelInfo(profile.xp);
  const levelTitle = getTitleForLevel(levelInfo.level);
  const nextTitle = levelInfo.xpForNextLevel !== null ? getTitleForLevel(levelInfo.level + 1) : null;

  // U-3: the owner's created-quizzes list (with per-quiz plays + likes on each
  // card). It lived on the public /u/[username] passport but not on /me, so the
  // owner could not see "how their quizzes are doing" from their own profile.
  const createdQuizzes = await safeFetch(getQuizzesByCreator(user.id, 0, 10), [], '[me] getQuizzesByCreator');
  // P step 6: opt-in "{member}-coded" passport flair (off by default).
  const personalityFlair = (profile as { show_personality_flair?: boolean }).show_personality_flair
    ? await safeFetch(getLatestPersonalityMatch(user.id), null, '[me] getLatestPersonalityMatch')
    : null;

  return (
    // One 520 column for the whole passport (matches PassportView's own width), so
    // the Quizzes/Liked tabs and the share row align with the passport instead of
    // spanning full width.
    <div style={{ paddingTop: 16, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
      <PassportView
      mode="personal"
      headerSlot={
        <Link
          href="/settings"
          aria-label="Edit profile and settings"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            padding: '7px 13px', borderRadius: 999, whiteSpace: 'nowrap',
            background: 'var(--brand-light)', color: 'var(--brand-dark)',
            border: '1px solid color-mix(in srgb, var(--brand) 28%, var(--border))',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Edit profile
        </Link>
      }
      nameAccent={profile.name_accent}
      personalityFlair={personalityFlair}
      pinnedBadgeId={profile.pinned_badge_id}
      avatarKind={(profile.avatar_kind as 'photo' | 'preset' | 'custom' | null) ?? 'photo'}
      avatarRef={profile.avatar_ref}
      badgesSlot={<BadgeShelf allBadges={allBadges} earnedBadgeIds={earnedBadgeIds} earnedAt={badgeEarnedAt} />}
      bio={profile.bio}
      accent={accent}
      bias={spine?.bias ?? null}
      stanSince={profile.stan_since ?? null}
      headerUrl={profile.header_url}
      ultGroups={ultGroups}
      nearMastery={nearMastery}
      untouched={untouched}
      climbs={climbs}
      milestones={milestones}
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
      playsReceived={profile.total_plays_received}
      followerCount={profile.follower_count}
      followingCount={profile.following_count}
      streakCurrent={spine?.streak_current ?? 0}
      streakLongest={spine?.streak_longest ?? 0}
      streakLastActive={spine?.streak_last_active ?? null}
      groupsMastered={collection.groups_mastered}
      groupsTotal={collection.groups_total}
      eras={collection.eras}
      topGroups={topGroups}
      />
      {/* V-HARMONY-2B step 2 (owner ruling): the passport spans BOTH worlds. The
          same min-gated Verse cards the public /u/ passport shows - memberships +
          contribution graph + collection - now on the owner's own /me. Each
          returns null when the owner has none, so a Play-only fan sees no empty
          Verse boxes; no public visibility gate here (this is the owner's own
          view of their own data). */}
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SpaceMembershipsCard userId={user.id} />
        <ContributionGraph userId={user.id} />
        <PhotocardCollectionCard userId={user.id} />
      </div>
      <div style={{ marginTop: 18 }}>
        <ProfileTabs profileUsername={profile.username} initialQuizzes={createdQuizzes} creatorId={user.id} />
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
        <FanCardShare username={profile.username} />
      </div>
      <div style={{ marginTop: 14 }}>
        <PassportShare username={profile.username} />
      </div>
    </div>
  );
}
