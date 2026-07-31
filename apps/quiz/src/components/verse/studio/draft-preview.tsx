import { SpaceHero } from '@/components/verse/space-hero';
import { SpaceTabs } from '@/components/verse/space-tabs';
import { SpaceHomeRenderer } from '@/components/verse/presentation/space-home-renderer';
import { presentationScopeStyle } from '@/lib/verse/presentation/scope';
import { composeTabs } from '@/lib/verse/presentation/tabs';

import type { Space } from '@/lib/verse/space';
import type { Backlink } from '@/lib/verse/backlinks';

// W-CUSTOM step 10 - the studio's draft preview. Self-contained: its own verse-scope
// carries the DRAFT accent + frame tokens, and it renders the draft hero + tabs +
// module stack, so accent/preset/tab/module changes all show. Server-rendered; the
// studio refreshes it on save. Curator-only surface (the studio gates access), so
// the draft is never exposed to the public.
export function DraftPreview({ space, backlinks }: { space: Space; backlinks: Backlink[] }): React.ReactElement {
  const available = [
    { label: 'Home', seg: '' },
    { label: 'Members', seg: 'members' },
    { label: 'Discography', seg: 'discography' },
    { label: 'Timeline', seg: 'timeline' },
    // V-MODES: Quests left the reader nav (locked Q1); the preview mirrors that.
    { label: 'Essays', seg: 'essays' },
    { label: 'Community', seg: 'community' },
    { label: 'About', seg: 'about' },
  ];
  const tabs = composeTabs(available, space.presentation.tabs);

  return (
    <div className="verse-scope" style={presentationScopeStyle(space)}>
      <SpaceHero space={space} />
      <div className="mt-6">
        <SpaceTabs slug={space.group.slug} tabs={tabs} />
        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-3">
          <SpaceHomeRenderer space={space} presentation={space.presentation} backlinks={backlinks} />
        </div>
      </div>
    </div>
  );
}
