import Link from 'next/link';

import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { languageLabel } from '@/lib/languages';
import { getP2FacetRows, getP2Page, getP2Pages } from '@/lib/ux-v1/p2/queries';
import {
  P2_GENERAL_GROUP, P2_LEVELS, P2_PAGE_SIZE, P2_SORTS, P2_TYPES,
  hasFacet, levelLabel, p2Concat, p2Facets, p2FilterKey, p2Href, p2Languages, p2PageCount, p2ShownPages,
  parseP2Filters, quizCountLabel, typeLabel,
} from '@/lib/ux-v1/p2/filters';
import { P2QuizzesPage } from '@/components/quizzes/ux-v1/quizzes-page';
import { quizzesFaqJsonLd, quizzesFaqs } from './faq';

import type { P2ChipData, P2Empty } from '@/components/quizzes/ux-v1/quizzes-page';
import type { P2LinkOption } from '@/components/quizzes/ux-v1/controls';
import type { QuizCardData } from '@/lib/db/types';
import type { P2Facets, P2SearchParams } from '@/lib/ux-v1/p2/filters';

// UX v11 render of /quizzes (P2). Called by page.tsx only when NEXT_PUBLIC_UX_V1 is
// on; generateMetadata (title, description, canonical, robots, hreflang) is shared
// with the live page. Kept from the live page, same text: the H1, the intro, the
// breadcrumb (BreadcrumbList JSON-LD), the ItemList JSON-LD of the page's quizzes,
// the FAQ + FAQPage JSON-LD (unfiltered first page only), the browse links. Reads:
// the live browse query (views the live page can show), the published-quiz facet
// rows (counts, Level views); all public and cached at the stats TTL; fail soft.

const SITE = 'https://kpopquiz.org';
const H1 = 'K-pop quizzes';
const INTRO = 'Browse every K-pop quiz on the site, filter by group or type, and sort by trending, newest, or most played.';
const CRUMBS: { label: string; href?: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'Browse All Quizzes' },
];

function option(key: string, label: string, href: string, current: boolean, count: number | null): P2LinkOption {
  return { key, label, href, current, count };
}

