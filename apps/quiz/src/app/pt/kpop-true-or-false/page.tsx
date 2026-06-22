import Link from 'next/link';

import { getQuizzesByType } from '@/lib/db/queries/quizzes';
import { QuizCard } from '@/components/quiz/quiz-card';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'K-pop Verdadeiro ou Falso - Quizzes',
  description:
    'O quanto voce realmente sabe sobre fatos de K-pop? Jogue quizzes de verdadeiro ou falso sobre BTS, BLACKPINK, SEVENTEEN, Stray Kids e mais de 30 grupos.',
  alternates: {
    canonical: '/pt/kpop-true-or-false',
    languages: {
      en: '/kpop-true-or-false',
      'pt-BR': '/pt/kpop-true-or-false',
      'x-default': '/kpop-true-or-false',
    },
  },
  openGraph: {
    title: 'K-pop Verdadeiro ou Falso | KpopQuiz',
    description: 'Parecem faceis. Nao sao. Teste seu conhecimento de K-pop.',
    url: '/pt/kpop-true-or-false',
    locale: 'pt_BR',
  },
};

export default async function PtTrueOrFalsePage(): Promise<React.ReactElement> {
  const quizzes = await safeFetch(
    getQuizzesByType('true_false', 0, 30),
    [],
    '[pt/true-or-false] getQuizzesByType',
  );

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary">K-pop verdadeiro ou falso</h1>
      <p className="text-sm text-secondary mt-1 leading-relaxed">
        Parecem faceis ate voce errar a resposta e questionar tudo
        que achava que sabia.
      </p>

      {quizzes.length > 0 ? (
        <div className="space-y-3 mt-5">
          {quizzes.map((q) => (
            <QuizCard key={q.id} quiz={q} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-secondary">Nenhum quiz ainda. Seja o primeiro a criar um!</p>
          <Link href="/create" className="inline-block mt-4 px-6 py-3 rounded-full bg-accent text-white text-sm font-medium">
            Criar um quiz
          </Link>
        </div>
      )}
    </div>
  );
}
