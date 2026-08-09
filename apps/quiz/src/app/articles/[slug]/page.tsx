import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Mascot } from '@/components/ui/mascot';
import { getArticleBySlug, getAllArticleSlugs } from '@/lib/articles/registry';
import { loadArticleContent } from '@/lib/articles/content';

import type { Metadata } from 'next';

const SITE_URL = 'https://kpopquiz.org';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: ['KpopQuiz Team'],
      url: `/articles/${article.slug}`,
      images: [
        article.ogImage
          ? { url: article.ogImage, width: 1200, height: 630, alt: article.coverAlt }
          : { url: `/api/og/page?title=${encodeURIComponent(article.title)}&subtitle=${encodeURIComponent(article.description.slice(0, 100))}`, width: 1200, height: 630, alt: article.coverAlt },
      ],
    },
    robots: article.noindex ? { index: false, follow: true } : undefined,
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/articles/${article.slug}` },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    comparison: 'Comparison',
    guide: 'Guide',
    data: 'Data',
    listicle: 'Listicle',
    roundup: 'Weekly Roundup',
  };
  return labels[cat] ?? cat;
}

function IconClock(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconChevron(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconArrow(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default async function ArticlePage({ params }: PageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const ArticleBody = await loadArticleContent(slug);
  if (!ArticleBody) notFound();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'KpopQuiz Team',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'KpopQuiz',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-512.png` },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${article.slug}`,
    },
    ...(article.ogImage ? { image: article.ogImage } : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Articles', item: `${SITE_URL}/articles` },
      { '@type': 'ListItem', position: 3, name: article.title, item: `${SITE_URL}/articles/${article.slug}` },
    ],
  };

  const faqJsonLd =
    article.faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: article.faq.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <article className="art-page">
        {/* Breadcrumbs */}
        <nav className="art-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <IconChevron />
          <Link href="/articles">Articles</Link>
          <IconChevron />
          <span>{article.title}</span>
        </nav>

        {/* Header */}
        <header className="art-header">
          <span className="art-category">{categoryLabel(article.category)}</span>
          <h1 className="art-title">{article.title}</h1>
          <p className="art-description">{article.description}</p>
          <div className="art-meta">
            <div className="art-byline">
              <span className="art-byline-avatar" aria-hidden="true">
                <Mascot variant="default" size={28} alt="" />
              </span>
              <span>
                <span className="art-author">KpopQuiz Team</span>
                <span className="art-date">
                  <IconClock /> Last updated: {formatDate(article.updatedAt)}
                </span>
              </span>
            </div>
            {article.tags.length > 0 && (
              <div className="art-tags">
                {article.tags.map((tag) => (
                  <span key={tag} className="art-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Article body */}
        <div className="art-body">
          <ArticleBody />
        </div>

        {/* FAQ */}
        {article.faq.length > 0 && (
          <section className="art-faq">
            <h2 className="art-faq-title">Frequently Asked Questions</h2>
            {article.faq.map((f, i) => (
              <details key={i} className="art-faq-item">
                <summary className="art-faq-question">{f.question}</summary>
                <p className="art-faq-answer">{f.answer}</p>
              </details>
            ))}
          </section>
        )}

        {/* Related links */}
        {article.relatedLinks.length > 0 && (
          <nav className="art-related">
            <h3 className="art-related-title">Keep playing</h3>
            <div className="art-related-links">
              {article.relatedLinks.map((link) => (
                <Link key={link.href} href={link.href} className="art-related-link">
                  {link.label}
                  <IconArrow />
                </Link>
              ))}
            </div>
          </nav>
        )}

        {/* Back to articles */}
        <div className="art-back">
          <Link href="/articles" className="art-back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            All articles
          </Link>
        </div>
      </article>
    </>
  );
}
