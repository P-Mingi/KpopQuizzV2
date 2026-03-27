import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getAllGroups } from '@/lib/db/queries/groups';
import { BlindTestCreator } from './blind-test-creator';

export default async function CreateBlindTestPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) redirect('/');

  const groups = await getAllGroups();
  const groupOptions = groups.map(g => ({ id: g.id, name: g.name, slug: g.slug }));

  return (
    <div className="py-6">
      <BlindTestCreator groups={groupOptions} />
    </div>
  );
}
