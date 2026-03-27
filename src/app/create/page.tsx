import { Suspense } from 'react';

import { getAllGroups } from '@/lib/db/queries/groups';
import { CreateFormatSelector } from '@/components/create/format-selector';
import { Spinner } from '@/components/ui/spinner';

export const metadata = {
  title: 'Create | KpopQuiz',
  description: 'Create a K-pop quiz or This or That game in under 3 minutes and challenge your fandom.',
};

export default async function CreatePage(): Promise<React.ReactElement> {
  const groups = await getAllGroups();

  const groupOptions = groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
  }));

  return (
    <div className="py-6">
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
        <CreateFormatSelector groups={groupOptions} />
      </Suspense>
    </div>
  );
}
