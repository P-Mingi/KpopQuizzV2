import { notFound } from 'next/navigation';

import { getProfileByUsername } from '@/lib/db/queries/profiles';
import { getLatestPersonalityMatch } from '@/lib/personality/data';
import { getQuizzesByCreator } from '@/lib/db/queries/quizzes';
import { createPublicReadClient } from '@/lib/supabase/server';
import { BadgeShelf } from '@/components/profile/badge-shelf';
import { ProfileTabs } from './profile-tabs';
import { PassportView, type PassportTopGroup } from '@/components/profile/passport-view';
import { ProfileOwnerControls } from '@/components/profile/profile-owner-controls';
import { ModNotifyButton } from '@/components/profile/mod-notify-button';
import { FanCardShare } from '@/components/profile/fan-card-share';
import { FollowButton } from '@/components/profile/follow-button';
import { safeFetch } from '@/lib/error-handling';
import { formatJoinDate } from '@/lib/utils';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { readPassportSpine, readPassportGroupStats, readCollectionProgress } from '@/lib/passport';
import { passportAccent } from '@/lib/passport-themes';

import type { Metadata } from 'next';
import type { BadgeDefinition, UserBadge } from '@/lib/db/types';

// ISR: this page is now fully cookie-free (no auth.getUser on the server), so it
// renders as STATIC/ISR (revalidate hourly) and is indexable. Owner-only bits
// (settings control, Liked tab) live in client islands that hit /api/auth/me,
// never inline server auth. The public passport is the harmonized profile basis.
export const revalidate = 3600;

const TOP_PRERENDER = 200;

// Prerender the indexable profiles (3+ quizzes, matching the metadata noindex
// gate + sitemap) as static HTML; every other username is on-demand ISR. Now
// that the page is cookie-free this flips the route from dynamic to SSG/ISR.
// Fail-soft: a saturated build DB falls back to [] (all on-demand) rather than
// failing the build.
export async function generateStaticParams(): Promise<Array<{ username: string }>> {
  try {
    const { createPublicReadClient } = await import('@/lib/supabase/server');
    const supabase = createPublicReadClient();
    const sentinel = Symbol('top-usernames-timeout');
    const raced = await Promise.race([
      supabase
        .from('profiles')
        .select('username')
        .gte('total_quizzes_created', 3)
        .order('total_quizzes_created', { ascending: false })
        .limit(TOP_PRERENDER),
      new Promise<typeof sentinel>((resolve) => setTimeout(() => resolve(sentinel), 10000)),
    ]);
    if (raced === sentinel) {
      console.warn('[u/[username]] generateStaticParams timed out - on-demand ISR only for this build');
      return [];
    }
    const data = (raced as { data: Array<{ username: string }> | null }).data;
    return (data ?? []).map((row) => ({ username: row.username }));
  } catch (err) {
    console.warn('[u/[username]] generateStaticParams failed:', (err as Error)?.message ?? err);
    return [];
  }
}

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await safeFetch(
    getProfileByUsername(username),
    null,
    '[u/[username] metadata] getProfileByUsername',
  );

  if (!profile) notFound();

  const displayName = profile.display_name ?? profile.username;
  const description = `${displayName}'s K-pop quizzes on KpopQuiz. ${profile.total_quizzes_created} quizzes created, ${profile.total_plays_received.toLocaleString('en-US')} total plays.`;

  return {
    title: `${displayName}'s K-pop Quizzes`,
    description,
    robots: profile.total_quizzes_created < 3 ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${displayName}'s K-pop Quizzes | KpopQuiz`,
      description,
      url: `/u/${username}`,
      type: 'profile',
      images: [{ url: `/api/og/passport/${username}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName}'s K-pop passport | KpopQuiz`,
      description,
      images: [`/api/og/passport/${username}`],
    },
    alternates: { canonical: `/u/${username}` },
  };
}

// Same column as the passport (M1.29): the tabs card must not out-span the
// profile stack on desktop.
const cardWrap: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 14, boxShadow: 'var(--shadow-card)', padding: 16, marginTop: 14,
  maxWidth: 520, marginLeft: 'auto', marginRight: 'auto',
};

