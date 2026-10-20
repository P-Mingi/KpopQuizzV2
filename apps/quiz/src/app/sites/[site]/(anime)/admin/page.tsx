// Run O1, lot (e) part 2 (E1a): the admin dashboard of the anime build is the kpop page itself (rule 18: imported, not
// copied). Its reads of quizzes, reports and groups go through forSite, so on this build it shows the anime site only.
import AdminPage from '@/app/(site)/admin/page';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | OtakuQuiz',
  robots: { index: false, follow: false },
};

export default AdminPage;
