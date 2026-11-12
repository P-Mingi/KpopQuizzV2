// Bunnyverse Cards, lane B, bridge 1: server wrapper of the home block, loaded only by lib/cards-bridge/home.ts with NET_CARDS_BRIDGES on.
import { CardsHome } from './cards-home';
import { CARDS_BRIDGE_CSS } from './styles';

export function packsHome(): React.ReactElement {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CARDS_BRIDGE_CSS }} />
      <CardsHome />
    </>
  );
}
