// Run O1, lot (e) part 2 (E1a): the admin of the anime build. Its dashboard is the kpop page itself (rule 18: imported, not copied); its
// reads of quizzes, reports and groups go through forSite, so on this build it shows the anime site only.
// Run O1 (ADM front): /admin now opens on tabs. Images is the first (the owner's own pictures of the series and the characters); the
// dashboard is the second, and room is left for more. The server gate is here: a signed-out visitor and any account that is not in
// ADMIN_USER_IDS get the 404 of the site, for every tab, before anything is read.
import { notFound } from 'next/navigation';

import AdminPage from '@/app/(site)/admin/page';
import { ImagesAdmin } from '@/components/anime/admin/images-admin';
import { Segmented } from '@/components/ux-v1/segmented';
import { UxPage } from '@/components/ux-v1/page';
import { isAdmin } from '@/lib/admin';
import { ADMIN_TABS, adminGate, adminTabOf } from '@/lib/anime/admin-tabs';
import { createServerClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | OtakuQuiz',
  robots: { index: false, follow: false },
};

interface AdminProps { searchParams?: Promise<{ tab?: string | string[] }> }

export default async function AnimeAdminPage({ searchParams }: AdminProps): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (adminGate(user?.id, isAdmin) === 'notfound') notFound();

  const tab = adminTabOf((await searchParams)?.tab);
  return (
    <UxPage width="wide" className="anime-adm-page">
      <h1 className="ux-h1">Admin</h1>
      <div className="anime-adm-tabs">
        <Segmented
          label="Admin sections"
          value={tab}
          options={ADMIN_TABS.map((t) => ({ value: t.id, label: t.label, href: `/admin?tab=${t.id}` }))}
        />
      </div>
      {tab === 'images' ? <ImagesAdmin /> : <AdminPage />}
    </UxPage>
  );
}
