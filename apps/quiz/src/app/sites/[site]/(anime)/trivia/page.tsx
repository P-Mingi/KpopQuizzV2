// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/trivia/page.tsx, rows 33: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { jsonLdString } from '@/lib/seo/json-ld';
import Link from 'next/link';

import { getTriviaEligibleGroups } from '@/lib/db/queries/trivia';
import { SeriesArt } from '@/components/anime/series-art';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { SITE } from '@/lib/site/registry';

import type { Metadata } from 'next';
import type { TriviaEligibleGroup } from '@/lib/db/queries/trivia';

// ISR: matches the group trivia pages (cookie-reading children force SSR today;
// this window stays dormant until those reads are made cookie-free).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Anime Trivia and Fun Facts',
  description:
    'Browse anime trivia and fun facts by series. Surprising facts about the characters, their music, and the records they broke, then test yourself with quizzes.',
  alternates: { canonical: '/trivia' },
  openGraph: {
    title: 'Anime Trivia and Fun Facts | OtakuQuiz',
    description: 'Surprising anime facts by series that even hardcore fans might not know.',
    url: `${SITE.url}/trivia`,
    siteName: 'OtakuQuiz',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
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
        <h1 className="trivia-hub-title">anime trivia and fun facts</h1>
        <p className="trivia-hub-intro">
          
          Surprising facts about your favorite anime series: their origins, characters, music, and
          records, all pulled from fan-made quizzes. Pick a series to dive in.
        </p>
      </header>

      {eligible.length > 0 ? (
        <ul className="trivia-hub-grid">
          {eligible.map(({ group, factCount }) => (
            <li key={group.id}>
              <Link href={`/${group.slug}-trivia`} className="trivia-hub-card">
                <span className="anime-o2-art-row" aria-hidden="true"><SeriesArt slug={group.slug} title={group.name} size="avatar" /></span>
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
          __html: jsonLdString({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Anime Trivia and Fun Facts',
            description: 'Anime trivia and fun facts by series on OtakuQuiz.',
            url: `${SITE.url}/trivia`,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: eligible.length,
              itemListElement: eligible.map(({ group }, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE.url}/${group.slug}-trivia`,
                name: `${group.name} Trivia`,
              })),
            },
          }),
        }}
      />
    </div>
  );
}
