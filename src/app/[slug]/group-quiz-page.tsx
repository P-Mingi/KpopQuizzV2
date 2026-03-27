import Link from 'next/link';

import { getQuizzesByGroup } from '@/lib/db/queries/quizzes';
import { getRelatedQuizzes } from '@/lib/db/queries/related-quizzes';
import { RELATED_GROUPS, RELATED_GROUP_NAMES } from '@/lib/related-groups';
import { GroupFeed } from '@/components/home/group-feed';
import { GroupLogo } from '@/components/ui/group-logo';
import { formatCount } from '@/lib/utils';

import type { Metadata } from 'next';
import type { Group } from '@/lib/db/types';

function generateDefaultIntro(group: Group): string {
  return `Think you're a real ${group.fandom_name}? Play ${group.quiz_count}+ free ${group.name} quizzes created by fans who actually know ${group.name}. From easy trivia to impossible deep-cut challenges - prove you deserve your fan card. ${group.total_plays.toLocaleString('en-US')} plays and counting.`;
}

export function generateGroupQuizMetadata(group: Group): Metadata {
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

export async function GroupQuizPage({ group }: { group: Group }): Promise<React.ReactElement> {
  const relatedSlugs = RELATED_GROUPS[group.slug] ?? [];

  const [initialQuizzes, relatedQuizzes] = await Promise.all([
    getQuizzesByGroup(group.id, 'popular', 0, 10),
    getRelatedQuizzes(relatedSlugs),
  ]);

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

      <Link
        href={`/${group.slug}-trivia`}
        className="inline-block mt-4 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        Want to learn before you play? Read {group.name} trivia &rarr;
      </Link>

      <GroupFeed groupId={group.id} initialQuizzes={initialQuizzes} />

      <div className="mt-6 text-center">
        <Link
          href={`/create?group=${group.slug}`}
          className="inline-block px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
        >
          Create a {group.name} quiz
        </Link>
      </div>

      {relatedQuizzes.length > 0 && (
        <section className="mt-12 pt-8 border-t border-[var(--border-light)]">
          <h2 className="text-base font-medium text-[var(--text-primary)] mb-4">
            Fans of {group.name} also play
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            {relatedQuizzes.map(quiz => (
              <Link
                key={quiz.id}
                href={`/q/${quiz.slug}`}
                className="flex-1 border border-[var(--border-light)] rounded-lg p-3 hover:border-[var(--border-medium)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  {quiz.group_logo_url && (
                    <img src={quiz.group_logo_url} alt="" className="w-5 h-5 rounded object-contain" />
                  )}
                  <span className="text-xs font-medium" style={{ color: quiz.group_text_color }}>
                    {quiz.group_name}
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {quiz.title}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                  {formatCount(quiz.play_count)} plays · {quiz.difficulty}
                </p>
              </Link>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            {relatedSlugs.map(slug => (
              <Link
                key={slug}
                href={`/${slug}-quiz`}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                All {RELATED_GROUP_NAMES[slug]} quizzes &rarr;
              </Link>
            ))}
          </div>
        </section>
      )}

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
