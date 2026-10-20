// Run O1, lot (e) part 2 (E1a): the quiz search of the anime admin is the kpop page itself (rule 18: imported, not
// copied); its read goes through forSite.
import QuizSearchPage from '@/app/(site)/admin/quiz/search/page';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Quizzes | Admin | OtakuQuiz',
  robots: { index: false, follow: false },
};

export default QuizSearchPage;
