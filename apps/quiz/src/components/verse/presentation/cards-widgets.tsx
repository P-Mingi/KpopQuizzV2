import { getCollectibles } from '@/lib/verse/collectibles';
import { ShelfWidget } from '@/components/verse/shelf-widget';

import type { ModuleProps } from './module-registry';

// V-CARDS-MAX step 7 - the widget-duality wrapper. An async server module that
// min-gates on the catalog (hides at 0) and hands a small id->kind list to the
// client widget, so only the personal own/want state is fetched in the browser.

export async function ShelfWidgetModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const items = await getCollectibles(space.group.id);
  if (!items.length) return null;
  return <ShelfWidget groupId={space.group.id} groupSlug={space.group.slug} items={items.map((i) => ({ id: i.id, kind: i.kind }))} />;
}
