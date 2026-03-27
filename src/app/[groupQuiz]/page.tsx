import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getGroupBySlug } from '@/lib/db/queries/groups';
import { getQuizzesByGroup } from '@/lib/db/queries/quizzes';
import { GroupFeed } from '@/components/home/group-feed';
import { GroupLogo } from '@/components/ui/group-logo';
import { formatCount } from '@/lib/utils';

import type { Metadata } from 'next';
import type { Group } from '@/lib/db/types';

interface GroupQuizPageProps {
  params: Promise<{ groupQuiz: string }>;
}

const RESERVED_SLUGS = [
  'trending', 'new', 'most-liked', 'terms', 'privacy', 'login', 'settings',
  'admin', 'search', 'onboarding', 'banned', 'create', 'easy-kpop-quizzes',
  'hard-kpop-quizzes', 'kpop-quiz-2026', 'guess-the-kpop-idol', 'kpop-true-or-false',
];

export const revalidate = 60;

function generateDefaultIntro(group: Group): string {
  return `Think you're a real ${group.fandom_name}? Play ${group.quiz_count}+ free ${group.name} quizzes created by fans who actually know ${group.name}. From easy trivia to impossible deep-cut challenges - prove you deserve your fan card. ${group.total_plays.toLocaleString('en-US')} plays and counting.`;
}

export async function generateMetadata({ params }: GroupQuizPageProps): Promise<Metadata> {
  const { groupQuiz } = await params;

  if (RESERVED_SLUGS.includes(groupQuiz) || !groupQuiz.endsWith('-quiz')) return {};

  const groupSlug = groupQuiz.replace(/-quiz$/, '');
  const group = await getGroupBySlug(groupSlug);

  if (!group || group.quiz_count < 3) return {};

  const description = group.seo_intro
    || `Play ${group.quiz_count}+ free ${group.name} quizzes. Prove you're a real ${group.fandom_name}.`;

  return {
    title: `${group.name} Quiz - Test Your Knowledge`,
    description,
    alternates: { canonical: `/${group.slug}-quiz` },
    openGraph: {
      title: `${group.name} Quiz | KpopQuiz`,
      description: `${group.quiz_count}+ free ${group.name} quizzes. Can you pass them all?`,
      url: `https://kpopquiz.org/${group.slug}-quiz`,
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function GroupQuizPage({ params }: GroupQuizPageProps): Promise<React.ReactElement> {
  const { groupQuiz } = await params;

  if (RESERVED_SLUGS.includes(groupQuiz) || !groupQuiz.endsWith('-quiz')) {
    notFound();
  }

  const groupSlug = groupQuiz.replace(/-quiz$/, '');
  const group = await getGroupBySlug(groupSlug);

  if (!group || group.quiz_count < 3) {
    notFound();
  }

  const initialQuizzes = await getQuizzesByGroup(group.id, 'popular', 0, 10);
  const intro = group.seo_intro || generateDefaultIntro(group);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-txt-primary">
        {group.name} Quiz - Test How Well You Know {group.name}
      </h1>

      <p className="text-sm text-txt-secondary mt-2 leading-relaxed">{intro}</p>

      <div className="flex items-center gap-3 mt-4">
        <GroupLogo
          groupName={group.name}
          logoUrl={group.logo_url}
          displayColor={group.display_color}
          textColor={group.text_color}
          size={64}
        />
        <div>
          <p className="text-sm font-medium text-txt-primary">{group.name}</p>
          <p className="text-xs text-txt-secondary">
            {formatCount(group.quiz_count)} quizzes · {formatCount(group.total_plays)} total plays
          </p>
        </div>
      </div>

      <GroupFeed groupId={group.id} initialQuizzes={initialQuizzes} />

      <div className="mt-6 text-center">
        <Link
          href={`/create?group=${group.slug}`}
          className="inline-block px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
        >
          Create a {group.name} quiz
        </Link>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${group.name} Quizzes`,
            description: intro,
            url: `https://kpopquiz.org/${group.slug}-quiz`,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: group.quiz_count,
              itemListElement: initialQuizzes.slice(0, 10).map((q, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `https://kpopquiz.org/q/${q.slug}`,
                name: q.title,
              })),
            },
          }),
        }}
      />
    </div>
  );
}
