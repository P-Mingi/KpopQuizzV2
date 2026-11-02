// P5 (CR-025), link 10 (Plan.dc.html): the "Daily games" module of the OtakuQuiz home (bunnyverse.org/anime): Otakudle, One Piece, Dragon Ball, each with Play. Built from the Kpopdle module of the
// kpopquiz.org home (Passerelle-kpopquiz.dc.html board 2) in the anime colours (the --ux-pink tokens are the orange of the site there). No K-pop game in it.
// The one thing the home imports for it. Off (the hub's dailyGuess false, the default) nothing else is loaded: no read, no component, no style, so the home keeps its bytes. Everything else sits
// behind the dynamic import and fails closed: any error reads as no module.
import { REGISTRY, SITE_ID } from '@/lib/site/registry';

/** The OtakuQuiz build with the hub's switch on. The anime build has no flag of its own: dailyGuess, a code constant of the registry, is the owner's switch. */
export function animeDailyHomeOn(): boolean {
  return SITE_ID === 'anime' && REGISTRY.hub.features.dailyGuess === true;
}

/** The module, ready to place in the page, or null: then UxHome renders exactly the tree it renders without this file. */
export async function loadAnimeDailyHome(): Promise<React.ReactElement | null> {
  if (!animeDailyHomeOn()) return null;
  try {
    const { animeDailyHome } = await import('@/components/home/ux-v1/anime-daily-home');
    return await animeDailyHome();
  } catch (err) {
    console.error('[home] Daily games module hidden:', (err as Error)?.message ?? err);
    return null;
  }
}
