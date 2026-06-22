import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'K-pop News - Latest Headlines',
  description:
    'Latest K-pop news from allkpop, Soompi, and Koreaboo. Stay up to date and test your knowledge with quizzes and games.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/news' },
};

export const revalidate = 3600;

interface FeedItem {
  title: string;
  link: string;
  date: string;
  source: string;
  image: string | null;
}

const FEEDS: Array<{ url: string; source: string }> = [
  { url: 'https://www.allkpop.com/feed', source: 'allkpop' },
  { url: 'https://www.soompi.com/feed', source: 'Soompi' },
  { url: 'https://www.koreaboo.com/feed/', source: 'Koreaboo' },
];

function decodeEntities(str: string): string {
  let s = str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  s = s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
  return s;
}

function extractTag(xml: string, tag: string): string {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const start = xml.indexOf(open);
  if (start === -1) return '';
  const contentStart = xml.indexOf('>', start) + 1;
  const end = xml.indexOf(close, contentStart);
  if (end === -1) return '';
  let val = xml.substring(contentStart, end).trim();
  if (val.startsWith('<![CDATA[')) val = val.slice(9, -3);
  return decodeEntities(val);
}

function extractImage(itemXml: string): string | null {
  const mediaMatch = itemXml.match(
    /url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i,
  );
  if (mediaMatch) return mediaMatch[1]!;
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"/);
  if (enclosureMatch) return enclosureMatch[1]!;
  const imgMatch = itemXml.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1]!;
  const srcMatch = itemXml.match(/src=&quot;(https?:\/\/[^&]+\.(?:jpg|jpeg|png|webp)[^&]*)&quot;/i);
  if (srcMatch) return decodeEntities(srcMatch[1]!);
  const rawUrl = itemXml.match(/(https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|webp))/i);
  if (rawUrl) return rawUrl[1]!;
  return null;
}

async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'KpopQuiz/1.0 (news aggregator)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    );
    if (ogMatch) return ogMatch[1]!;
    const ogAlt = html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    );
    if (ogAlt) return ogAlt[1]!;
    return null;
  } catch {
    return null;
  }
}

