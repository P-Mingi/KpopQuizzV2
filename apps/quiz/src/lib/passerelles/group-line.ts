// P5 (CR-025), link 3, the kpopquiz.org side (Plan.dc.html; board "Page du groupe TWICE" of Passerelles.dc.html): on a group page, "The 9 members of TWICE are in the Kpopdle".
// The one thing the group hub imports for it. With NET_KPOPDLE_GROUP off nothing else is loaded: no read, no component, no style, so the hub page keeps its bytes. The component sits behind the
// dynamic import and fails closed: any error reads as no card. Same shape as the home module (lib/ux-v1/p1/kpopdle-home.ts, CR-018).
import { flagOn, SITE_ID } from '@/lib/site/registry';

/** The kpopquiz.org switch alone (flags-env.md). Server flag: no other build ever draws the card. */
export function kpopdleGroupFlagOn(): boolean {
  return SITE_ID === 'kpop' && flagOn(process.env.NET_KPOPDLE_GROUP);
}

/**
 * The card of one group, ready to place in the page, or null: then the hub renders exactly the tree it renders without this file.
 * `memberCount` is the roster the page already shows (the name-all game), or null when it shows none.
 */
export async function loadKpopdleGroup(group: { readonly name: string }, memberCount: number | null): Promise<React.ReactElement | null> {
  if (!kpopdleGroupFlagOn()) return null;
  try {
    const { kpopdleGroup } = await import('@/components/group/ux-v1/kpopdle-group');
    return await kpopdleGroup(group.name, memberCount);
  } catch (err) {
    console.error('[group-hub] Kpopdle card hidden:', (err as Error)?.message ?? err);
    return null;
  }
}
