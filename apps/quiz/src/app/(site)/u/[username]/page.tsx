import { jsonLdString } from '@/lib/seo/json-ld';
import { notFound } from 'next/navigation';

import { getProfileByUsername } from '@/lib/db/queries/profiles';
import { getQuizzesByCreator } from '@/lib/db/queries/quizzes';
import { createPublicReadClient } from '@/lib/supabase/server';
import { BadgeShelf } from '@/components/profile/badge-shelf';
import { ProfileTabs } from './profile-tabs';
import { PassportView, type PassportTopGroup } from '@/components/profile/passport-view';
import { ProfileOwnerControls } from '@/components/profile/profile-owner-controls';
import { ModNotifyButton } from '@/components/profile/mod-notify-button';
import { FanCardShare } from '@/components/profile/fan-card-share';
import { FollowButton } from '@/components/profile/follow-button';
import { formatJoinDate } from '@/lib/utils';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { readPassportSpine, readPassportGroupStats, readCollectionProgress } from '@/lib/passport';
import { passportAccent } from '@/lib/passport-themes';
import { READ_FAILED, failClosed, failedReads, read, readAll } from '@/lib/ux-v1/p3/reads';
import { UX_V1 } from '@/lib/ux-v1';

import type { Metadata } from 'next';
import type { BadgeDefinition, UserBadge } from '@/lib/db/types';

// ISR: this page is now fully cookie-free (no auth.getUser on the server), so it
// renders as STATIC/ISR (revalidate hourly) and is indexable. Owner-only bits
// (settings control, Liked tab) live in client islands that hit /api/auth/me,
// never inline server auth. The public passport is the harmonized profile basis.
export const revalidate = 3600;

// No profile is prerendered at build time (R1, F7). The passport reads of this
// page throw on a failed read, on purpose, so a failed read is never cached; at
// build time that turned one Supabase timeout into a failed build (three Vercel
// builds in a week, on /u/caratland, /u/mapple and /u/weflip). Every profile is
// now rendered on its first request and cached by ISR (revalidate above): the
// HTML is the same, a timeout costs one request instead of one deployment.
export async function generateStaticParams(): Promise<Array<{ username: string }>> {
  return [];
}

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

/**
 * The profile row, tried twice (owner, 2026-10-25: the bursts of reads after a deploy). A
 * profile that cannot be read throws: a database blip is never cached as a 404 on a real profile.
 */
async function profileOr404(username: string, label: string): Promise<NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>> {
  const { profile } = await readAll({ profile: () => read(getProfileByUsername(username), label) });
  if (profile === READ_FAILED) throw new Error(`[u/[username]] the profile of ${username} could not be read after a retry`);
  if (!profile) notFound();
  return profile;
}

