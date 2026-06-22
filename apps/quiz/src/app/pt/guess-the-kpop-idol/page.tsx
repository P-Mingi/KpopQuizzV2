import Link from 'next/link';

import { getQuizzesByType } from '@/lib/db/queries/quizzes';
import { QuizCard } from '@/components/quiz/quiz-card';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Adivinhe o Idol de K-pop - Quizzes de Dicas',
  description:
    'Voce consegue identificar idols de K-pop a partir de 3 dicas? Jogue quizzes de adivinhar por dicas sobre BTS, BLACKPINK, Stray Kids, SEVENTEEN e mais. Menos dicas = mais pontos.',
  alternates: {
    canonical: '/pt/guess-the-kpop-idol',
    languages: {
      en: '/guess-the-kpop-idol',
      'pt-BR': '/pt/guess-the-kpop-idol',
      'x-default': '/guess-the-kpop-idol',
    },
  },
  openGraph: {
    title: 'Adivinhe o Idol de K-pop | KpopQuiz',
    description: 'Quantas dicas voce precisa? Jogue quizzes de adivinhar K-pop.',
    url: '/pt/guess-the-kpop-idol',
    locale: 'pt_BR',
  },
};

export default async function PtGuessPage(): Promise<React.ReactElement> {
  const quizzes = await safeFetch(
    getQuizzesByType('guess_from_clues', 0, 30),
    [],
    '[pt/guess] getQuizzesByType',
  );

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary">Adivinhe o idol de K-pop</h1>
      <p className="text-sm text-secondary mt-1 leading-relaxed">
        Voce recebe 3 dicas. Adivinhe com menos dicas para mais pontos.
        O quanto voce realmente conhece seus favoritos?
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
