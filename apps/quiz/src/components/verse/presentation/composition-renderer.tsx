import { SpaceHomeRenderer } from './space-home-renderer';
import { compositionToPresentation } from '@/lib/verse/composition/convert';

import type { Composition } from '@/lib/verse/composition/types';
import type { Space } from '@/lib/verse/space';
import type { Backlink } from '@/lib/verse/backlinks';

// V-BUILDER-1 step 3 - THE ONE composition renderer. The space home now renders
// THROUGH the unified Composition: the page converts presentation -> composition,
// and this renders it. It delegates to the existing zone/frame/divider skeleton
// (SpaceHomeRenderer as the low-level primitive, a thin-wrapper relationship), so
// the output is byte-identical to before (the converter is lossless; proven). This
// is the component Phase 2's edit-in-place canvas renders.
export function CompositionRenderer({ space, composition, backlinks, builder }: {
  space: Space;
  composition: Composition;
  backlinks: Backlink[];
  // Builder canvas only (the /build route): emit stable data-block-id handles per
  // block for the selection overlay. Off on the published page.
  builder?: boolean;
}): React.ReactElement {
  return <SpaceHomeRenderer space={space} presentation={compositionToPresentation(composition)} backlinks={backlinks} builder={builder ?? false} />;
}
