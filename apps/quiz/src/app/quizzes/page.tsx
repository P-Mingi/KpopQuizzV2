import Link from 'next/link';

import { getBrowseQuizzes, getLanguageCounts, type BrowseSort } from '@/lib/db/queries/quizzes';
import { isLanguage } from '@/lib/languages';
import { getAllGroups } from '@/lib/db/queries/groups';
import { getSiteStats } from '@/lib/db/queries/stats';
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

  // Part B (cannibalization fix): a valid single-group facet like
  // /quizzes?group=exo used to self-canonical and compete with /exo-quiz for the
  // "<group> quiz" query. The dedicated group page should own that query, so the
  // facet (and its pagination) now canonicals to /<slug>-quiz, consolidating the
  // ranking signal there. Canonical alone does the dedup - no noindex, since a
  // noindex + cross-URL canonical would be a conflicting signal. All other
  // non-indexable variants still collapse to base /quizzes with noindex,follow.
  let canonical: string;
  if (validGroup) {
    canonical = `/${groupSlug}-quiz`;
  } else {
    const canonicalParams = new URLSearchParams();
    if (isIndexable && pageNum > 1) canonicalParams.set('page', String(pageNum));
    const qs = canonicalParams.toString();
    canonical = qs ? `/quizzes?${qs}` : '/quizzes';
  }

  // CTR sprint: lead the title with the real catalog size. Floor to the nearest
  // 10 so "N+" is always true and can only ever undersell as the catalog grows.
  // getSiteStats is unstable_cached (weekly), so this adds no per-request cost.
  const stats = await safeFetch<Awaited<ReturnType<typeof getSiteStats>> | null>(getSiteStats(), null, '[browse meta] getSiteStats');
  const countLabel = `${Math.max(380, Math.floor((stats?.totalQuizzes ?? 0) / 10) * 10)}+`;

  return {
    title: `K-pop Quizzes: ${countLabel} Free Fan-Made Tests, Every Group`,
    description:
      `Browse ${countLabel} free K-pop quizzes made by fans. Filter by group or type, sort by trending, newest, or most played, and test your bias knowledge now.`,
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

  // SEO: a concise FAQ for the "K-pop quizzes" query - real content depth, long-tail
  // coverage, and internal links into the group hubs + /create. Shown only on the
  // canonical /quizzes view (no group facet, page 1) so it never duplicates onto the
  // group-canonicalized facet URLs.
  const showFaq = !resolvedGroup && page === 1;
  const faqLink: React.CSSProperties = { color: 'var(--brand)', fontWeight: 600 };
  const quizFaqs: { q: string; text: string; a: React.ReactNode }[] = [
    { q: 'Are the K-pop quizzes free?', text: 'Yes. Every K-pop quiz on KpopQuiz is free to play with no account needed. Sign in only to save scores, climb the leaderboard, or create your own.',
      a: <>Yes. Every K-pop quiz on KpopQuiz is free to play with no account needed. Sign in only to save scores, climb the leaderboard, or <Link href="/create" style={faqLink}>create your own</Link>.</> },
    { q: 'How many K-pop quizzes are there?', text: 'There are 380+ free K-pop quizzes across 30+ groups, from BTS and BLACKPINK to Stray Kids, aespa and NewJeans, with new fan-made quizzes added regularly.',
      a: <>There are 380+ free K-pop quizzes across 30+ groups, from BTS and BLACKPINK to Stray Kids, aespa and NewJeans, with new fan-made quizzes added regularly.</> },
    { q: 'Which K-pop groups can I take a quiz on?', text: 'Popular hubs include the BTS quiz, BLACKPINK quiz and Stray Kids quiz, plus 30+ more groups. Browse by group above or open a group hub.',
      a: <>Popular hubs include the <Link href="/bts-quiz" style={faqLink}>BTS quiz</Link>, <Link href="/blackpink-quiz" style={faqLink}>BLACKPINK quiz</Link> and <Link href="/stray-kids-quiz" style={faqLink}>Stray Kids quiz</Link>, plus 30+ more groups. Browse by group above.</> },
    { q: 'Can I make my own K-pop quiz?', text: 'Yes. Anyone can create a K-pop quiz for free in a few minutes and share it with other fans.',
      a: <>Yes. Anyone can <Link href="/create" style={faqLink}>create a K-pop quiz</Link> for free in a few minutes and share it with other fans.</> },
  ];

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
          K-pop <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--brand)' }}>quizzes</span>
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: 'var(--txt2)' }}>
          Browse every K-pop quiz on the site, filter by group or type, and sort by trending, newest, or most played.
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

      {showFaq && (
        <>
          <section aria-labelledby="quizzes-faq" style={{ marginTop: 36, maxWidth: 720 }}>
            <h2 id="quizzes-faq" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt1)', marginBottom: 14 }}>K-pop quizzes: FAQ</h2>
            <dl style={{ display: 'flex', flexDirection: 'column', gap: 16, margin: 0 }}>
              {quizFaqs.map((f) => (
                <div key={f.q}>
                  <dt style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>{f.q}</dt>
                  <dd style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--txt2)', lineHeight: 1.55 }}>{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: quizFaqs.map((f) => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.text },
                })),
              }),
            }}
          />
        </>
      )}
    </div>
  );
}
