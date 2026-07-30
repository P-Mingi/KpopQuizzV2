import Link from 'next/link';

import { RelatedNavbox } from '@/components/verse/related-navbox';
import { resolvePlacements, placementsForZone } from '@/lib/verse/presentation/resolve';
import { MODULE_RENDERERS } from './space-home-modules';

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
        const R = MODULE_RENDERERS[m.type];
        if (!R) return null;
        const frame = (m.frame ?? frameDefault) as FrameStyle;
        const showDivider = i > 0 && divider !== 'none' && divider !== 'line';
        // Bare render when there is no frame and no visual divider - byte-identical
        // to the pre-W-CUSTOM page (the empty-config invariant).
        if (frame === 'none' && !showDivider) return <R key={`${m.type}-${i}`} space={space} />;
        return (
          <div key={`${m.type}-${i}`}>
            {showDivider ? <Divider kind={divider} /> : null}
            <ModuleFrame frame={frame}><R space={space} /></ModuleFrame>
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
  const frameDefault = (presentation?.frames?.default ?? 'none') as FrameStyle;
  const divider = presentation?.frames?.divider ?? 'line';

  return (
    <>
      <div className="lg:col-span-2">
        <Stack placements={main} space={space} frameDefault={frameDefault} divider={divider} />
      </div>
      <aside className="space-y-4 lg:col-span-1">
        <Stack placements={side} space={space} frameDefault={frameDefault} divider={divider} />
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
