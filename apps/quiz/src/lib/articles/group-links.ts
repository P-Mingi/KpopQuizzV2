/**
 * SEO internal-link mapping: group slug -> relevant article slugs.
 * Used by the group quiz page to surface "Read more" links that pass
 * link equity from high-authority group pages to the articles section.
 * Only TOP-tier (indexed) articles are listed here.
 */

export interface GroupArticleLink {
  slug: string;
  label: string;
}

const GROUP_ARTICLE_MAP: Record<string, GroupArticleLink[]> = {
  bts: [
    { slug: 'bts-discography-guide', label: 'The Ultimate BTS Discography Guide' },
    { slug: 'bts-vs-blackpink-quiz', label: 'BTS vs BLACKPINK: Which Fandom Knows More?' },
  ],
  blackpink: [
    { slug: 'bts-vs-blackpink-quiz', label: 'BTS vs BLACKPINK: Which Fandom Knows More?' },
  ],
  'stray-kids': [
    { slug: 'stray-kids-vs-ateez', label: 'Stray Kids vs ATEEZ: The 4th-Gen Showdown' },
  ],
  ateez: [
    { slug: 'stray-kids-vs-ateez', label: 'Stray Kids vs ATEEZ: The 4th-Gen Showdown' },
  ],
  aespa: [
    { slug: 'aespa-vs-newjeans-quiz', label: 'aespa vs NewJeans: The 4th-Gen Face-Off' },
  ],
  newjeans: [
    { slug: 'newjeans-fan-guide', label: 'How Well Do You Know NewJeans? The Fan Guide' },
    { slug: 'aespa-vs-newjeans-quiz', label: 'aespa vs NewJeans: The 4th-Gen Face-Off' },
  ],
};

/** General articles linked from EVERY group quiz page (low-priority, max 1). */
const GENERAL_ARTICLES: GroupArticleLink[] = [
  { slug: 'kpop-generations-explained', label: 'Every K-pop Generation Explained' },
];

/**
 * Get article links for a group quiz page. Returns group-specific articles
 * first, then at most 1 general article if there are fewer than 2 specific ones.
 * Returns empty array for groups with no relevant articles.
 */
export function getGroupArticleLinks(groupSlug: string): GroupArticleLink[] {
  const specific = GROUP_ARTICLE_MAP[groupSlug] ?? [];
  if (specific.length >= 2) return specific;
  // Pad with a general article so every group page has at least one article link
  return [...specific, ...GENERAL_ARTICLES.slice(0, 2 - specific.length)];
}
