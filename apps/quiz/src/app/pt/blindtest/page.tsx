import Link from 'next/link';

import { BlindtestGame } from '@/components/blind-test/blindtest-game';
import { getBlindtestGroups } from '@/lib/db/queries/blindtest';
import { createServerClient } from '@/lib/supabase/server';
import { safeFetch } from '@/lib/error-handling';
import { formatCount } from '@/lib/utils';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blind Test de K-pop - Adivinhe a Musica pelo Clipe | KpopQuiz',
  description:
    'Jogue o blind test de K-pop gratuito: ouca um clipe de 10 segundos e adivinhe a musica ou artista. Mais de 300 musicas em mais de 60 grupos de todas as geracoes.',
  alternates: {
    canonical: '/pt/blindtest',
    languages: {
      en: '/blindtest',
      'pt-BR': '/pt/blindtest',
      'x-default': '/blindtest',
    },
  },
  openGraph: {
    title: 'Blind Test de K-pop - Adivinhe a Musica pelo Clipe',
    description: 'Ouca um clipe de 10 segundos e adivinhe a musica de K-pop. Mais de 300 musicas, 60+ grupos.',
    url: '/pt/blindtest',
    locale: 'pt_BR',
  },
};

export const revalidate = 3600;

async function getStats() {
  try {
    const supabase = await createServerClient();
    const [{ count: songCount }, { count: groupCount }] = await Promise.all([
      supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('groups').select('id', { count: 'exact', head: true }),
    ]);
    return { songs: songCount ?? 0, groups: groupCount ?? 0 };
  } catch {
    return { songs: 300, groups: 60 };
  }
}

function FaqItem({ q, a }: { q: string; a: string }): React.ReactElement {
  return (
    <details className="group bt-faq-item">
      <summary className="bt-faq-q">
        {q}
        <svg className="bt-faq-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <p className="bt-faq-a">{a}</p>
    </details>
  );
}

const FAQ_ITEMS = [
  {
    q: 'O que e um blind test de K-pop?',
    a: 'Um blind test toca um clipe curto de uma musica de K-pop e voce precisa adivinhar qual musica ou artista e. Voce so ouve a musica, sem visuais ou letras na tela. E a melhor forma de testar o quanto voce realmente conhece K-pop.',
  },
  {
    q: 'Quantas musicas estao disponiveis?',
    a: 'O catalogo tem mais de 300 musicas em mais de 60 grupos de todas as geracoes de K-pop, desde lendas da 1a geracao ate os debuts mais recentes da 5a geracao. Novas musicas sao adicionadas regularmente.',
  },
  {
    q: 'Posso jogar so com um grupo?',
    a: 'Sim. Qualquer grupo com musicas suficientes no catalogo tem sua propria playlist. Selecione "Por grupo" na tela de configuracao e escolha seu favorito. BTS, BLACKPINK, Stray Kids, TWICE, aespa, NewJeans e muitos outros estao disponiveis.',
  },
  {
    q: 'Como funciona uma rodada?',
    a: 'Cada jogo tem 10 musicas. Para cada musica voce ouve um clipe de 10 segundos e ve quatro opcoes de resposta. Escolha a musica ou artista correto antes do tempo acabar. Sua pontuacao e quantas voce acerta em 10.',
  },
  {
    q: 'O blind test e gratuito?',
    a: 'Sim, completamente gratuito. Sem necessidade de conta, sem limites de jogadas. Basta escolher sua playlist e comecar a adivinhar.',
  },
  {
    q: 'Quais geracoes estao cobertas?',
    a: 'Todas. Filtre por 1a geracao (H.O.T., S.E.S.), 2a geracao (SNSD, SHINee, BIGBANG), 3a geracao (BTS, EXO, BLACKPINK, TWICE), 4a geracao (Stray Kids, aespa, IVE, NewJeans), ou 5a geracao (os debuts mais recentes).',
  },
  {
    q: 'Posso jogar no celular?',
    a: 'Sim. O blind test funciona em qualquer dispositivo com navegador e audio. Nao precisa baixar app. Basta visitar kpopquiz.org/blindtest e apertar Iniciar.',
  },
];

