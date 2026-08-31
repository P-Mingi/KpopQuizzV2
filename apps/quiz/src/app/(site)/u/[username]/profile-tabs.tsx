'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { TabBar } from '@/components/ui/tab-bar';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';
import { QuizCard } from '@/components/quiz/quiz-card';

import type { QuizCardData } from '@/lib/db/types';

interface ProfileTabsProps {
  profileUsername: string;
  initialQuizzes: QuizCardData[];
  creatorId: string;
}

// Self-sufficient client island. Owner state + liked quizzes resolve client-side
// (via /api/auth/me + /api/quizzes/liked) so the parent /u/[username] page reads
// no cookies and stays static/ISR. The public Quizzes list is server-seeded.
export function ProfileTabs({ profileUsername, initialQuizzes, creatorId }: ProfileTabsProps): React.ReactElement {
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [likedQuizzes, setLikedQuizzes] = useState<QuizCardData[] | null>(null);
  const [activeTab, setActiveTab] = useState('Quizzes');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d: { profile: { username: string } | null }) => {
        if (cancelled) return;
        const owner = d.profile?.username === profileUsername;
        setIsOwnProfile(owner);
        if (owner) {
          fetch('/api/quizzes/liked', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : { quizzes: [] }))
            .then((j: { quizzes: QuizCardData[] }) => { if (!cancelled) setLikedQuizzes(j.quizzes ?? []); })
            .catch(() => { if (!cancelled) setLikedQuizzes([]); });
        }
      })
      .catch(() => { if (!cancelled) setIsOwnProfile(false); });
    return () => { cancelled = true; };
  }, [profileUsername]);

  const tabs = isOwnProfile ? ['Quizzes', 'Liked'] : ['Quizzes'];

  return (
    <div>
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'Quizzes' && (
        <>
          {initialQuizzes.length > 0 ? (
            <InfiniteQuizList
              initialQuizzes={initialQuizzes}
              fetchUrl={`/api/quizzes/user?creatorId=${creatorId}`}
              isOwner={isOwnProfile}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-secondary">No quizzes yet.</p>
              {isOwnProfile && (
                <Link href="/create" className="inline-block mt-4 px-6 py-3 rounded-full bg-btn text-white text-sm font-medium">
                  Create your first quiz
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'Liked' && isOwnProfile && (
        <>
          {likedQuizzes === null ? (
            <p className="text-sm text-secondary text-center py-8">Loading...</p>
          ) : likedQuizzes.length > 0 ? (
            <div className="space-y-3">
              {likedQuizzes.map((q) => (
                <QuizCard key={q.id} quiz={q} isLiked />
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary text-center py-8">No liked quizzes yet.</p>
          )}
        </>
      )}
    </div>
  );
}
