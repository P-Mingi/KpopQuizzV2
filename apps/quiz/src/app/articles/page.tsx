import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { ARTICLES } from '@/lib/articles/registry';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'K-pop Articles: Guides, Comparisons, and Original Data',
  description:
    'Original articles about K-pop quizzes, blind tests, and fan culture. Guides, group comparisons, quiz site reviews, and data-driven analysis from the KpopQuiz team.',
  openGraph: {
    title: 'K-pop Articles',
    description: 'Guides, comparisons, and original data about K-pop quizzes and fan culture.',
    url: '/articles',
    images: [{ url: '/api/og/page?title=K-pop+Articles&subtitle=Guides%2C+comparisons%2C+and+original+data+about+K-pop+quizzes.&accent=%23e8457a', width: 1200, height: 630, alt: 'K-pop Articles on KpopQuiz' }],
  },
  twitter: { card: 'summary_large_image' },
  alternates: {
    canonical: '/articles',
    languages: {
      en: '/articles',
      'pt-BR': '/pt/articles',
      'x-default': '/articles',
    },
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  comparison: '#7c5cfc',
  guide: '#10b981',
  data: '#f59e0b',
  listicle: 'var(--brand)',
  roundup: '#3b82f6',
};

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function IconArrow(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function ArticlesPage(): React.ReactElement {
  const sorted = [...ARTICLES].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'K-pop Articles',
    description: 'Original articles about K-pop quizzes and fan culture.',
    url: 'https://kpopquiz.org/articles',
    hasPart: sorted.map((a) => ({
      '@type': 'Article',
      headline: a.title,
      url: `https://kpopquiz.org/articles/${a.slug}`,
      datePublished: a.publishedAt,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpopquiz.org' },
      { '@type': 'ListItem', position: 2, name: 'Articles', item: 'https://kpopquiz.org/articles' },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="artx-page">
        <header className="artx-header">
          <div className="artx-header-top">
            <Mascot variant="think" size={48} alt="KpopQuiz mascot" />
            <div>
              <h1 className="artx-title">Articles</h1>
              <p className="artx-subtitle">
                Guides, comparisons, and original data about K-pop quizzes and fan culture.
                Written by the KpopQuiz team.
              </p>
            </div>
          </div>
        </header>

        <div className="artx-grid">
          {sorted.map((article) => (
            <Link
              key={article.slug}
              href={`/articles/${article.slug}`}
              className="artx-card"
            >
              <div className="artx-card-top">
                <span
                  className="artx-card-cat"
                  style={{ color: CATEGORY_COLORS[article.category] ?? 'var(--txt3)' }}
                >
                  {categoryLabel(article.category)}
                </span>
                <span className="artx-card-date">{formatDate(article.updatedAt)}</span>
              </div>
              <h2 className="artx-card-title">{article.title}</h2>
              <p className="artx-card-desc">{article.description}</p>
              <div className="artx-card-tags">
                {article.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="artx-card-tag">{tag}</span>
                ))}
              </div>
              <span className="artx-card-read">
                Read article <IconArrow />
              </span>
            </Link>
          ))}
        </div>

        {sorted.length === 0 && (
          <p className="artx-empty">No articles yet. Check back soon.</p>
        )}
      </div>
    </>
  );
}
