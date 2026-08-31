import Link from 'next/link';

import { getTriviaEligibleGroups } from '@/lib/db/queries/trivia';
import { GroupLogo } from '@/components/ui/group-logo';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { TriviaEligibleGroup } from '@/lib/db/queries/trivia';

// ISR: matches the group trivia pages (cookie-reading children force SSR today;
// this window stays dormant until those reads are made cookie-free).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'K-pop Trivia and Fun Facts',
  description:
    'Browse K-pop trivia and fun facts by group. Surprising facts about the idols, their music, and the records they broke, then test yourself with quizzes.',
  alternates: { canonical: '/trivia' },
  openGraph: {
    title: 'K-pop Trivia and Fun Facts | KpopQuiz',
    description: 'Surprising K-pop facts by group that even hardcore fans might not know.',
    url: 'https://kpopquiz.org/trivia',
    siteName: 'KpopQuiz',
    type: 'website',
  },
};

export default async function TriviaHubPage(): Promise<React.ReactElement> {
  const eligible = await safeFetch(
    getTriviaEligibleGroups(),
    [] as TriviaEligibleGroup[],
    '[trivia-hub] getTriviaEligibleGroups',
  );

  return (
    <div className="trivia-hub">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Trivia' }]} />

      <header className="trivia-hub-head">
        <h1 className="trivia-hub-title">K-pop trivia and fun facts</h1>
        <p className="trivia-hub-intro">
          Surprising facts about your favorite K-pop groups: their origins, members, music, and
          records, all pulled from fan-made quizzes. Pick a group to dive in.
        </p>
      </header>

      {eligible.length > 0 ? (
        <ul className="trivia-hub-grid">
          {eligible.map(({ group, factCount }) => (
            <li key={group.id}>
              <Link href={`/${group.slug}-trivia`} className="trivia-hub-card">
                <GroupLogo
                  groupName={group.name}
                  logoUrl={group.logo_url}
                  displayColor={group.display_color}
                  textColor={group.text_color}
                  size={40}
                />
                <div className="trivia-hub-card-body">
                  <p className="trivia-hub-card-name">{group.name}</p>
                  <p className="trivia-hub-card-meta">{factCount} fun facts</p>
                </div>
                <svg
                  className="trivia-hub-card-arrow"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="trivia-hub-intro" style={{ marginTop: 24 }}>
          Trivia pages are coming soon. Check back shortly.
        </p>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'K-pop Trivia and Fun Facts',
            description: 'K-pop trivia and fun facts by group on KpopQuiz.',
            url: 'https://kpopquiz.org/trivia',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: eligible.length,
              itemListElement: eligible.map(({ group }, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `https://kpopquiz.org/${group.slug}-trivia`,
                name: `${group.name} Trivia`,
              })),
            },
          }),
        }}
      />
    </div>
  );
}
