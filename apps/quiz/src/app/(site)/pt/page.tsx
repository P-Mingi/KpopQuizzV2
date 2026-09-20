import { Suspense } from 'react';
import Link from 'next/link';

import { getBrowseQuizzes, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { HomeQotd } from '@/components/home/home-qotd';
import { HomeBlindtestCta } from '@/components/home/home-blindtest-cta';
import { HomeGroupPills } from '@/components/home/home-group-pills';
import { QuizCard } from '@/components/ui/quiz-card';
import { ScrollRow } from '@/components/ui/scroll-row';
import { Mascot } from '@/components/ui/mascot';

import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'KpopQuiz - Quiz de K-pop Feito por Fas',
  description: 'Jogue e crie quizzes de K-pop sobre BTS, BLACKPINK, Stray Kids, aespa, NewJeans e mais de 30 grupos. Feito por fas de verdade, jogado por milhares.',
  openGraph: {
    title: 'KpopQuiz - Quiz de K-pop Feito por Fas',
    description: 'Jogue e crie quizzes de K-pop sobre BTS, BLACKPINK, Stray Kids, aespa, NewJeans e mais de 30 grupos.',
    url: '/pt',
    locale: 'pt_BR',
  },
  alternates: {
    canonical: '/pt',
    languages: {
      en: '/',
      'pt-BR': '/pt',
      'x-default': '/',
    },
  },
};

const HEAD: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14,
};
const SEE_ALL: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', whiteSpace: 'nowrap',
};

function PtHero(): React.ReactElement {
  return (
    <section className="home-hero" style={{ textAlign: 'center', padding: '24px 0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <Mascot variant="default" size={56} alt="KpopQuiz mascot" />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt1)', margin: '0 0 8px' }}>
        Quiz de <span style={{ color: 'var(--brand)' }}>K-pop</span> feito por fas
      </h1>
      <p style={{ fontSize: 14, color: 'var(--txt2)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Jogue e crie quizzes sobre BTS, BLACKPINK, Stray Kids, aespa, NewJeans e mais de 30 grupos.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/quizzes" className="btn-primary">Explorar quizzes</Link>
        <Link href="/create" className="btn-outline">Criar um quiz</Link>
      </div>
    </section>
  );
}

function SkelTrending(): React.ReactElement {
  return <section className="home-section" aria-hidden="true"><div className="home-skel home-skel-trending" /></section>;
}
function SkelGroups(): React.ReactElement {
  return <section className="home-section" aria-hidden="true"><div className="home-skel home-skel-groups" /></section>;
}
function SkelDaily(): React.ReactElement {
  return <section className="home-section" aria-hidden="true"><div className="daily-twoup"><div className="home-skel home-skel-card" /><div className="home-skel home-skel-card" /></div></section>;
}

async function QotdSection(): Promise<React.ReactElement> {
  const qotd = await safeFetch(getQuizOfTheDay(), null, '[pt/home] getQuizOfTheDay');
  if (!qotd) return <></>;
  return (
    <section className="home-section">
      <div className="daily-twoup">
        <HomeQotd quiz={qotd} />
      </div>
    </section>
  );
}

async function TrendingSection(): Promise<React.ReactElement> {
  const quizzes = await safeFetch(
    getBrowseQuizzes({ sort: 'trending', offset: 0, limit: 6 }),
    [],
    '[pt/home] trending',
  );
  if (quizzes.length === 0) return <></>;
  return (
    <section className="home-section">
      <div style={HEAD}>
        <p className="sec-label" style={{ marginBottom: 0 }}>Em alta esta semana</p>
        <Link href="/quizzes?sort=trending" style={SEE_ALL}>Ver todos →</Link>
      </div>
      <ScrollRow scrollerClassName="trending-carousel">
        {quizzes.map((q, i) => (
          <div className="trending-item" key={q.id}>
            <QuizCard quiz={q} index={i} showScore={false} />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

async function GroupSection(): Promise<React.ReactElement> {
  const groups = await safeFetch(getAllGroups(), [], '[pt/home] getAllGroups');
  return <HomeGroupPills groups={groups} />;
}

export default function PtHomePage(): React.ReactElement {
  return (
    <div className="pt-1 pb-8">
      <PtHero />

      <Suspense fallback={<SkelDaily />}>
        <QotdSection />
      </Suspense>

      <HomeBlindtestCta />

      <Suspense fallback={<SkelTrending />}>
        <TrendingSection />
      </Suspense>

      <Suspense fallback={<SkelGroups />}>
        <GroupSection />
      </Suspense>
    </div>
  );
}
