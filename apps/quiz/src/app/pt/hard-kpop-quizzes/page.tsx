import Link from 'next/link';

import { getQuizzesByDifficulty } from '@/lib/db/queries/quizzes';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quizzes Dificeis de K-pop para Experts',
  description: 'Acha que sabe tudo sobre K-pop? Teste seus conhecimentos com estes quizzes dificeis feitos por fas. Taxa de acerto abaixo de 40%.',
  alternates: {
    canonical: '/pt/hard-kpop-quizzes',
    languages: {
      en: '/hard-kpop-quizzes',
      'pt-BR': '/pt/hard-kpop-quizzes',
      'x-default': '/hard-kpop-quizzes',
    },
  },
  openGraph: {
    title: 'Quizzes Dificeis de K-pop | KpopQuiz',
    description: 'Os quizzes de K-pop mais dificeis: voce consegue passar?',
    url: '/pt/hard-kpop-quizzes',
    locale: 'pt_BR',
  },
};

export default async function PtHardQuizzesPage(): Promise<React.ReactElement> {
  const initialQuizzes = await safeFetch(
    getQuizzesByDifficulty('hard', 0, 10),
    [],
    '[pt/hard] getQuizzesByDifficulty',
  );

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary mb-1">Quizzes dificeis de K-pop</h1>
      <p className="text-sm text-secondary mb-5">
        Acha que sabe tudo? Estes quizzes tem taxa de acerto abaixo de 40%.
      </p>

      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=hard" />
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-secondary mb-3">Nenhum quiz dificil ainda.</p>
          <Link href="/create" className="inline-block px-5 py-2.5 rounded-full bg-btn text-white text-sm font-medium">
            Crie o primeiro
          </Link>
        </div>
      )}
    </div>
  );
}
