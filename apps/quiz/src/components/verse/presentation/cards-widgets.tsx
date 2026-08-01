import { getPhotocards } from '@/lib/verse/photocards';
import { getCollectibles } from '@/lib/verse/collectibles';
import { BinderWidget } from '@/components/verse/binder-widget';
import { ShelfWidget } from '@/components/verse/shelf-widget';

import type { ModuleProps } from './module-registry';

// V-CARDS-MAX step 7 - the widget-duality wrappers. Async server modules that
// min-gate on the catalog (hide at 0) and hand a small id->name list to the
// client widget, so only the personal own/want state is fetched in the browser.

export async function BinderWidgetModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const cards = await getPhotocards(space.group.id);
  if (!cards.length) return null;
  return <BinderWidget groupId={space.group.id} groupSlug={space.group.slug} cards={cards.map((c) => ({ id: c.id, name: c.name }))} />;
}

export async function ShelfWidgetModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const items = await getCollectibles(space.group.id);
  if (!items.length) return null;
  return <ShelfWidget groupId={space.group.id} groupSlug={space.group.slug} items={items.map((i) => ({ id: i.id, kind: i.kind }))} />;
}
