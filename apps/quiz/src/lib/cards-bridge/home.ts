// Bunnyverse Cards, lane B, bridge 1: the one thing the kpopquiz.org home imports for the "Your packs" block. With NET_CARDS_BRIDGES off nothing
// else is loaded: no read, no component, no style, so the home keeps its bytes (the shape of lib/ux-v1/p1/kpopdle-home.ts). Any error reads as no block.
import { cardsBridgesKpopOn } from './flags';

export async function loadCardsHome(): Promise<React.ReactElement | null> {
  if (!cardsBridgesKpopOn()) return null;
  try {
    const { packsHome } = await import('@/components/cards-bridge/packs-home');
    return packsHome();
  } catch (err) {
    console.error('[home] Cards block hidden:', (err as Error)?.message ?? err);
    return null;
  }
}
