// C2: the Kpopdle module of the kpopquiz.org home (RAPPORT-JEUX-DU-JOUR-v2.md 13.4, decision 3; board 2 of Passerelle-kpopquiz.dc.html), CR-018.
// The one thing the home imports for it. With NET_KPOPDLE_HOME off nothing else is loaded: no read, no component, no style, so the home keeps its
// bytes, its page data and its stylesheet list. Everything else sits behind the dynamic import, and fails closed: any error reads as no module.
import { flagOn, SITE_ID } from '@/lib/site/registry';

/** The kpopquiz.org switch alone (flags-env.md). Server flag: no other build ever draws the module. */
export function kpopdleHomeFlagOn(): boolean {
  return SITE_ID === 'kpop' && flagOn(process.env.NET_KPOPDLE_HOME);
}

/** The module, ready to place in the page, or null: then UxHome renders exactly the tree it renders without this file. */
export async function loadKpopdleHome(): Promise<React.ReactElement | null> {
  if (!kpopdleHomeFlagOn()) return null;
  try {
    const { kpopdleHome } = await import('@/components/home/ux-v1/kpopdle-home');
    return await kpopdleHome();
  } catch (err) {
    console.error('[home] Kpopdle module hidden:', (err as Error)?.message ?? err);
    return null;
  }
}
