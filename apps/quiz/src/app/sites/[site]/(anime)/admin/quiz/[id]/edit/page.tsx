// Run O1, lot (e) part 2 (E1a): the quiz editor of the anime admin is the kpop page itself (rule 18: imported, not
// copied); its read goes through forSite, so a quiz of another site is a 404 here.
import EditQuizPage from '@/app/(site)/admin/quiz/[id]/edit/page';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Quiz | Admin | OtakuQuiz',
  robots: { index: false, follow: false },
};

export default EditQuizPage;
