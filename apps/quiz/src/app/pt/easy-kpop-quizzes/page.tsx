import Link from 'next/link';

import { getQuizzesByDifficulty } from '@/lib/db/queries/quizzes';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quizzes Faceis de K-pop para Iniciantes',
  description: 'Novo no K-pop? Comece com estes quizzes faceis feitos por fas. Perfeito para iniciantes e fas casuais que querem testar seus conhecimentos basicos sobre BTS, BLACKPINK, Stray Kids e mais.',
  alternates: {
    canonical: '/pt/easy-kpop-quizzes',
    languages: {
      en: '/easy-kpop-quizzes',
      'pt-BR': '/pt/easy-kpop-quizzes',
      'x-default': '/easy-kpop-quizzes',
    },
  },
  openGraph: {
    title: 'Quizzes Faceis de K-pop para Iniciantes | KpopQuiz',
    description: 'Comece aqui: quizzes faceis de K-pop perfeitos para novos fas.',
    url: '/pt/easy-kpop-quizzes',
    locale: 'pt_BR',
  },
};

export default async function PtEasyQuizzesPage(): Promise<React.ReactElement> {
  const initialQuizzes = await safeFetch(
    getQuizzesByDifficulty('easy', 0, 10),
    [],
    '[pt/easy] getQuizzesByDifficulty',
  );

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary mb-1">Quizzes faceis de K-pop</h1>
      <p className="text-sm text-secondary mb-5">
        Perfeito para novos fas ou um aquecimento rapido. Estes quizzes tem taxa de acerto acima de 70%.
      </p>

      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=easy" />
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-secondary mb-3">Nenhum quiz facil ainda.</p>
          <Link href="/create" className="inline-block px-5 py-2.5 rounded-full bg-btn text-white text-sm font-medium">
            Crie o primeiro
          </Link>
        </div>
      )}
    </div>
  );
}
