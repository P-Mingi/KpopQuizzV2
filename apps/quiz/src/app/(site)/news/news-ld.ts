// /news structured data. Pure.
//
// SEO (owner, 2026-10-13): /news lists headlines that live on allkpop, Soompi and
// Koreaboo. It used to emit one NewsArticle per headline, which declares those
// third-party articles as entities of OUR page (and needed a parseable date, the
// RangeError that 500ed the page). The page is a list of outbound links, so it is
// described as exactly that: an ItemList of ListItem (position, url, name). No
// article type, no dates, no publisher claims.

export interface NewsLink {
  title: string;
  link: string;
}

function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** ItemList JSON-LD of the headlines shown, or null when there is none to list. */
export function newsItemListLd(items: readonly NewsLink[]): Record<string, unknown> | null {
  const listed = items.filter((it) => it.title.trim() !== '' && isHttpUrl(it.link));
  if (listed.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'K-pop news headlines',
    itemListElement: listed.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: it.link,
      name: it.title,
    })),
  };
}
