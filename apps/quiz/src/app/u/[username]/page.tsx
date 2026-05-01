import { notFound } from 'next/navigation';

import { getProfileByUsername } from '@/lib/db/queries/profiles';
import { getQuizzesByCreator } from '@/lib/db/queries/quizzes';
import { createServerClient } from '@/lib/supabase/server';
import { UserAvatar } from '@/components/ui/user-avatar';
import { BadgeGrid } from '@/components/ui/badge-grid';
import { NotificationsStrip } from '@/components/profile/notifications-strip';
import { ProfileTabs } from './profile-tabs';
import { safeFetch } from '@/lib/error-handling';
import { formatCount, formatJoinDate } from '@/lib/utils';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { getByeolBalance } from '@/lib/byeol';
import Link from 'next/link';

import type { Metadata } from 'next';
import type { BadgeDefinition, UserBadge, QuizCardData } from '@/lib/db/types';

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
    id: q.id, title: q.title, slug: q.slug,
    quiz_type: q.quiz_type as QuizCardData['quiz_type'],
    difficulty: q.difficulty as QuizCardData['difficulty'],
    play_count: q.play_count, total_score_sum: q.total_score_sum,
    total_completions: q.total_completions, like_count: q.like_count ?? 0,
    created_at: q.created_at, group_name: g.name, group_slug: g.slug,
    display_color: g.display_color, text_color: g.text_color, logo_url: g.logo_url,
    fandom_name: g.fandom_name, creator_username: p.username,
    creator_avatar_url: p.avatar_url, creator_avatar_bg: p.avatar_bg,
    creator_avatar_text: p.avatar_text,
    question_count: Array.isArray(q.questions) ? q.questions.length : 0,
    cover_image_url: (q as Record<string, unknown>).cover_image_url as string | null ?? null,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps): Promise<React.ReactElement> {
  const { username } = await params;
  const profile = await safeFetch(getProfileByUsername(username), null, '[u/[username]] getProfileByUsername');
  if (!profile) notFound();

  const supabase = await createServerClient();
  let authUserId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    authUserId = data?.user?.id ?? null;
  } catch { /* ignore */ }
  const isOwnProfile = authUserId === profile.id;

  const [initialQuizzes, badgeDefsResult, userBadgesResult, likedQuizzesResult, byeol] = await Promise.all([
    safeFetch(getQuizzesByCreator(profile.id, 0, 10), [], '[u/[username]] getQuizzesByCreator'),
    safeFetch(
      Promise.resolve(supabase.from('badge_definitions').select('*').order('sort_order')),
      { data: null } as { data: unknown }, '[u/[username]] badge_definitions',
    ),
    safeFetch(
      Promise.resolve(supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', profile.id)),
      { data: null } as { data: unknown }, '[u/[username]] user_badges',
    ),
    isOwnProfile
      ? safeFetch(
          Promise.resolve(
            supabase.from('likes').select(`
              created_at,
              quizzes!inner (
                id, title, slug, quiz_type, difficulty, play_count, total_score_sum, total_completions, like_count, created_at, questions,
                groups!inner (name, slug, display_color, text_color, fandom_name, logo_url),
                profiles!inner (username, avatar_url, avatar_bg, avatar_text)
              )
            `).eq('user_id', profile.id).order('created_at', { ascending: false }),
          ),
          { data: null } as { data: unknown }, '[u/[username]] likes',
        )
      : Promise.resolve({ data: null }),
    isOwnProfile ? getByeolBalance(profile.id) : Promise.resolve(0),
  ]);

  const allBadges = (badgeDefsResult.data ?? []) as BadgeDefinition[];
  const earnedBadgeIds = ((userBadgesResult.data ?? []) as UserBadge[]).map(b => b.badge_id);
  const likedQuizzes = ((likedQuizzesResult.data ?? []) as unknown as LikedQuizRow[]).map(toLikedQuizCardData);
  const levelInfo = getLevelInfo(profile.xp);
  const levelTitle = getTitleForLevel(levelInfo.level);
  const displayName = profile.display_name ?? profile.username;
  const xpPct = levelInfo.progress;

  return (
    <div style={{ paddingTop: 16, paddingBottom: 32 }}>
      {isOwnProfile && <NotificationsStrip />}

      {/* Header: avatar + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <UserAvatar
          username={profile.username}
          avatarUrl={profile.avatar_url}
          bgColor={profile.avatar_bg}
          textColor={profile.avatar_text}
          size={72}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: 2,
          }}>
            Lv {levelInfo.level} {'\u00B7'} {levelTitle.en}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
            {displayName}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            @{profile.username} {'\u00B7'} Joined {formatJoinDate(profile.created_at)}
          </div>
        </div>
        {isOwnProfile && (
          <Link href="/settings" style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: 'var(--text-primary)',
          }} aria-label="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </Link>
        )}
      </div>

      {profile.bio && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px', maxWidth: 480, lineHeight: 1.5 }}>
          {profile.bio}
        </p>
      )}

      {/* Byeol + XP card */}
      {isOwnProfile && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: 'var(--shadow-card)',
          padding: 16, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" aria-hidden="true">
                <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{byeol.toLocaleString()} byeol</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)' }}>
              {profile.xp} / {levelInfo.xpForNextLevel ?? '---'} XP
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 9999, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{ width: `${xpPct}%`, height: '100%', borderRadius: 9999, background: 'var(--accent)', transition: 'width 400ms ease' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
            Next: <strong style={{ color: 'var(--text-primary)' }}>Lv {levelInfo.level + 1} {'\u00B7'} {getTitleForLevel(levelInfo.level + 1).en}</strong>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: 'var(--shadow-card)',
        padding: 16, marginBottom: 14,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <ProfileStat label="Played" value={formatCount(profile.total_plays_received)} />
          <ProfileStat label="Created" value={String(profile.total_quizzes_created)} />
          <ProfileStat label="Likes" value={formatCount(profile.total_likes_received)} accent />
          <ProfileStat label="XP" value={formatCount(profile.xp)} />
          <ProfileStat label="Level" value={String(levelInfo.level)} />
          <ProfileStat label="Joined" value={formatJoinDate(profile.created_at)} small />
        </div>
      </div>

      {/* Badges */}
      {allBadges.length > 0 && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: 'var(--shadow-card)',
          padding: 16, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Badges</h2>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)' }}>
              {earnedBadgeIds.length} of {allBadges.length}
            </span>
          </div>
          <BadgeGrid allBadges={allBadges} earnedBadgeIds={earnedBadgeIds} />
        </div>
      )}

      {/* Quizzes / Liked tabs */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: 'var(--shadow-card)',
        padding: 16,
      }}>
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

function ProfileStat({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div>
      <div style={{
        fontSize: small ? 13 : 18, fontWeight: 800, letterSpacing: '-0.02em',
        color: accent ? 'var(--accent)' : 'var(--text-primary)',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      <div style={{
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginTop: 2,
      }}>{label}</div>
    </div>
  );
}
