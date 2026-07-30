// W-CUSTOM step 9 - tab composition. The curator picks a subset of the tabs that
// actually have content; hidden tabs are removed from the NAV only - their pages
// stay live, in the sitemap, and reachable via the related-graph footer. Home is
// always present and first.
import type { TabId } from './types';

export interface SpaceTab { label: string; seg: string }

export function segForTab(id: TabId): string { return id === 'home' ? '' : id; }

export function composeTabs(available: SpaceTab[], picked?: TabId[] | null): SpaceTab[] {
  if (!picked || picked.length === 0) return available;
  const bySeg = new Map(available.map((t) => [t.seg, t]));
  const out: SpaceTab[] = [];
  const home = bySeg.get('');
  if (home) out.push(home);
  for (const id of picked) {
    const seg = segForTab(id);
    if (seg === '') continue;
    const t = bySeg.get(seg);
    if (t && !out.includes(t)) out.push(t);
  }
  return out.length >= 1 ? out : available;
}
