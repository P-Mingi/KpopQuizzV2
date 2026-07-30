import Link from 'next/link';

import { RelatedNavbox } from '@/components/verse/related-navbox';
import { resolvePlacements, placementsForZone } from '@/lib/verse/presentation/resolve';
import { ALL_MODULES } from './module-registry';
import { StickerLayer } from './sticker-layer';

import type { Presentation, ModulePlacement } from '@/lib/verse/presentation/types';
import type { FrameStyle } from '@/lib/verse/presentation/registry';
import type { Space } from '@/lib/verse/space';
import type { Backlink } from '@/lib/verse/backlinks';

// A module wears a frame (its own, else the config default). 'none' renders no
// wrapper, so an empty config is byte-identical to the pre-W-CUSTOM page.
function ModuleFrame({ frame, children }: { frame: FrameStyle; children: React.ReactNode }): React.ReactElement {
  if (frame === 'none') return <>{children}</>;
  return <div className={`verse-frame verse-frame-${frame}`}>{children}</div>;
}

// Themed divider between modules in a zone. 'line' with no config resolves to the
// modules' own spacing (nothing extra rendered), preserving the default look.
function Divider({ kind }: { kind: string }): React.ReactElement | null {
  if (kind === 'none' || kind === 'line') return null;
  return <div className={`verse-divider verse-divider-${kind}`} aria-hidden />;
}

function Stack({ placements, space, frameDefault, divider }: {
  placements: ModulePlacement[]; space: Space; frameDefault: FrameStyle; divider: string;
}): React.ReactElement {
  return (
    <>
      {placements.map((m, i) => {
        const R = ALL_MODULES[m.type];
        if (!R) return null;
        const frame = (m.frame ?? frameDefault) as FrameStyle;
        const showDivider = i > 0 && divider !== 'none' && divider !== 'line';
        const hasSeam = i > 0 && (space.presentation.stickers ?? []).some((s) => s.slot === 'seam' && (s.anchorIndex ?? 0) === i);
        // Bare render when there is no frame, divider, or seam sticker - byte-identical
        // to the pre-W-CUSTOM page (the empty-config invariant).
        if (frame === 'none' && !showDivider && !hasSeam) return <R key={`${m.type}-${i}`} space={space} placement={m} />;
        return (
          <div key={`${m.type}-${i}`}>
            {showDivider ? <Divider kind={divider} /> : null}
            {hasSeam ? <div className="my-1 flex flex-wrap justify-center gap-1" aria-hidden><StickerLayer space={space} slot="seam" anchorIndex={i} /></div> : null}
            <ModuleFrame frame={frame}><R space={space} placement={m} /></ModuleFrame>
          </div>
        );
      })}
    </>
  );
}

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
  // V-DESIGN v2 box model: the side rail is boxed by default (a clean soft-surface
  // card), the main column stays open so the media grids breathe. A curator's
  // explicit frames.default overrides both zones; a per-module frame still wins
  // over that, so any box is fully customizable and can be toggled off.
  const configuredDefault = presentation?.frames?.default;
  const mainFrameDefault = (configuredDefault ?? 'none') as FrameStyle;
  const sideFrameDefault = (configuredDefault ?? 'rounded') as FrameStyle;
  const divider = presentation?.frames?.divider ?? 'line';

  return (
    <>
      <div className="lg:col-span-2">
        <Stack placements={main} space={space} frameDefault={mainFrameDefault} divider={divider} />
      </div>
      <aside className="lg:col-span-1">
        <Stack placements={side} space={space} frameDefault={sideFrameDefault} divider={divider} />
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
