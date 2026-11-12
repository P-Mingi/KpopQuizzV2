// Bunnyverse Cards, lane U: the footer of every Cards page: Photo credits, Report a photo, and what the game promises. Server component.
import Link from 'next/link';

export function CardsFooter(): React.ReactElement {
  return (
    <footer className="foot">
      <Link href="/credits#cards">Photo credits</Link>
      <Link href="/cards/report">Report a photo</Link>
      <span>Bunnyverse Cards is free. Packs are never sold.</span>
    </footer>
  );
}