export async function renderP2Quizzes(sp: P2SearchParams): Promise<React.ReactElement> {
  const now = Date.now();
  const [groups, rows] = await Promise.all([
    safeFetch(getAllGroups(), [], '[browse ux] getAllGroups'),
    safeFetch(getP2FacetRows(), [], '[browse ux] facet rows'),
  ]);

  const f = parseP2Filters(sp, { groupSlugs: new Set(groups.map((g) => g.slug)), languages: p2Languages(rows) });
  const group = f.group ? groups.find((g) => g.slug === f.group) ?? null : null;
  const groupId = group?.id ?? null;
  // Counts come from the facet rows; if that read failed, offer every option without
  // a count and fall back to the live page's "a full page means there may be more".
  const facets: P2Facets | null = rows.length > 0 ? p2Facets(rows, f, now) : null;
  const total = facets?.total ?? null;

  // ?page=N shows pages 1..N (the "Load more" state; it also keeps every link of the
  // live ?page=N, whose grid shows page 1 and whose crawl list shows page N). The
  // ItemList JSON-LD lists page N alone, read with the live query, as today.
  const { last, outOfRange } = p2ShownPages(f.page, total);
  const read = await safeFetch<QuizCardData[][] | null>(getP2Pages(f, last, groupId, rows, now), null, '[browse ux] pages');
  // A failed or timed-out read is not an empty list: say so (fail soft, never a 500).
  const failed = read === null;
  const pages = read ?? [];
  const quizzes = p2Concat(pages);
  const pageN = !outOfRange && f.page <= pages.length
    ? pages[f.page - 1] ?? []
    : await safeFetch(getP2Page(f, groupId, rows, now), [], '[browse ux] page');
  const lastFull = (pages[pages.length - 1]?.length ?? 0) >= P2_PAGE_SIZE;
  const hasNext = total !== null ? last * P2_PAGE_SIZE < total : lastFull;
  const notice = outOfRange && total !== null
    ? `There is no page ${f.page.toLocaleString('en-US')}: this list has ${p2PageCount(total).toLocaleString('en-US')}. Here is the first one.`
    : null;

  const offered = (count: number | undefined, current: boolean): boolean => current || facets === null || (count ?? 0) > 0;

  const sort = P2_SORTS.map((s) => option(s.key, s.label, p2Href(f, { sort: s.key, page: 1 }), f.sort === s.key, null));
  const types = P2_TYPES
    .filter((t) => offered(facets?.types[t.key], f.type === t.key))
    .map((t) => option(t.key, t.label, p2Href(f, { type: t.key, page: 1 }), f.type === t.key, facets ? facets.types[t.key] : null));
  const levels = P2_LEVELS
    .filter((l) => offered(facets?.levels[l.key], f.level === l.key))
    .map((l) => option(l.key, l.label, p2Href(f, { level: l.key, page: 1 }), f.level === l.key, facets ? facets.levels[l.key] : null));
  const pick = (slug: string): string => p2Href(f, { group: slug, page: 1 });
  const groupList = facets
    ? facets.groups
    : groups
      .filter((g) => g.quiz_count > 0)
      .map((g) => ({ slug: g.slug, name: g.name, count: 0 }))
      .sort((a, b) => (a.slug === P2_GENERAL_GROUP ? 1 : 0) - (b.slug === P2_GENERAL_GROUP ? 1 : 0) || a.name.localeCompare(b.name, 'en'));
  const groupOptions = groupList.map((g) => option(g.slug, g.name, pick(g.slug), f.group === g.slug, facets ? g.count : null));
  if (group && !groupOptions.some((o) => o.current)) {
    groupOptions.unshift(option(group.slug, group.name, pick(group.slug), true, facets ? 0 : null));
  }

  const chips: P2ChipData[] = [];
  if (f.type) chips.push({ key: 'type', label: typeLabel(f.type), href: p2Href(f, { type: null, page: 1 }), focusId: 'p2-dd-type' });
  if (f.level) chips.push({ key: 'level', label: levelLabel(f.level), href: p2Href(f, { level: null, page: 1 }), focusId: 'p2-dd-level' });
  if (group) chips.push({ key: 'group', label: group.name, href: p2Href(f, { group: null, page: 1 }), focusId: 'p2-dd-group' });
  if (f.lang) chips.push({ key: 'lang', label: languageLabel(f.lang), href: p2Href(f, { lang: null, page: 1 }), focusId: 'p2-dd-type' });

  const cleared = p2Href(f, { type: null, level: null, group: null, lang: null, page: 1 });
  let empty: P2Empty | null = null;
  if (quizzes.length === 0) {
    if (failed) {
      empty = { title: 'Quizzes did not load', text: 'Something went wrong on our side. Please try again.', action: { href: p2Href(f), label: 'Try again', reload: true } };
    } else if (total !== null && total > 0) {
      empty = { title: 'No quizzes on this page', text: 'This list is shorter now.', action: { href: p2Href(f, { page: 1 }), label: 'Back to the first page', focusId: 'p2-dd-type' } };
    } else if (group && !f.type && !f.level && !f.lang && f.sort !== 'trending') {
      empty = { title: `No ${group.name} quizzes yet`, text: 'Be the first to make one.', action: { href: cleared, label: 'Clear filters', focusId: 'p2-dd-group' }, create: true };
    } else if (hasFacet(f)) {
      empty = { title: 'No quizzes match these filters', text: 'Try another level or group.', action: { href: cleared, label: 'Clear filters', focusId: 'p2-dd-type' } };
    } else {
      empty = { title: 'No quizzes here yet', text: 'Try another sort.', action: { href: '/quizzes', label: 'Show all quizzes' } };
    }
  }

  // JSON-LD: the same objects as the live page (Breadcrumbs component, ItemList, FAQPage).
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: CRUMBS.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE}${item.href}` } : {}),
    })),
  };
  const itemListLd = pageN.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'K-pop quizzes',
    itemListElement: pageN.map((q, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/q/${q.slug}`,
      name: q.title,
    })),
  } : null;
  const showFaq = !group && f.page === 1;
  const faqs = quizzesFaqs((href, label) => <Link href={href} className="p2-inl">{label}</Link>);

  return (
    <P2QuizzesPage
      filters={{ ...f, page: last }}
      notice={notice}
      filterKey={p2FilterKey(f)}
      summary={failed ? 'Quizzes did not load' : total === 0 || (total === null && quizzes.length === 0) ? 'No quizzes match these filters' : quizCountLabel(total ?? quizzes.length)}
      h1={H1}
      intro={INTRO}
      crumbs={CRUMBS}
      sort={sort}
      types={types}
      levels={levels}
      groups={groupOptions}
      chips={chips}
      quizzes={quizzes}
      empty={empty}
      hasNext={hasNext}
      pageCount={total !== null ? p2PageCount(total) : null}
      faq={showFaq ? faqs : null}
      breadcrumbLd={breadcrumbLd}
      itemListLd={itemListLd}
      faqLd={showFaq ? quizzesFaqJsonLd(faqs) : null}
    />
  );
}
