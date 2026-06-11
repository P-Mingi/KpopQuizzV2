import { getBrowseQuizzes, type BrowseSort } from '@/lib/db/queries/quizzes';
import { getAllGroups } from '@/lib/db/queries/groups';
import { BrowseQuizzes, type BrowseGroup, type SortKey, type TypeKey } from '@/components/quiz/browse-quizzes';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

// ISR: revalidate hourly (SEO Fix 1). This page already server-renders the quiz
// grid as crawlable HTML; the shared cookie-reading <TopNav> keeps it dynamic
// (SSR) today, so this window stays dormant until the nav goes cookie-free.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Browse K-pop Quizzes',
  description:
    'Browse every K-pop quiz on kpopquiz.org. Filter by group or quiz type, sort by trending, newest, or most played.',
  openGraph: {
    title: 'Browse K-pop Quizzes | KpopQuiz',
    description: 'Every K-pop quiz, filtered and sorted your way.',
    url: '/quizzes',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/quizzes' },
};

const PAGE_SIZE = 48;

const SORT_KEYS: SortKey[] = ['all', 'trending', 'newest', 'most_played', 'top_rated'];
const TYPE_KEYS: TypeKey[] = ['classic', 'image', 'intruder', 'tf', 'clue'];

/** UI sort key → server BrowseSort ('all' = all-time popular default). */
function sortToBrowse(s: SortKey): BrowseSort {
  switch (s) {
    case 'newest': return 'new';
    case 'all': return 'most_played';
    case 'trending': return 'trending';
    case 'most_played': return 'most_played';
    case 'top_rated': return 'top_rated';
  }
}

/** UI type key → DB quiz_type. */
function typeToDb(t: TypeKey): string {
  switch (t) {
    case 'classic': return 'multiple_choice';
    case 'image': return 'image';
    case 'intruder': return 'intruder';
    case 'tf': return 'true_false';
    case 'clue': return 'guess_from_clues';
  }
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BrowseQuizzesPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  const sp = await searchParams;

  const groups = await safeFetch(getAllGroups(), [], '[browse] getAllGroups');

  // Resolve & validate filters from the URL.
  const groupSlug = first(sp.group) ?? null;
  const groupOption = groupSlug ? groups.find((g) => g.slug === groupSlug) ?? null : null;
  const resolvedGroup = groupOption ? groupSlug : null; // unknown slug → no filter

  const typeParam = first(sp.type) as TypeKey | undefined;
  const initialType: TypeKey | null = typeParam && TYPE_KEYS.includes(typeParam) ? typeParam : null;

  const sortParam = first(sp.sort) as SortKey | undefined;
  // Default = "All" (all-time popular) so group/type filters never land on an
  // empty grid the way last-30-days "Trending" would.
  const initialSort: SortKey = sortParam && SORT_KEYS.includes(sortParam) ? sortParam : 'all';

  const initialQuizzes = await safeFetch(
    getBrowseQuizzes({
      groupId: groupOption?.id ?? null,
      quizType: initialType ? typeToDb(initialType) : null,
      sort: sortToBrowse(initialSort),
      offset: 0,
      limit: PAGE_SIZE,
    }),
    [],
    '[browse] getBrowseQuizzes',
  );

  const groupsForFilter: BrowseGroup[] = groups
    .filter((g) => g.quiz_count > 0)
    .slice(0, 40)
    .map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      logo_url: g.logo_url,
      display_color: g.display_color,
      text_color: g.text_color,
    }));

  return (
    <div className="pt-4 md:pt-6 pb-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Browse All Quizzes' },
        ]}
      />

      {/* §3a — page header (matches the home hero's type treatment) */}
      <header style={{ margin: '4px 0' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0, color: 'var(--txt1)' }}>
          Browse <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--brand)' }}>quizzes</span>
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: 'var(--txt2)' }}>
          Filter by group, type, or sort however you like.
        </p>
      </header>

      <BrowseQuizzes
        initialQuizzes={initialQuizzes}
        groups={groupsForFilter}
        initialGroup={resolvedGroup}
        initialType={initialType}
        initialSort={initialSort}
      />
    </div>
  );
}