/** A Supabase query whose error becomes a throw, so read() sees it as a failed read. */
function orThrow<T extends { error: { message: string } | null }>(label: string, q: PromiseLike<T>): Promise<T> {
  return Promise.resolve(q).then((r) => {
    if (r.error) throw new Error(`${label}: ${r.error.message}`);
    return r;
  });
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await profileOr404(username, '[u/[username] metadata] getProfileByUsername');

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

// Same 520 column as the passport stack. The tabs are NOT wrapped in their own
// padded card - that nested a padded card around the already-bordered quiz cards,
// insetting them 16px so they read as narrower/misaligned against the passport
// sections above. This is a plain column wrapper, so the quiz cards are siblings of
// the passport cards: identical width, edge-aligned.
const cardWrap: React.CSSProperties = {
  marginTop: 14, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto',
};

export default async function ProfilePage({ params }: ProfilePageProps): Promise<React.ReactElement> {
  const { username } = await params;
  const profile = await profileOr404(username, '[u/[username]] getProfileByUsername');

  const db = createPublicReadClient();

  // Every read is tried twice (reads.ts). One that still fails leaves its block out (never a
  // made-up zero) and the page is served with a 60 s revalidate instead of 1 h: never a 500.
  const got = await readAll({
    spine: () => read(readPassportSpine(db, profile.id), '[u/[username]] readPassportSpine'),
    groupStats: () => read(readPassportGroupStats(db, profile.id), '[u/[username]] readPassportGroupStats'),
    collection: () => read(readCollectionProgress(db, profile.id), '[u/[username]] readCollectionProgress'),
    groupsRes: () => read(orThrow('groups', db.from('groups').select('id, name, slug, logo_url, display_color')), '[u/[username]] groups'),
    initialQuizzes: () => read(getQuizzesByCreator(profile.id, 0, 10), '[u/[username]] getQuizzesByCreator'),
    badgeDefsResult: () => read(orThrow('badge_definitions', db.from('badge_definitions').select('*').order('sort_order')), '[u/[username]] badge_definitions'),
    userBadgesResult: () => read(orThrow('user_badges', db.from('user_badges').select('badge_id, earned_at').eq('user_id', profile.id)), '[u/[username]] user_badges'),
  });
  await failClosed(`/u/${username}`, failedReads(got));
  const spineFailed = got.spine === READ_FAILED;
  const collectionFailed = got.collection === READ_FAILED;
  // Without the group names a mastery row would read "Group 12": the block is left out too.
  const groupsFailed = got.groupsRes === READ_FAILED;
  // Earned badges without their definitions, or the reverse, would show every badge as not earned.
  const badgesFailed = got.badgeDefsResult === READ_FAILED || got.userBadgesResult === READ_FAILED;
  const ok = <T,>(v: T | typeof READ_FAILED, fallback: T): T => (v === READ_FAILED ? fallback : v);
  const spine = ok(got.spine, null);
  const groupStats = groupsFailed ? [] : ok(got.groupStats, []);
  const collection = ok(got.collection, { groups_mastered: 0, groups_total: 0, eras: [] });
  const groupRows = (ok(got.groupsRes, null)?.data ?? []) as Array<{ id: number; name: string; slug: string; logo_url: string | null; display_color: string }>;
  const initialQuizzes = ok(got.initialQuizzes, []);
  const badgeDefRows = badgesFailed ? [] : ((ok(got.badgeDefsResult, null)?.data ?? []) as BadgeDefinition[]);
  const userBadgeRows = badgesFailed ? [] : ((ok(got.userBadgesResult, null)?.data ?? []) as UserBadge[]);

  const groupMeta = new Map<number, { name: string; logo: string | null; color: string }>();
  const bySlug = new Map<string, { name: string; color: string }>();
  for (const g of groupRows) {
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

  const allBadges = badgeDefRows;
  const earnedBadgeIds = userBadgeRows.map((b) => b.badge_id);
  const badgeEarnedAt = Object.fromEntries(userBadgeRows.map((b) => [b.badge_id, b.earned_at]));
  const levelInfo = getLevelInfo(profile.xp);
  const levelTitle = getTitleForLevel(levelInfo.level);
  const nextTitle = levelInfo.xpForNextLevel !== null ? getTitleForLevel(levelInfo.level + 1) : null;
  const displayName = profile.display_name ?? profile.username;

  // BreadcrumbList + ProfilePage JSON-LD for the v11 render: a copy of the legacy
  // elements below (same JSON), so the flag-off tree stays untouched.
  const jsonLd = (): React.ReactElement => (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString({
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
            __html: jsonLdString({
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
    </>
  );

  // UX v11 (P10): the redesigned public passport. Same reads as above (cookie-free,
  // ISR), plus two read-only extras (main group fandom name + fandom war rank).
  // Owner-only controls resolve on the client (/api/auth/me), as today.
  if (UX_V1) {
    const [{ UxPassport }, { buildPassport }, { readFandomName, readWar, readTeamIdentity }] = await Promise.all([
      import('@/components/profile/ux-v1/passport'),
      import('@/lib/ux-v1/p10/build-passport'),
      import('@/lib/ux-v1/p10/passport-data'),
    ]);
    const main = spine?.ult_groups?.[0] ?? null;
    const fandomName = await readFandomName(db, main);
    const war = await readWar(main, fandomName);
    const props = buildPassport({
      mode: 'public',
      profile,
      spine,
      groupStats,
      collection,
      groups: groupRows,
      badgeDefs: allBadges,
      earnedBadgeIds,
      quizzes: initialQuizzes,
      fandomName,
      war,
      // v12 (G9 R2): null for everyone with the v12 flag off (no read) and until the
      // editorial accounts exist.
      team: await readTeamIdentity(profile.id),
      now: Date.now(),
    });
    // A stat whose read failed is left out rather than shown as 0.
    const stats = props.stats.filter((c) => !(spineFailed && c.label === 'streak') && !(collectionFailed && c.label === 'groups mastered'));
    return <UxPassport {...props} stats={stats} footer={<><ModNotifyButton recipientUsername={profile.username} />{jsonLd()}</>} />;
  }

  return (
    // One 520 column for the WHOLE profile (matches the passport). Every child -
    // passport, share card, and the Quizzes/Liked tabs - is edge-aligned to it, so
    // nothing reads wider or inset than the rest.
    <div style={{ paddingTop: 16, paddingBottom: 32, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
      <PassportView
        mode="public"
        bio={profile.bio}
        accent={accent}
        bias={spine?.bias ?? null}
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
          __html: jsonLdString({
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
            __html: jsonLdString({
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
