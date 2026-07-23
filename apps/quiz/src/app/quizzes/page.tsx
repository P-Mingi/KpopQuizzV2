import { getBrowseQuizzes, getLanguageCounts, type BrowseSort } from '@/lib/db/queries/quizzes';
import { isLanguage } from '@/lib/languages';
import { getAllGroups } from '@/lib/db/queries/groups';
import { BrowseQuizzes, type BrowseGroup, type SortKey, type TypeKey } from '@/components/quiz/browse-quizzes';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

// ISR: revalidate hourly (SEO Fix 1). This page already server-renders the quiz
// grid as crawlable HTML; the shared cookie-reading <TopNav> keeps it dynamic
// (SSR) today, so this window stays dormant until the nav goes cookie-free.
export const revalidate = 3600;

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> },
): Promise<Metadata> {
  const sp = await searchParams;

  // Faceted URL strategy: only single-group is the indexable facet.
  // /quizzes and /quizzes?group=<valid> self-canonical and stay indexable.
  // Everything else (sort, type, multi-param combos, search) canonicals to
  // base /quizzes and gets noindex,follow.
  const groupSlug = first(sp.group);
  const hasType = first(sp.type) != null;
  const hasSort = first(sp.sort) != null;
  const hasSearch = first(sp.search) != null;
  const pageNum = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);

  let validGroup = false;
  if (groupSlug && !hasType && !hasSort && !hasSearch) {
    const groups = await safeFetch(getAllGroups(), [], '[browse meta] getAllGroups');
    validGroup = groups.some((g) => g.slug === groupSlug);
  }

  const isIndexable = !hasType && !hasSort && !hasSearch && (!groupSlug || validGroup);

  const canonicalParams = new URLSearchParams();
  if (validGroup) canonicalParams.set('group', groupSlug!);
  if (isIndexable && pageNum > 1) canonicalParams.set('page', String(pageNum));
  const qs = canonicalParams.toString();
  const canonical = qs ? `/quizzes?${qs}` : '/quizzes';

  return {
    title: 'Browse K-pop Quizzes',
    description:
      'Browse every K-pop quiz on kpopquiz.org. Filter by group or quiz type, sort by trending, newest, or most played.',
    openGraph: {
      title: 'Browse K-pop Quizzes | KpopQuiz',
      description: 'Every K-pop quiz, filtered and sorted your way.',
      url: canonical,
    },
    twitter: { card: 'summary_large_image' },
    alternates: {
      canonical,
      ...(canonical === '/quizzes' ? {
        languages: {
          en: '/quizzes',
          'pt-BR': '/pt/quizzes',
          'x-default': '/quizzes',
        },
      } : {}),
    },
    ...(isIndexable ? {} : { robots: { index: false, follow: true } }),
  };
}

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

  // Q-B2: language filter. Only real languages are offered; an unknown ?lang is ignored.
  const langParam = first(sp.lang);
  const languageCounts = await safeFetch(getLanguageCounts(), [], '[browse] getLanguageCounts');
  const initialLanguage =
    langParam && isLanguage(langParam) && languageCounts.some((lc) => lc.language === langParam)
      ? langParam
      : null;

  const initialQuizzes = await safeFetch(
    getBrowseQuizzes({
      groupId: groupOption?.id ?? null,
      quizType: initialType ? typeToDb(initialType) : null,
      language: initialLanguage,
      sort: sortToBrowse(initialSort),
      offset: 0,
      limit: PAGE_SIZE,
    }),
    [],
    '[browse] getBrowseQuizzes',
  );

  // SEO Fix 3 - crawlable pagination. `?page=N` server-renders that page's quiz
  // links in a <noscript> block (humans keep the JS "load more" above); crawlers
  // walk page 1 → 2 → … via real <a href> anchors + rel=next/prev.
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  const pageQuizzes = page === 1
    ? initialQuizzes
    : await safeFetch(
        getBrowseQuizzes({
          groupId: groupOption?.id ?? null,
          quizType: initialType ? typeToDb(initialType) : null,
          language: initialLanguage,
          sort: sortToBrowse(initialSort),
          offset: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        }),
        [],
        '[browse] page slice',
      );
  const hasPrevPage = page > 1;
  const hasNextPage = pageQuizzes.length >= PAGE_SIZE;
  const pageHref = (n: number): string => {
    const p = new URLSearchParams();
    if (resolvedGroup) p.set('group', resolvedGroup);
    if (initialType) p.set('type', initialType);
    if (initialLanguage) p.set('lang', initialLanguage);
    if (initialSort !== 'all') p.set('sort', initialSort);
    if (n > 1) p.set('page', String(n));
    const qs = p.toString();
    return qs ? `/quizzes?${qs}` : '/quizzes';
  };

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

      {/* §3a - page header (matches the home hero's type treatment) */}
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
        languageCounts={languageCounts}
        initialGroup={resolvedGroup}
        initialType={initialType}
        initialLanguage={initialLanguage}
        initialSort={initialSort}
      />

      {/* SEO Fix 3 - crawlable page anchors for bots / no-JS (humans use "load more"). */}
      <noscript>
        <nav className="crawl-pagination" aria-label="Quiz pages">
          <ul>
            {pageQuizzes.map((q) => (
              <li key={q.id}>
                <a href={`/q/${q.slug}`}>{q.title}</a>
              </li>
            ))}
          </ul>
          <p>
            {hasPrevPage && (
              <a rel="prev" href={pageHref(page - 1)}>← Previous</a>
            )}
            {' '}Page {page}{' '}
            {hasNextPage && (
              <a rel="next" href={pageHref(page + 1)}>Next →</a>
            )}
          </p>
        </nav>
      </noscript>
    </div>
  );
}
