import { getBrowseQuizzes } from '@/lib/db/queries/quizzes';
import { BrowseQuizzes } from '@/components/quiz/browse-quizzes';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { BrowseGroup } from '@/components/quiz/browse-quizzes';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Quiz de K-pop - Todos os Quizzes | KpopQuiz',
  description:
    'Explore todos os quizzes de K-pop: BTS, BLACKPINK, Stray Kids, aespa, NewJeans e mais de 30 grupos. Filtre por grupo, tipo e dificuldade. Feito por fas.',
  alternates: {
    canonical: '/pt/quizzes',
    languages: {
      en: '/quizzes',
      'pt-BR': '/pt/quizzes',
      'x-default': '/quizzes',
    },
  },
  openGraph: {
    title: 'Quiz de K-pop | KpopQuiz',
    description: 'Todos os quizzes de K-pop em um lugar. Filtre por grupo ou tipo.',
    url: '/pt/quizzes',
    locale: 'pt_BR',
  },
};

export default async function PtQuizzesPage(): Promise<React.ReactElement> {
  const [initialQuizzes, groups] = await Promise.all([
    safeFetch(getBrowseQuizzes({ groupId: null, quizType: null, sort: 'most_played', offset: 0, limit: 48 }), [], '[pt/quizzes] getBrowseQuizzes'),
    safeFetch(getAllGroups(), [], '[pt/quizzes] getAllGroups'),
  ]);

  const groupsForFilter: BrowseGroup[] = groups
    .filter((g) => g.quiz_count > 0)
    .slice(0, 40)
    .map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      logo_url: g.logo_url,
      display_color: g.display_color,
      text_color: g.text_color,
    }));

  return (
    <div className="pt-4 md:pt-6 pb-8">
      <Breadcrumbs items={[{ label: 'Inicio', href: '/pt' }, { label: 'Quizzes' }]} />

      <header style={{ margin: '4px 0' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0, color: 'var(--txt1)' }}>
          Explorar <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--brand)' }}>quizzes</span>
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: 'var(--txt2)' }}>
          Filtre por grupo, tipo ou ordene como quiser.
        </p>
      </header>

      <BrowseQuizzes
        initialQuizzes={initialQuizzes}
        groups={groupsForFilter}
        initialGroup={null}
        initialType={null}
        initialSort="all"
      />
    </div>
  );
}
