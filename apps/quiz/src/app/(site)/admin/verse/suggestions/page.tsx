import { requireAdmin } from '@/lib/admin/guard';

import { SuggestionsQueue } from './suggestions-queue';

export const dynamic = 'force-dynamic';

export default async function VerseSuggestionsPage(): Promise<React.ReactElement> {
  await requireAdmin();
  return <SuggestionsQueue />;
}
