'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

import { TabBar } from '@/components/ui/tab-bar';
import { QuizCard } from '@/components/quiz/quiz-card';
import { Spinner } from '@/components/ui/spinner';

import type { QuizCardData } from '@/lib/db/types';

interface GroupForGrid {
  id: number;
  name: string;
  slug: string;
  display_color: string;
  text_color: string;
  quiz_count: number;
}

interface QuizFeedProps {
  initialQuizzes: QuizCardData[];
  groups: GroupForGrid[];
}

const TABS = ['Trending', 'New', 'Most liked', 'Hardest', 'By group'] as const;
const HOMEPAGE_LIMIT = 15;

type TabKey = 'trending' | 'new' | 'most_liked' | 'hardest';

function tabToKey(tab: string): TabKey {
  if (tab === 'New') return 'new';
  if (tab === 'Most liked') return 'most_liked';
  if (tab === 'Hardest') return 'hardest';
  return 'trending';
}

function tabToPath(tab: string): string {
  if (tab === 'New') return '/new';
  if (tab === 'Most liked') return '/most-liked';
  if (tab === 'Hardest') return '/trending'; // no dedicated hardest page, use trending
  return '/trending';
}

function tabToLabel(tab: string): string {
  if (tab === 'New') return 'new';
  if (tab === 'Most liked') return 'most liked';
  if (tab === 'Hardest') return 'hardest';
  return 'trending';
}

export function QuizFeed({ initialQuizzes, groups }: QuizFeedProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState('Trending');
  const [quizzesByTab, setQuizzesByTab] = useState<Record<string, QuizCardData[]>>({
    trending: initialQuizzes,
  });
  const [loading, setLoading] = useState(false);

  const isGroupTab = activeTab === 'By group';
  const tabKey = tabToKey(activeTab);
  const quizzes = quizzesByTab[tabKey] ?? [];

  const fetchQuizzes = useCallback(async (tab: TabKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quizzes?tab=${tab}&offset=0&limit=${HOMEPAGE_LIMIT}`);
      if (!res.ok) throw new Error('Failed to load quizzes');
      const data: { quizzes: QuizCardData[] } = await res.json();

      setQuizzesByTab((prev) => ({
        ...prev,
        [tab]: data.quizzes,
      }));
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'By group') return;

    const key = tabToKey(tab);
    if (quizzesByTab[key] === undefined) {
      fetchQuizzes(key);
    }
  }, [quizzesByTab, fetchQuizzes]);

  return (
    <div>
      <TabBar
        tabs={[...TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {isGroupTab ? (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/group/${g.slug}`}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: g.display_color, color: g.text_color }}
            >
              {g.name} ({g.quiz_count})
            </Link>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {quizzes.map((q) => (
              <QuizCard key={q.id} quiz={q} />
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          )}

          {!loading && quizzes.length === 0 && (
            <p className="text-sm text-txt-secondary text-center py-8">No quizzes yet.</p>
          )}

          {!loading && quizzes.length > 0 && (
            <div className="text-center mt-4 mb-2">
              <Link
                href={tabToPath(activeTab)}
                className="inline-block px-6 py-2.5 rounded-full border border-border-light text-sm font-medium hover:border-border-medium transition-colors"
              >
                See all {tabToLabel(activeTab)} quizzes
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
