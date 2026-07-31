// Entity JSON-LD for Verse pages (MusicGroup, Person, MusicAlbum). Hand-written
// objects matching the app's inline `<script type="application/ld+json">` house
// pattern. Only real, sourced facts are emitted; no personal-life data.
const SITE = 'https://kpopquiz.org';

export function musicGroupLd(g: {
  name: string; slug: string; fandom_name: string; inception_date: string | null;
  official_website: string | null; record_label: string | null; memberNames: string[];
}): Record<string, unknown> {
  const sameAs = g.official_website ? [g.official_website] : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: g.name,
    alternateName: g.fandom_name,
    url: `${SITE}/verse/${g.slug}`,
    genre: 'K-pop',
    ...(g.inception_date ? { foundingDate: g.inception_date.slice(0, 10) } : {}),
    ...(g.record_label ? { recordLabel: { '@type': 'Organization', name: g.record_label } } : {}),
    ...(sameAs ? { sameAs } : {}),
    ...(g.memberNames.length ? { member: g.memberNames.map((n) => ({ '@type': 'Person', name: n })) } : {}),
  };
}

export function personLd(p: {
  name: string; groupSlug: string; idolSlug: string; groupName: string;
  birth_date: string | null; nationality: string | null;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    url: `${SITE}/verse/${p.groupSlug}/members/${p.idolSlug}`,
    ...(p.birth_date ? { birthDate: p.birth_date.slice(0, 10) } : {}),
    ...(p.nationality ? { nationality: p.nationality } : {}),
    memberOf: { '@type': 'MusicGroup', name: p.groupName, url: `${SITE}/verse/${p.groupSlug}` },
  };
}

export function musicAlbumLd(a: {
  title: string; groupSlug: string; albumSlug: string; groupName: string;
  release_date: string | null; type: string; numTracks: number;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: a.title,
    url: `${SITE}/verse/${a.groupSlug}/albums/${a.albumSlug}`,
    byArtist: { '@type': 'MusicGroup', name: a.groupName, url: `${SITE}/verse/${a.groupSlug}` },
    ...(a.release_date ? { datePublished: a.release_date.slice(0, 10) } : {}),
    albumProductionType: 'https://schema.org/StudioAlbum',
    albumReleaseType: a.type === 'single' ? 'https://schema.org/SingleRelease' : (a.type === 'ep' ? 'https://schema.org/EPRelease' : 'https://schema.org/AlbumRelease'),
    ...(a.numTracks ? { numTracks: a.numTracks } : {}),
  };
}

// V-PAGES: the wiki leaf as an Article (fan-authored content over the entity
// graph) + its breadcrumb trail.
export function wikiArticleLd(p: {
  title: string; groupSlug: string; pageSlug: string; groupName: string;
  publishedAt: string | null; updatedAt: string; maintainers: number; fanWritten: boolean;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    url: `${SITE}/verse/${p.groupSlug}/wiki/${p.pageSlug}`,
    about: { '@type': 'MusicGroup', name: p.groupName, url: `${SITE}/verse/${p.groupSlug}` },
    author: { '@type': 'Organization', name: `${p.groupName} fans on KpopVerse` },
    ...(p.publishedAt ? { datePublished: p.publishedAt.slice(0, 10) } : {}),
    dateModified: p.updatedAt.slice(0, 10),
    isPartOf: { '@type': 'WebSite', name: 'KpopVerse', url: `${SITE}/verse` },
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

export function jsonLdScript(obj: Record<string, unknown>): React.ReactElement {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />;
}
