import Link from 'next/link';

import { RelatedNavbox } from '@/components/verse/related-navbox';
import { resolvePlacements, placementsForZone } from '@/lib/verse/presentation/resolve';
import { MODULE_RENDERERS } from './space-home-modules';

import type { Presentation } from '@/lib/verse/presentation/types';
import type { Space } from '@/lib/verse/space';
import type { Backlink } from '@/lib/verse/backlinks';

// W-CUSTOM step 1 - the space HOME renderer skeleton. Structure is fixed: main
// column + side rail + the fixed related-graph footer (never curator-controlled).
// Presentation only reorders/toggles the module stacks. Empty config -> default
// placements -> byte-identical to the pre-W-CUSTOM page. Later steps layer frames,
// stickers, new modules, and the hero/tab customization on this same skeleton.
export function SpaceHomeRenderer({ space, presentation, backlinks }: {
  space: Space;
  presentation?: Presentation | null;
  backlinks: Backlink[];
}): React.ReactElement {
  const placements = resolvePlacements(presentation);
  const main = placementsForZone(placements, 'main');
  const side = placementsForZone(placements, 'side');

  return (
    <>
      <div className="lg:col-span-2">
        {main.map((m, i) => {
          const R = MODULE_RENDERERS[m.type];
          return R ? <R key={`${m.type}-${i}`} space={space} /> : null;
        })}
      </div>
      <aside className="space-y-4 lg:col-span-1">
        {side.map((m, i) => {
          const R = MODULE_RENDERERS[m.type];
          return R ? <R key={`${m.type}-${i}`} space={space} /> : null;
        })}
      </aside>
      <div className="lg:col-span-3">
        <RelatedNavbox group={space.group} />
        {backlinks.length > 0 ? (
          <nav aria-label="Mentioned by" className="mt-3 text-sm text-secondary">
            <span className="text-tertiary">Mentioned by: </span>
            {backlinks.map((b, i) => (
              <span key={b.slug}>
                <Link href={`/verse/${b.slug}`} className="no-underline hover:text-primary">{b.name}</Link>
                {i < backlinks.length - 1 ? <span className="text-tertiary">, </span> : null}
              </span>
            ))}
          </nav>
        ) : null}
      </div>
    </>
  );
}
