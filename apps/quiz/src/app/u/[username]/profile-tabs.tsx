'use client';

import { useState } from 'react';
import Link from 'next/link';

import { TabBar } from '@/components/ui/tab-bar';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';
import { QuizCard } from '@/components/quiz/quiz-card';

import type { QuizCardData } from '@/lib/db/types';

interface ProfileTabsProps {
  isOwnProfile: boolean;
  initialQuizzes: QuizCardData[];
  likedQuizzes: QuizCardData[];
  creatorId: string;
}

export function ProfileTabs({ isOwnProfile, initialQuizzes, likedQuizzes, creatorId }: ProfileTabsProps): React.ReactElement {
  const tabs = isOwnProfile ? ['Quizzes', 'Liked'] : ['Quizzes'];
  const [activeTab, setActiveTab] = useState('Quizzes');

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
              <p className="text-sm text-txt-secondary">No quizzes yet.</p>
              {isOwnProfile && (
                <Link
                  href="/create"
                  className="inline-block mt-4 px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
                >
                  Create your first quiz
                </Link>
              )}
            </div>
          )}
        </>
      )}


{activeTab === 'Liked' && (
        <>
          {likedQuizzes.length > 0 ? (
            <div className="space-y-3">
              {likedQuizzes.map((q) => (
                <QuizCard key={q.id} quiz={q} isLiked />
              ))}
            </div>
          ) : (
            <p className="text-sm text-txt-secondary text-center py-8">No liked quizzes yet.</p>
          )}
        </>
      )}
    </div>
  );
}
