import Link from 'next/link';

import { RelatedNavbox } from '@/components/verse/related-navbox';
import { resolvePlacements, placementsForZone } from '@/lib/verse/presentation/resolve';
import { blockId } from '@/lib/verse/composition/convert';
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

// Modules that read as open editorial content by default (no box): photo grids
// so the images breathe (owner: open by default, box optional), the intro lede,
// the vitals line ("one quiet line, not boxes" - locked 3a), and the story prose.
// A curator can still box any of them per module.
const OPEN_BY_DEFAULT = new Set<string>(['members', 'intro', 'vitals', 'story']);

function Stack({ placements, space, frameDefault, divider, builder, idOf }: {
  placements: ModulePlacement[]; space: Space; frameDefault: FrameStyle; divider: string;
  // Builder mode (the /build canvas only): every block is wrapped in a stable-id
  // handle the parent overlay reads to select it. Never set on the published page,
  // so the reader HTML is unchanged (the empty-config byte-identity holds there).
  builder?: boolean; idOf?: Map<ModulePlacement, string>;
}): React.ReactElement {
  return (
    <>
      {placements.map((m, i) => {
        const R = ALL_MODULES[m.type];
        if (!R) return null;
        let frame = (m.frame ?? (OPEN_BY_DEFAULT.has(m.type) ? 'none' : frameDefault)) as FrameStyle;
        // the rhythm: even visible modules boxed, odd open (per-module picks win)
        if (frame === 'alternate') frame = (m.frame ? 'rounded' : (i % 2 === 0 ? 'rounded' : 'none'));
        const showDivider = i > 0 && divider !== 'none' && divider !== 'line';
        const hasSeam = i > 0 && (space.presentation.stickers ?? []).some((s) => s.slot === 'seam' && (s.anchorIndex ?? 0) === i);
        const divEl = showDivider ? <Divider kind={divider} /> : null;
        const seamEl = hasSeam ? <div className="my-1 flex flex-wrap justify-center gap-1" aria-hidden><StickerLayer space={space} slot="seam" anchorIndex={i} /></div> : null;

        // Builder canvas: wrap EVERY block in its stable-id handle. The module HTML
        // inside is the real render (zero drift); only the wrapper + data-* is added.
        if (builder) {
          return (
            <div key={`${m.type}-${i}`} data-block-id={idOf?.get(m)} data-block-type={m.type} className="vb-block">
              {divEl}
              {seamEl}
              <ModuleFrame frame={frame}><R space={space} placement={m} /></ModuleFrame>
            </div>
          );
        }

        // Bare render when there is no frame, divider, or seam sticker - byte-identical
        // to the pre-W-CUSTOM page (the empty-config invariant).
        if (frame === 'none' && !showDivider && !hasSeam) return <R key={`${m.type}-${i}`} space={space} placement={m} />;
        return (
          <div key={`${m.type}-${i}`}>
            {divEl}
            {seamEl}
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
export function SpaceHomeRenderer({ space, presentation, backlinks, builder }: {
  space: Space;
  presentation?: Presentation | null;
  backlinks: Backlink[];
  // Builder canvas only: stamp each block with its stable data-block-id handle.
  builder?: boolean;
}): React.ReactElement {
  const placements = resolvePlacements(presentation);
  const main = placementsForZone(placements, 'main');
  const side = placementsForZone(placements, 'side');
  // Stable block ids, minted exactly as the composition converter does: the Nth
  // block of its type counted across the zones in (main, then side) order. Built
  // once here so both Stacks share one counter (a type used in both zones keeps
  // distinct ids). Only used in builder mode.
  const idOf = new Map<ModulePlacement, string>();
  if (builder) {
    const nthByType: Record<string, number> = {};
    for (const m of [...main, ...side]) {
      const nth = nthByType[m.type] ?? 0;
      nthByType[m.type] = nth + 1;
      idOf.set(m, blockId(m.type, nth));
    }
  }
  // V-DESIGN v2 box model: every module sits in a clean soft-surface box by
  // default (both columns). A curator's explicit frames.default overrides both
  // zones; a per-module frame still wins over that, so any box is fully
  // customizable - change its radius/colour, drop its background ('outline'), or
  // remove it entirely ('none').
  const configuredDefault = presentation?.frames?.default;
  // V4 Part 1 item 1: the DEFAULT main-column rhythm alternates (boxed, open,
  // boxed...) so the home stops reading as a stack of same-weight cards. The
  // rail stays uniformly boxed (its quietness IS the contrast). Curators
  // override via the same Frame select as ever.
  const mainFrameDefault = (configuredDefault ?? 'alternate') as FrameStyle;
  const sideFrameDefault = ((configuredDefault === 'alternate' ? 'rounded' : configuredDefault) ?? 'rounded') as FrameStyle;
  const divider = presentation?.frames?.divider ?? 'line';

  return (
    <>
      <div className="lg:col-span-2">
        <Stack placements={main} space={space} frameDefault={mainFrameDefault} divider={divider} builder={builder ?? false} idOf={idOf} />
      </div>
      {/* V-POLISH-2 A4: the rail follows the scroll (sticky under the app bar);
          the audit's blank right third from ~1000px down dies here. */}
      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-[84px]">
          <Stack placements={side} space={space} frameDefault={sideFrameDefault} divider={divider} builder={builder ?? false} idOf={idOf} />
        </div>
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
