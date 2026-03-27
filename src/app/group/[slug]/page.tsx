import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getGroupBySlug } from '@/lib/db/queries/groups';
import { getQuizzesByGroup } from '@/lib/db/queries/quizzes';
import { GroupFeed } from '@/components/home/group-feed';
import { formatCount } from '@/lib/utils';

import type { Metadata } from 'next';

interface GroupPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);

  if (!group) return { title: 'Group Not Found' };

  const description = `Play ${group.quiz_count}+ ${group.name} quizzes created by real fans. Test how well you really know ${group.name}. ${group.total_plays.toLocaleString('en-US')} plays and counting.`;

  return {
    title: `${group.name} Quizzes - Test Your Knowledge`,
    description,
    openGraph: {
      title: `${group.name} Quizzes | KpopQuizz`,
      description,
      url: `/group/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${group.name} Quizzes | KpopQuizz`,
      description,
    },
    alternates: { canonical: `/group/${slug}` },
  };
}

export default async function GroupPage({ params }: GroupPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);

  if (!group) notFound();

  const initialQuizzes = await getQuizzesByGroup(group.id, 'popular', 0, 10);

  // Empty state
  if (group.quiz_count === 0) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-medium text-txt-primary">{group.name} quizzes</h1>
        <div className="text-center py-12">
          <p className="text-base text-txt-secondary">No quizzes yet for {group.name}.</p>
          <p className="text-sm text-txt-secondary mt-1">Be the first to create one!</p>
          <Link
            href={`/create?group=${group.slug}`}
            className="inline-block mt-4 px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
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
              description: `Play ${group.name} quizzes created by real fans.`,
            }),
          }}
        />
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-txt-primary">{group.name} quizzes</h1>
      <p className="text-sm text-txt-secondary mt-1">
        {formatCount(group.quiz_count)} quizzes · {formatCount(group.total_plays)} total plays
      </p>

      <GroupFeed groupId={group.id} initialQuizzes={initialQuizzes} />

      <div className="mt-6 text-center">
        <p className="text-sm text-txt-secondary">Want to add a quiz?</p>
        <Link
          href={`/create?group=${group.slug}`}
          className="inline-block mt-2 px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
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
            description: `Play ${group.quiz_count}+ ${group.name} quizzes created by real fans.`,
            url: `https://kpopquizz.com/group/${group.slug}`,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: group.quiz_count,
              itemListElement: initialQuizzes.slice(0, 10).map((q, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `https://kpopquizz.com/q/${q.slug}`,
                name: q.title,
              })),
            },
          }),
        }}
      />
    </div>
  );
}
