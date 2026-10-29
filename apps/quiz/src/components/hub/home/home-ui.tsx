// Run O1, lot H2a: the small pieces the server blocks of the new home share. Server components, no state.
// Home v3 (2026-10-29): the wordmark of the board (the first part in ink, the second in the pink of the mockups: "Bunny" and "verse", split by
// brandWordmark from the registry name) and the image of an admin slot (lib/site/hub/home-assets.ts).
// Owner decision 2026-10-29: the tail's class is the one the shared shell's wordmark gets on the hub (wordmarkTailClass of lib/site/brand.ts);
// its rule reads the token --hub-brand-tail, the one source of that colour on every hub page.
// Review fix: "Source: <name>" beside a fact, the name a link to the source (SEO rules 3.8 and 5.5).
import Image from 'next/image';

import { brandWordmark } from '@/lib/site/brand';
import { ht } from '@/lib/site/hub/copy';

import type { HomeAsset } from '@/lib/site/hub/home-assets';

/** The KpopQuiz rabbit as the navigation of kpopquiz.org draws it (public/mascot/mascot-default.png), at the size of its place. */
export function RabbitMark({ size, className }: { size: number; className: string }): React.ReactElement {
  return <Image src="/mascot/mascot-default.png" alt="" width={size} height={size} loading="eager" className={className} aria-hidden="true" />;
}

/** The name of the hub as the board writes it: the head in ink, the tail in --hub-brand-tail (the class wordmarkTailClass gives the hub). */
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

/**
 * "Source: <name>" beside a fact, the name a link to the source's page. `url` is an absolute https URL (the loaders keep no other); React
 * escapes the name and the address at this sink. nofollow: a citation, not an endorsement; noopener: the source never reaches this page.
 */
export function FactSource({ name, url, className }: { name: string; url: string; className: string }): React.ReactElement {
  const [before = '', after = ''] = ht('hp.quick.source', { source: '{source}' }).split('{source}');
  return (
    <span className={className}>
      {before}<a href={url} rel="nofollow noopener" className="hub-h2-srclink">{name}</a>{after}
    </span>
  );
}
