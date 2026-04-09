import { notFound } from 'next/navigation';

import { getProfileByUsername } from '@/lib/db/queries/profiles';
import { getQuizzesByCreator } from '@/lib/db/queries/quizzes';
import { createServerClient } from '@/lib/supabase/server';
import { UserAvatar } from '@/components/ui/user-avatar';
import { LevelBadge } from '@/components/ui/level-badge';
import { XpProgress } from '@/components/ui/xp-progress';
import { BadgeGrid } from '@/components/ui/badge-grid';
import { NotificationsStrip } from '@/components/profile/notifications-strip';
import { ProfileTabs } from './profile-tabs';
import { formatCount, formatJoinDate } from '@/lib/utils';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';

import type { Metadata } from 'next';
import type { BadgeDefinition, UserBadge, QuizCardData } from '@/lib/db/types';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) return { title: 'User Not Found' };

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

interface LikedQuizRow {
  created_at: string;
  quizzes: {
    id: string;
    title: string;
    slug: string;
    quiz_type: string;
    difficulty: string;
    play_count: number;
    total_score_sum: number;
    total_completions: number;
    like_count: number;
    created_at: string;
    questions?: unknown[];
    groups: { name: string; slug: string; display_color: string; text_color: string; fandom_name: string; logo_url: string | null };
    profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string };
  };
}

function toLikedQuizCardData(row: LikedQuizRow): QuizCardData {
  const q = row.quizzes;
  const g = q.groups;
  const p = q.profiles;
  return {
    id: q.id,
    title: q.title,
    slug: q.slug,
    quiz_type: q.quiz_type as QuizCardData['quiz_type'],
    difficulty: q.difficulty as QuizCardData['difficulty'],
    play_count: q.play_count,
    total_score_sum: q.total_score_sum,
    total_completions: q.total_completions,
    like_count: q.like_count ?? 0,
    created_at: q.created_at,
    group_name: g.name,
    group_slug: g.slug,
    display_color: g.display_color,
    text_color: g.text_color,
    logo_url: g.logo_url,
    fandom_name: g.fandom_name,
    creator_username: p.username,
    creator_avatar_url: p.avatar_url,
    creator_avatar_bg: p.avatar_bg,
    creator_avatar_text: p.avatar_text,
    question_count: Array.isArray(q.questions) ? q.questions.length : 0,
    cover_image_url: (q as Record<string, unknown>).cover_image_url as string | null ?? null,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps): Promise<React.ReactElement> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) notFound();

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  // Fetch data in parallel
  const [initialQuizzes, badgeDefsResult, userBadgesResult, likedQuizzesResult] = await Promise.all([
    getQuizzesByCreator(profile.id, 0, 10),
    supabase.from('badge_definitions').select('*').order('sort_order'),
    supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', profile.id),
    isOwnProfile
      ? supabase
          .from('likes')
          .select(`
            created_at,
            quizzes!inner (
              id, title, slug, quiz_type, difficulty, play_count, total_score_sum, total_completions, like_count, created_at, questions,
              groups!inner (name, slug, display_color, text_color, fandom_name, logo_url),
              profiles!inner (username, avatar_url, avatar_bg, avatar_text)
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const allBadges = (badgeDefsResult.data ?? []) as BadgeDefinition[];
  const earnedBadgeIds = ((userBadgesResult.data ?? []) as UserBadge[]).map(b => b.badge_id);
  const likedQuizzes = ((likedQuizzesResult.data ?? []) as unknown as LikedQuizRow[]).map(toLikedQuizCardData);
  const levelInfo = getLevelInfo(profile.xp);

  const displayName = profile.display_name ?? profile.username;

  return (
    <div className="py-6">
      {isOwnProfile && <NotificationsStrip />}

      <UserAvatar
        username={profile.username}
        avatarUrl={profile.avatar_url}
        bgColor={profile.avatar_bg}
        textColor={profile.avatar_text}
        size={64}
      />

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <h1 className="text-xl font-medium text-primary">{displayName}</h1>
        <LevelBadge level={levelInfo.level} size="sm" />
      </div>
      <p className="text-sm text-secondary">
        @{profile.username}
        <span className="text-ghost">
          {' '}&middot; Level {levelInfo.level} &middot; {getTitleForLevel(levelInfo.level).en} ({getTitleForLevel(levelInfo.level).kr})
        </span>
      </p>

      {profile.bio && (
        <p className="text-sm mt-2 max-w-md text-primary">{profile.bio}</p>
      )}

      {/* XP Progress */}
      {(isOwnProfile || profile.xp > 0) && (
        <div className="mt-4">
          <XpProgress xp={profile.xp} />
        </div>
      )}

      {/* Stats row */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ghost mt-6 mb-2">
        Stan stats
      </p>
      <div className="flex gap-4 flex-wrap">
        <p className="text-sm">
          <span className="font-medium text-primary">{formatCount(profile.total_quizzes_created)}</span>{' '}
          <span className="text-secondary">quizzes</span>
        </p>
        <p className="text-sm">
          <span className="font-medium text-primary">{formatCount(profile.total_plays_received)}</span>{' '}
          <span className="text-secondary">plays</span>
        </p>
        <p className="text-sm">
          <span className="font-medium text-primary">{formatCount(profile.xp)}</span>{' '}
          <span className="text-secondary">XP</span>
        </p>
        <p className="text-sm">
          <span className="font-medium text-primary">{formatCount(profile.total_likes_received)}</span>{' '}
          <span className="text-secondary">likes received</span>
        </p>
        <p className="text-sm">
          <span className="text-secondary">Joined {formatJoinDate(profile.created_at)}</span>
        </p>
      </div>

      {/* Badges */}
      {allBadges.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-primary mb-2">Badges</p>
          <BadgeGrid allBadges={allBadges} earnedBadgeIds={earnedBadgeIds} />
        </div>
      )}

      {/* Quizzes / Liked tabs */}
      <div className="border-t border-default mt-6 pt-6">
        <ProfileTabs
          isOwnProfile={isOwnProfile}
          initialQuizzes={initialQuizzes}
          likedQuizzes={likedQuizzes}
          creatorId={profile.id}
        />
      </div>

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
                interactionStatistic: [
                  {
                    '@type': 'InteractionCounter',
                    interactionType: 'https://schema.org/CreateAction',
                    userInteractionCount: profile.total_quizzes_created,
                  },
                ],
              },
            }),
          }}
        />
      )}
    </div>
  );
}
