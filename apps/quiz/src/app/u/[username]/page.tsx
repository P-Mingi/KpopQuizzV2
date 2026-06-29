import { notFound } from 'next/navigation';

import { getProfileByUsername } from '@/lib/db/queries/profiles';
import { getQuizzesByCreator } from '@/lib/db/queries/quizzes';
import { createPublicReadClient } from '@/lib/supabase/server';
import { BadgeGrid } from '@/components/ui/badge-grid';
import { ProfileTabs } from './profile-tabs';
import { PassportView, type PassportTopGroup } from '@/components/profile/passport-view';
import { ProfileOwnerControls } from '@/components/profile/profile-owner-controls';
import { safeFetch } from '@/lib/error-handling';
import { formatJoinDate } from '@/lib/utils';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { readPassportSpine, readPassportGroupStats, readCollectionProgress } from '@/lib/passport';

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
    },
    alternates: { canonical: `/u/${username}` },
  };
}

const cardWrap: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 14, boxShadow: 'var(--shadow-card)', padding: 16, marginTop: 14,
};

export default async function ProfilePage({ params }: ProfilePageProps): Promise<React.ReactElement> {
  const { username } = await params;
  const profile = await safeFetch(getProfileByUsername(username), null, '[u/[username]] getProfileByUsername');
  if (!profile) notFound();

  const db = createPublicReadClient();

  const [spine, groupStats, collection, groupsRes, initialQuizzes, badgeDefsResult, userBadgesResult] = await Promise.all([
    readPassportSpine(db, profile.id),
    readPassportGroupStats(db, profile.id),
    readCollectionProgress(db, profile.id),
    Promise.resolve(db.from('groups').select('id, name, logo_url, display_color')),
    safeFetch(getQuizzesByCreator(profile.id, 0, 10), [], '[u/[username]] getQuizzesByCreator'),
    safeFetch(Promise.resolve(db.from('badge_definitions').select('*').order('sort_order')), { data: null } as { data: unknown }, '[u/[username]] badge_definitions'),
    safeFetch(Promise.resolve(db.from('user_badges').select('badge_id, earned_at').eq('user_id', profile.id)), { data: null } as { data: unknown }, '[u/[username]] user_badges'),
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

  const allBadges = (badgeDefsResult.data ?? []) as BadgeDefinition[];
  const earnedBadgeIds = ((userBadgesResult.data ?? []) as UserBadge[]).map((b) => b.badge_id);
  const levelInfo = getLevelInfo(profile.xp);
  const levelTitle = getTitleForLevel(levelInfo.level);
  const nextTitle = levelInfo.xpForNextLevel !== null ? getTitleForLevel(levelInfo.level + 1) : null;
  const displayName = profile.display_name ?? profile.username;

  return (
    <div style={{ paddingBottom: 32 }}>
      <PassportView
        mode="public"
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
        streakCurrent={spine?.streak_current ?? 0}
        streakLongest={spine?.streak_longest ?? 0}
        groupsMastered={collection.groups_mastered}
        groupsTotal={collection.groups_total}
        eras={collection.eras}
        topGroups={topGroups}
        headerSlot={<ProfileOwnerControls profileUsername={profile.username} />}
      />

      {/* Badges (kept) */}
      {allBadges.length > 0 && (
        <div style={cardWrap}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Badges</h2>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)' }}>
              {earnedBadgeIds.length} of {allBadges.length}
            </span>
          </div>
          <BadgeGrid allBadges={allBadges} earnedBadgeIds={earnedBadgeIds} />
        </div>
      )}

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