export default async function ProfilePage({ params }: ProfilePageProps): Promise<React.ReactElement> {
  const { username } = await params;
  const profile = await safeFetch(getProfileByUsername(username), null, '[u/[username]] getProfileByUsername');
  if (!profile) notFound();

  // P step 6: show the "{member}-coded" flair only when the owner opted in.
  const personalityFlair = (profile as { show_personality_flair?: boolean }).show_personality_flair
    ? await safeFetch(getLatestPersonalityMatch(profile.id), null, '[u/[username]] getLatestPersonalityMatch')
    : null;

  const db = createPublicReadClient();

  const [spine, groupStats, collection, groupsRes, initialQuizzes, badgeDefsResult, userBadgesResult] = await Promise.all([
    readPassportSpine(db, profile.id),
    readPassportGroupStats(db, profile.id),
    readCollectionProgress(db, profile.id),
    Promise.resolve(db.from('groups').select('id, name, slug, logo_url, display_color')),
    safeFetch(getQuizzesByCreator(profile.id, 0, 10), [], '[u/[username]] getQuizzesByCreator'),
    safeFetch(Promise.resolve(db.from('badge_definitions').select('*').order('sort_order')), { data: null } as { data: unknown }, '[u/[username]] badge_definitions'),
    safeFetch(Promise.resolve(db.from('user_badges').select('badge_id, earned_at').eq('user_id', profile.id)), { data: null } as { data: unknown }, '[u/[username]] user_badges'),
  ]);

  const groupMeta = new Map<number, { name: string; logo: string | null; color: string }>();
  const bySlug = new Map<string, { name: string; color: string }>();
  for (const g of (groupsRes.data ?? []) as Array<{ id: number; name: string; slug: string; logo_url: string | null; display_color: string }>) {
    groupMeta.set(g.id, { name: g.name, logo: g.logo_url, color: g.display_color });
    bySlug.set(g.slug, { name: g.name, color: g.display_color });
  }

  // Identity (M1.6): theme accent + pinned ults (public).
  const accent = passportAccent(spine?.profile_theme);
  const ultGroups = (spine?.ult_groups ?? [])
    .map((slug) => { const g = bySlug.get(slug); return g ? { name: g.name, slug, color: g.color } : null; })
    .filter((x): x is { name: string; slug: string; color: string } => x !== null);

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

  const allBadges = (badgeDefsResult.data ?? []) as BadgeDefinition[];
  const earnedBadgeIds = ((userBadgesResult.data ?? []) as UserBadge[]).map((b) => b.badge_id);
  const badgeEarnedAt = Object.fromEntries(
    ((userBadgesResult.data ?? []) as UserBadge[]).map((b) => [b.badge_id, b.earned_at]),
  );
  const levelInfo = getLevelInfo(profile.xp);
  const levelTitle = getTitleForLevel(levelInfo.level);
  const nextTitle = levelInfo.xpForNextLevel !== null ? getTitleForLevel(levelInfo.level + 1) : null;
  const displayName = profile.display_name ?? profile.username;

  return (
    <div style={{ paddingTop: 16, paddingBottom: 32 }}>
      <PassportView
        mode="public"
        bio={profile.bio}
        accent={accent}
        bias={spine?.bias ?? null}
        personalityFlair={personalityFlair}
        stanSince={profile.stan_since ?? null}
        headerUrl={profile.header_url}
        ultGroups={ultGroups}
        username={profile.username}
        displayName={displayName}
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
        followSlot={<FollowButton profileUsername={profile.username} />}
        streakCurrent={spine?.streak_current ?? 0}
        streakLongest={spine?.streak_longest ?? 0}
        streakLastActive={spine?.streak_last_active ?? null}
        groupsMastered={collection.groups_mastered}
        groupsTotal={collection.groups_total}
        eras={collection.eras}
        topGroups={topGroups}
        headerSlot={<ProfileOwnerControls profileUsername={profile.username} />}
        nameAccent={profile.name_accent}
        pinnedBadgeId={profile.pinned_badge_id}
        avatarKind={(profile.avatar_kind as 'photo' | 'preset' | 'custom' | null) ?? 'photo'}
        avatarRef={profile.avatar_ref}
        badgesSlot={<BadgeShelf allBadges={allBadges} earnedBadgeIds={earnedBadgeIds} earnedAt={badgeEarnedAt} />}
      />

      {/* F2c: Share my Fan Card. Renders only for the owner viewing their own
          profile (self-check via /api/auth/me). */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
        <FanCardShare username={profile.username} />
      </div>

      {/* Moderator: send this user a personalized notification. Renders only for
          admins, and never on their own profile (self-check inside). */}
      <ModNotifyButton recipientUsername={profile.username} />

      {/* Quizzes / Liked tabs (kept; owner + liked resolve client-side) */}
      <div style={cardWrap}>
        <ProfileTabs profileUsername={profile.username} initialQuizzes={initialQuizzes} creatorId={profile.id} />
      </div>

      {/* BreadcrumbList structured data (kept) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpopquiz.org/' },
              { '@type': 'ListItem', position: 2, name: displayName, item: `https://kpopquiz.org/u/${profile.username}` },
            ],
          }),
        }}
      />

      {profile.total_quizzes_created >= 3 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ProfilePage',
              mainEntity: {
                '@type': 'Person',
                name: displayName,
                url: `https://kpopquiz.org/u/${profile.username}`,
                interactionStatistic: [{
                  '@type': 'InteractionCounter',
                  interactionType: 'https://schema.org/CreateAction',
                  userInteractionCount: profile.total_quizzes_created,
                }],
              },
            }),
          }}
        />
      )}
    </div>
  );
}
