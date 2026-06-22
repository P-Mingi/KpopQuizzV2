import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { getSiteStats } from '@/lib/db/queries/stats';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { SiteStats } from '@/lib/db/queries/stats';

export const revalidate = 604800;

export const metadata: Metadata = {
  title: 'Estatisticas do KpopQuiz: Dados ao Vivo sobre Quizzes, Musicas e Grupos de K-pop',
  description:
    'Estatisticas em tempo real do kpopquiz.org: total de quizzes, musicas, jogadas e cobertura de grupos em 5 geracoes de K-pop. Atualizado semanalmente.',
  openGraph: {
    title: 'Estatisticas do KpopQuiz',
    description: 'Dados ao vivo sobre quizzes, musicas de blind test e engajamento dos fas em mais de 87 grupos.',
    url: '/pt/stats',
    locale: 'pt_BR',
  },
  alternates: {
    canonical: '/pt/stats',
    languages: {
      en: '/stats',
      'pt-BR': '/pt/stats',
      'x-default': '/stats',
    },
  },
};

const FALLBACK: SiteStats = {
  totalSongs: 0,
  totalQuizzes: 0,
  totalPlays: 0,
  totalGroups: 0,
  generationsCovered: 5,
  topQuizzesByGroup: [],
  updatedAt: new Date().toISOString(),
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function PtStatsPage(): Promise<React.ReactElement> {
  const stats = await safeFetch(getSiteStats(), FALLBACK, '[pt/stats] getSiteStats');

  const heroCards = [
    { label: 'Quizzes', value: stats.totalQuizzes, accent: 'var(--brand)' },
    { label: 'Musicas', value: stats.totalSongs, accent: '#7c5cfc' },
    { label: 'Jogadas', value: stats.totalPlays, accent: '#f59e0b' },
    { label: 'Grupos', value: stats.totalGroups, accent: '#10b981' },
    { label: 'Geracoes', value: stats.generationsCovered, accent: '#f472b6' },
  ];

  return (
    <div className="stats-page">
      <div className="stats-header">
        <nav className="stats-breadcrumbs">
          <Link href="/pt">Inicio</Link>
          <span className="stats-breadcrumb-sep">/</span>
          <span>Estatisticas</span>
        </nav>
        <div className="stats-title-row">
          <div>
            <h1 className="stats-title font-display">Estatisticas do KpopQuiz</h1>
            <p className="stats-subtitle">Dados ao vivo da plataforma, atualizados semanalmente</p>
          </div>
          <div className="stats-mascot" aria-hidden="true">
            <Mascot variant="celebrate" size={56} alt="" />
          </div>
        </div>
        <p className="stats-updated">
          Ultima atualizacao: {formatDate(stats.updatedAt)}
        </p>
      </div>

      <div className="stats-summary">
        <div className="stats-summary-dot" aria-hidden="true" />
        <p className="stats-summary-text">
          O KpopQuiz hospeda {stats.totalQuizzes.toLocaleString('pt-BR')} quizzes feitos por fas
          e {stats.totalSongs.toLocaleString('pt-BR')} musicas de blind test
          cobrindo {stats.totalGroups} grupos de K-pop em {stats.generationsCovered} geracoes
          (1a ate 5a). A plataforma registrou {formatNumber(stats.totalPlays)} jogadas
          no total desde o lancamento, com novos quizzes adicionados diariamente pela comunidade.
        </p>
      </div>

      <div className="stats-cards">
        {heroCards.map((card, i) => (
          <div key={card.label} className="stats-card" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="stats-card-value" style={{ color: card.accent }}>{formatNumber(card.value)}</span>
            <span className="stats-card-label">{card.label}</span>
          </div>
        ))}
      </div>

      {stats.topQuizzesByGroup.length > 0 && (
        <section className="stats-table-section">
          <h2 className="stats-section-title">Grupos mais populares por engajamento</h2>
          <p className="stats-section-desc">
            Os grupos de K-pop mais jogados na plataforma, classificados por total de jogadas.
          </p>
          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th className="stats-th stats-th-rank">#</th>
                  <th className="stats-th">Grupo</th>
                  <th className="stats-th stats-th-num">Quizzes</th>
                  <th className="stats-th stats-th-num">Total de jogadas</th>
                </tr>
              </thead>
              <tbody>
                {stats.topQuizzesByGroup.map((group, i) => (
                  <tr key={group.groupSlug} className="stats-tr">
                    <td className="stats-td stats-td-rank">
                      <span className={`stats-rank ${i < 3 ? `stats-rank-top stats-rank-${i + 1}` : ''}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="stats-td">
                      <Link href={`/${group.groupSlug}-quiz`} className="stats-group-link">
                        {group.groupName}
                      </Link>
                    </td>
                    <td className="stats-td stats-td-num">{group.quizCount}</td>
                    <td className="stats-td stats-td-num">
                      <span className="stats-plays-bar">
                        <span className="stats-plays-fill" style={{ width: `${Math.min(100, (group.totalPlays / (stats.topQuizzesByGroup[0]?.totalPlays || 1)) * 100)}%` }} />
                        <span className="stats-plays-num">{formatNumber(group.totalPlays)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="stats-links">
        <h2 className="stats-section-title">Explore a plataforma</h2>
        <div className="stats-link-grid">
          <Link href="/quizzes" className="stats-link-card">
            <div className="stats-link-body">
              <span className="stats-link-title">Explorar quizzes</span>
              <span className="stats-link-desc">Quizzes feitos por fas para cada grupo</span>
            </div>
          </Link>
          <Link href="/blindtest" className="stats-link-card">
            <div className="stats-link-body">
              <span className="stats-link-title">Blind test</span>
              <span className="stats-link-desc">Adivinhe musicas de K-pop em 10 segundos</span>
            </div>
          </Link>
          <Link href="/games" className="stats-link-card">
            <div className="stats-link-body">
              <span className="stats-link-title">Jogos</span>
              <span className="stats-link-desc">This or That, Nomeie Todos os Membros</span>
            </div>
          </Link>
          <Link href="/leaderboard" className="stats-link-card">
            <div className="stats-link-body">
              <span className="stats-link-title">Ranking</span>
              <span className="stats-link-desc">Melhores jogadores e criadores</span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
