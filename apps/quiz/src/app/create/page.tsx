import { Suspense } from 'react';

import { getAllGroups } from '@/lib/db/queries/groups';
import { CreateFormatSelector } from '@/components/create/format-selector';
import { Spinner } from '@/components/ui/spinner';

export const metadata = {
  title: 'Create | KpopQuiz',
  description: 'Create a K-pop quiz in under 3 minutes and challenge your fandom.',
};

export default async function CreatePage(): Promise<React.ReactElement> {
  const groups = await getAllGroups();

  const groupOptions = groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
  }));

  return (
    <div className="pt-4 md:pt-6 pb-8">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-primary">Create a quiz</h1>
        <p className="text-xs text-ghost mt-0.5">
          Pick a group, add your questions, share with the fandom.
        </p>
      </div>
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
        <CreateFormatSelector groups={groupOptions} />
      </Suspense>
    </div>
  );
}
