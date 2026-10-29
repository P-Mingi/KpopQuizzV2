// Run O1, lot H2a: the small pieces the server blocks of the new home share. Server components, no state.
// Home v3 (2026-10-29): the wordmark of the board (the first part in ink, the second in the KpopQuiz pink: "Bunny" and "verse", split by
// brandWordmark from the registry name) and the image of an admin slot (lib/site/hub/home-assets.ts).
import Image from 'next/image';

import { brandWordmark } from '@/lib/site/brand';

import type { HomeAsset } from '@/lib/site/hub/home-assets';

/** The KpopQuiz rabbit as the navigation of kpopquiz.org draws it (public/mascot/mascot-default.png), at the size of its place. */
export function RabbitMark({ size, className }: { size: number; className: string }): React.ReactElement {
  return <Image src="/mascot/mascot-default.png" alt="" width={size} height={size} loading="eager" className={className} aria-hidden="true" />;
}

/** The name of the hub as the board writes it: the head in ink, the tail in the accent. */
export function HubWordmark({ className }: { className: string }): React.ReactElement {
  const { head, tail } = brandWordmark();
  return <span className={className}>{head}<span className="hub-h2-brand-tail">{tail}</span></span>;
}

/** The owner's image of a slot, filling its frame at its focal point; a decorative picture (the text beside it says what it is). */
export function SlotImage({ asset, width, height, className }: { asset: HomeAsset; width: number; height: number; className: string }): React.ReactElement {
  // A plain img: the thumbnails are made at the right sizes on upload (step 2), so the image optimizer of Vercel is not used.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.src} alt="" width={width} height={height} loading="lazy" decoding="async" className={className} style={{ objectPosition: asset.position }} />;
}
