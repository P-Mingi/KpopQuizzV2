// ADMIN-1 twin (rule 18) of apps/quiz/src/app/(site)/admin/k7q2m/code/page.tsx: the kpop page itself, imported, not copied
// (its requireAdmin('mfa') gate, its 404 and its form).
import AdminCodePage from '@/app/(site)/admin/k7q2m/code/page';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin | OtakuQuiz',
  robots: { index: false, follow: false },
};

export default AdminCodePage;
