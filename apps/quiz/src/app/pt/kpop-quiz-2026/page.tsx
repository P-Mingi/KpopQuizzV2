import Link from 'next/link';

import { getQuizzesByYear } from '@/lib/db/queries/quizzes';
import { QuizCard } from '@/components/quiz/quiz-card';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const revalidate = 60;

const YEAR = 2026;

export const metadata: Metadata = {
  title: 'Quiz de K-pop 2026 - Ultimos Comebacks e Eventos',
  description:
    'Os quizzes de K-pop mais recentes de 2026. BTS ARIRANG, novos debuts, comebacks e tudo que esta acontecendo no K-pop agora. Atualizado diariamente pelos fas.',
  alternates: {
    canonical: '/pt/kpop-quiz-2026',
    languages: {
      en: '/kpop-quiz-2026',
      'pt-BR': '/pt/kpop-quiz-2026',
      'x-default': '/kpop-quiz-2026',
    },
  },
  openGraph: {
    title: 'Quiz de K-pop 2026 | KpopQuiz',
    description: 'Os quizzes de K-pop mais recentes de 2026. Atualizado diariamente pelos fas.',
    url: '/pt/kpop-quiz-2026',
    locale: 'pt_BR',
  },
};

export default async function PtQuiz2026Page(): Promise<React.ReactElement> {
  const quizzes = await safeFetch(
    getQuizzesByYear(YEAR, 0, 50),
    [],
    '[pt/quiz-2026] getQuizzesByYear',
  );

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary">Quiz de K-pop {YEAR}</h1>
      <p className="text-sm text-secondary mt-1 leading-relaxed">
        Os quizzes mais recentes cobrindo os comebacks, debuts e eventos
        deste ano. Atualizado diariamente conforme fas criam novo conteudo.
      </p>

      {quizzes.length > 0 ? (
        <div className="space-y-3 mt-5">
          {quizzes.map((q) => (
            <QuizCard key={q.id} quiz={q} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-secondary">Nenhum quiz de {YEAR} ainda. Seja o primeiro a criar um!</p>
          <Link href="/create" className="inline-block mt-4 px-6 py-3 rounded-full bg-accent text-white text-sm font-medium">
            Criar um quiz
          </Link>
        </div>
      )}
    </div>
  );
}
