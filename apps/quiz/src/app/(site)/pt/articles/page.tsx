import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { ARTICLES } from '@/lib/articles/registry';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artigos de K-pop: Guias, Comparacoes e Dados Originais',
  description:
    'Artigos originais sobre quizzes de K-pop, blind tests e cultura fan. Guias, comparacoes de grupos, analises de sites e dados originais da equipe KpopQuiz.',
  openGraph: {
    title: 'Artigos de K-pop',
    description: 'Guias, comparacoes e dados originais sobre quizzes de K-pop e cultura fan.',
    url: '/pt/articles',
    locale: 'pt_BR',
  },
  alternates: {
    canonical: '/pt/articles',
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

const CATEGORY_LABELS_PT: Record<string, string> = {
  comparison: 'Comparacao',
  guide: 'Guia',
  data: 'Dados',
  listicle: 'Lista',
  roundup: 'Resumo Semanal',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
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

export default function PtArticlesPage(): React.ReactElement {
  const sorted = [...ARTICLES].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <>
      <div className="artx-page">
        <header className="artx-header">
          <div className="artx-header-top">
            <Mascot variant="think" size={48} alt="KpopQuiz mascot" />
            <div>
              <h1 className="artx-title">Artigos</h1>
              <p className="artx-subtitle">
                Guias, comparacoes e dados originais sobre quizzes de K-pop e cultura fan.
                Escrito pela equipe KpopQuiz.
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
                  {CATEGORY_LABELS_PT[article.category] ?? article.category}
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
                Ler artigo <IconArrow />
              </span>
            </Link>
          ))}
        </div>

        {sorted.length === 0 && (
          <p className="artx-empty">Nenhum artigo ainda. Volte em breve.</p>
        )}
      </div>
    </>
  );
}