export default async function PtBlindtestPage(): Promise<React.ReactElement> {
  const [groups, stats] = await Promise.all([
    safeFetch(getBlindtestGroups(), [], '[pt/blindtest] getBlindtestGroups'),
    getStats(),
  ]);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className="bt-hub">
      <div className="bt-hub-crumbs">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/pt' }, { label: 'Blind Test' }]} />
      </div>

      <BlindtestGame
        groups={groups}
        hero={<h1 className="bt-title">Adivinhe a<br /><span className="bt-title-accent">musica de K-pop</span></h1>}
      />

      <div className="bt-hub-seo">
        <div className="bt-hub-stats">
          <div className="bt-hub-stat">
            <span className="bt-hub-stat-n">{formatCount(stats.songs)}+</span>
            <span className="bt-hub-stat-l">musicas</span>
          </div>
          <div className="bt-hub-stat">
            <span className="bt-hub-stat-n">{stats.groups}+</span>
            <span className="bt-hub-stat-l">grupos</span>
          </div>
          <div className="bt-hub-stat">
            <span className="bt-hub-stat-n">5</span>
            <span className="bt-hub-stat-l">geracoes</span>
          </div>
          <div className="bt-hub-stat">
            <span className="bt-hub-stat-n">10s</span>
            <span className="bt-hub-stat-l">por clipe</span>
          </div>
        </div>

        <section className="bt-hub-section">
          <h2 className="bt-hub-h2">Como funciona</h2>
          <div className="bt-hub-steps">
            <div className="bt-hub-step">
              <div className="bt-hub-step-n">1</div>
              <p className="bt-hub-step-t">Escolha uma playlist</p>
              <p className="bt-hub-step-d">Todo K-pop, uma geracao, ou um grupo especifico</p>
            </div>
            <div className="bt-hub-step">
              <div className="bt-hub-step-n">2</div>
              <p className="bt-hub-step-t">Ouca o clipe</p>
              <p className="bt-hub-step-d">10 segundos da musica tocam automaticamente</p>
            </div>
            <div className="bt-hub-step">
              <div className="bt-hub-step-n">3</div>
              <p className="bt-hub-step-t">Adivinhe entre 4 opcoes</p>
              <p className="bt-hub-step-d">Titulo da musica ou nome do artista antes do tempo acabar</p>
            </div>
          </div>
        </section>

        <section className="bt-hub-section">
          <h2 className="bt-hub-h2">Mais jogos de K-pop</h2>
          <div className="bt-hub-links">
            <Link href="/games/this-or-that" className="bt-hub-link">
              <span className="bt-hub-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
              </span>
              <span>
                <span className="bt-hub-link-t">This or That</span>
                <span className="bt-hub-link-d">Vote em duelos de idols de K-pop</span>
              </span>
            </Link>
            <Link href="/quizzes" className="bt-hub-link">
              <span className="bt-hub-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              </span>
              <span>
                <span className="bt-hub-link-t">Quizzes de K-pop</span>
                <span className="bt-hub-link-d">Quizzes feitos por fas para cada grupo</span>
              </span>
            </Link>
            <Link href="/games/name-all" className="bt-hub-link">
              <span className="bt-hub-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              </span>
              <span>
                <span className="bt-hub-link-t">Nomeie Todos os Membros</span>
                <span className="bt-hub-link-d">Voce consegue nomear todos os membros do seu grupo favorito?</span>
              </span>
            </Link>
          </div>
        </section>

        <section className="bt-hub-section">
          <h2 className="bt-hub-h2">Perguntas frequentes</h2>
          <div className="bt-hub-faq">
            {FAQ_ITEMS.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </div>
  );
}