async function fetchFeed(url: string, source: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'KpopQuiz/1.0 (news aggregator)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: FeedItem[] = [];
    let cursor = 0;
    while (items.length < 15) {
      const itemStart = xml.indexOf('<item', cursor);
      if (itemStart === -1) break;
      const itemEnd = xml.indexOf('</item>', itemStart);
      if (itemEnd === -1) break;
      const itemXml = xml.substring(itemStart, itemEnd + 7);
      cursor = itemEnd + 7;

      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');
      if (!title || !link) continue;

      items.push({
        title,
        link,
        date: pubDate || new Date().toISOString(),
        source,
        image: extractImage(itemXml),
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function enrichWithOgImages(items: FeedItem[]): Promise<FeedItem[]> {
  const needsImage = items.filter((it) => !it.image);
  if (needsImage.length === 0) return items;

  const BATCH = 6;
  for (let i = 0; i < needsImage.length; i += BATCH) {
    const batch = needsImage.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((it) => fetchOgImage(it.link)),
    );
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        batch[idx]!.image = r.value;
      }
    });
  }
  return items;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const mins = Math.floor((now - then) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface GroupMatch {
  name: string;
  slug: string;
}

function findGroupMentions(title: string, groups: GroupMatch[]): GroupMatch[] {
  const upper = title.toUpperCase();
  return groups.filter((g) => {
    const nameUpper = g.name.toUpperCase();
    const idx = upper.indexOf(nameUpper);
    if (idx === -1) return false;
    const before = idx > 0 ? upper[idx - 1] : ' ';
    const after =
      idx + nameUpper.length < upper.length
        ? upper[idx + nameUpper.length]
        : ' ';
    const boundary = /[\s,.:;!?'"()\-/]/;
    return (
      (idx === 0 || boundary.test(before!)) &&
      (idx + nameUpper.length >= upper.length || boundary.test(after!))
    );
  });
}

const SOURCE_COLORS: Record<string, string> = {
  allkpop: '#E24B4A',
  Soompi: '#5B7FE5',
  Koreaboo: '#F59E0B',
};

function SourceBadge({ source }: { source: string }): React.ReactElement {
  const color = SOURCE_COLORS[source] ?? 'var(--txt3)';
  return (
    <span className="nw-source-badge">
      <span className="nw-source-dot" style={{ background: color }} />
      {source}
    </span>
  );
}

function ArticleImage({
  src,
  alt,
  priority,
}: {
  src: string | null;
  alt: string;
  priority?: boolean;
}): React.ReactElement {
  if (src) {
    return (
      <div className="nw-img-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="nw-img"
          loading={priority ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <div className="nw-img-wrap nw-img-fallback">
      <Mascot variant="think" size={48} alt="" />
    </div>
  );
}

function GroupPills({
  mentions,
}: {
  mentions: GroupMatch[];
}): React.ReactElement | null {
  if (mentions.length === 0) return null;
  return (
    <div className="nw-pills">
      {mentions.slice(0, 3).map((m) => (
        <span key={m.slug} className="nw-pill">
          {m.name}
        </span>
      ))}
    </div>
  );
}

function FunnelCta({
  groupName,
  groupSlug,
}: {
  groupName: string;
  groupSlug: string;
}): React.ReactElement {
  return (
    <div className="nw-funnel">
      <div className="nw-funnel-inner">
        <span className="nw-funnel-mascot" aria-hidden="true">
          <Mascot variant="celebrate" size={32} alt="" />
        </span>
        <span className="nw-funnel-text">Think you know {groupName}?</span>
      </div>
      <div className="nw-funnel-links">
        <Link href={`/${groupSlug}-quiz`} className="nw-funnel-link nw-funnel-primary">
          Take a quiz
        </Link>
        <Link href="/blindtest" className="nw-funnel-link">
          Blind test
        </Link>
      </div>
    </div>
  );
}

function IconArrowUpRight(): React.ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function IconArrowRight(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default async function NewsPage(): Promise<React.ReactElement> {
  const [feedResults, allGroups] = await Promise.all([
    Promise.all(FEEDS.map((f) => fetchFeed(f.url, f.source))),
    safeFetch(getAllGroups(), [], '[news] getAllGroups'),
  ]);

  const allItems = await enrichWithOgImages(
    feedResults
      .flat()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 40),
  );

  const groupMatches: GroupMatch[] = allGroups.map((g) => ({
    name: g.name,
    slug: g.slug,
  }));

  const hero = allItems[0] ?? null;
  const gridItems = allItems.slice(1);
  const seenFunnels = new Set<string>();

  return (
    <div className="nw-page">
      {/* Header */}
      <header className="nw-header">
        <nav className="nw-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="nw-crumb-sep">/</span>
          <span>News</span>
        </nav>
        <h1 className="nw-title font-display">K-pop News</h1>
        <p className="nw-subtitle">
          Live headlines from allkpop, Soompi, and Koreaboo.
          Spot your favorite group and jump into a quiz.
        </p>
        <div className="nw-source-row">
          {FEEDS.map((f) => (
            <SourceBadge key={f.source} source={f.source} />
          ))}
        </div>
      </header>

      {allItems.length === 0 ? (
        <div className="nw-empty">
          <Mascot variant="sad" size={64} alt="" />
          <p>No articles available right now. Check back later.</p>
        </div>
      ) : (
        <>
          {/* Hero card */}
          {hero && (
            <a
              href={hero.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="nw-hero"
            >
              <ArticleImage src={hero.image} alt="" priority />
              <div className="nw-hero-overlay">
                <div className="nw-hero-meta">
                  <SourceBadge source={hero.source} />
                  <span className="nw-time">{timeAgo(hero.date)}</span>
                </div>
                <h2 className="nw-hero-title">{hero.title}</h2>
                <GroupPills
                  mentions={findGroupMentions(hero.title, groupMatches)}
                />
                <span className="nw-hero-read">
                  Read article <IconArrowUpRight />
                </span>
              </div>
            </a>
          )}

          {/* Grid */}
          <div className="nw-grid">
            {gridItems.map((item, i) => {
              const mentions = findGroupMentions(item.title, groupMatches);
              const funnelGroup = mentions.find(
                (m) => !seenFunnels.has(m.slug),
              );
              if (funnelGroup) seenFunnels.add(funnelGroup.slug);

              const showFunnel = funnelGroup && (i + 1) % 6 === 0;

              return (
                <div
                  key={`${item.source}-${i}`}
                  className={`nw-grid-slot${showFunnel ? ' nw-grid-slot-full' : ''}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="nw-card"
                  >
                    <ArticleImage src={item.image} alt="" />
                    <div className="nw-card-body">
                      <div className="nw-card-meta">
                        <SourceBadge source={item.source} />
                        <span className="nw-time">{timeAgo(item.date)}</span>
                      </div>
                      <p className="nw-card-title">{item.title}</p>
                      <GroupPills mentions={mentions} />
                    </div>
                  </a>
                  {showFunnel && (
                    <FunnelCta
                      groupName={funnelGroup.name}
                      groupSlug={funnelGroup.slug}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Bottom CTA */}
      <div className="nw-bottom">
        <p className="nw-bottom-text">
          Done reading? Put your K-pop knowledge to the test.
        </p>
        <div className="nw-bottom-links">
          <Link href="/quizzes" className="nw-bottom-btn nw-bottom-primary">
            Browse quizzes <IconArrowRight />
          </Link>
          <Link href="/blindtest" className="nw-bottom-btn">
            Blind test
          </Link>
          <Link href="/games" className="nw-bottom-btn">
            More games
          </Link>
        </div>
      </div>
    </div>
  );
}
