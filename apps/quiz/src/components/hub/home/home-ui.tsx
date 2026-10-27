// Run O1, lot H2a: the small pieces the server blocks of the new home share (the rabbit marks, the phone and desktop variants of one
// text). Server components, no state.
import Image from 'next/image';

import rabbitWhite from './rabbit-white.png';


/** A text that is not the same on the phone board and on the desktop board: both are in the markup, the sheet shows one. */
export function Dual({ desktop, phone }: { desktop: React.ReactNode; phone: React.ReactNode }): React.ReactElement {
  return (
    <>
      <span className="hub-h2-nophone">{desktop}</span>
      <span className="hub-h2-phoneonly">{phone}</span>
    </>
  );
}

/** The KpopQuiz rabbit as the navigation of kpopquiz.org draws it (public/mascot/mascot-default.png), at the size of its place. */
export function RabbitMark({ size, className }: { size: number; className: string }): React.ReactElement {
  return <Image src="/mascot/mascot-default.png" alt="" width={size} height={size} loading="eager" className={className} aria-hidden="true" />;
}

/** The rabbit in white (rabbit-white.png), for the tile of a door. */
export function RabbitWhite({ size, className }: { size: number; className: string }): React.ReactElement {
  return <Image src={rabbitWhite} alt="" width={size} height={size} className={className} aria-hidden="true" />;
}
