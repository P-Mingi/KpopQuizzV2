// ADMIN-1 review: the guard layout of the anime admin, like the kpop one (app/(site)/admin/layout.tsx). It answers notFound() from above the
// admin tree before any page runs, so a refused visitor never renders an admin page, whatever that page throws. Each page keeps its own
// requireAdmin: a layout is not re-run on a client navigation.
import { notFound } from 'next/navigation';

import { requireAdmin } from '@/lib/admin/guard';

export default async function AnimeAdminLayout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {
  const admin = await requireAdmin('mfa');
  if (!admin) notFound();
  return children as React.ReactElement;
}
