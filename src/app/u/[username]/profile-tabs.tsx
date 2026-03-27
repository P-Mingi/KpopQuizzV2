'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { TabBar } from '@/components/ui/tab-bar';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';
import { QuizCard } from '@/components/quiz/quiz-card';
import { GameCard } from '@/components/game/game-card';

import type { QuizCardData, GameCardData } from '@/lib/db/types';

interface ProfileTabsProps {
  isOwnProfile: boolean;
  initialQuizzes: QuizCardData[];
  likedQuizzes: QuizCardData[];
  creatorId: string;
}

export function ProfileTabs({ isOwnProfile, initialQuizzes, likedQuizzes, creatorId }: ProfileTabsProps): React.ReactElement {
  const tabs = isOwnProfile ? ['Quizzes', 'Games', 'Liked'] : ['Quizzes', 'Games'];
  const [activeTab, setActiveTab] = useState('Quizzes');
  const [games, setGames] = useState<GameCardData[] | null>(null);
  const [gamesLoading, setGamesLoading] = useState(false);

  const fetchGames = useCallback(async () => {
    setGamesLoading(true);
    try {
      const res = await fetch(`/api/games/user?creatorId=${creatorId}`);
      if (res.ok) {
        const data: { games: GameCardData[] } = await res.json();
        setGames(data.games);
      }
    } catch { /* ignore */ }
    finally { setGamesLoading(false); }
  }, [creatorId]);

  useEffect(() => {
    if (activeTab === 'Games' && games === null) {
      fetchGames();
    }
  }, [activeTab, games, fetchGames]);

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

      {activeTab === 'Games' && (
        <>
          {gamesLoading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-border-light border-t-accent-pink rounded-full animate-spin" />
            </div>
          )}
          {!gamesLoading && (games ?? []).length > 0 && (
            <div className="space-y-3">
              {(games ?? []).map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
            </div>
          )}
          {!gamesLoading && games !== null && games.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-txt-secondary">No games yet.</p>
              {isOwnProfile && (
                <Link
                  href="/create?type=this_or_that"
                  className="inline-block mt-4 px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
                >
                  Create your first game
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
