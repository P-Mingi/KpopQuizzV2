import Image from 'next/image';
import Link from 'next/link';

import { SITE } from '@/lib/site/registry';
import { brandWordmark, wordmarkTailClass } from '@/lib/site/brand';

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

// Owner, 2026-10-29: on the hub the tail of the wordmark ("verse") is the pink of every validated mockup. Its class reads the token
// --hub-brand-tail (styles/sites/hub/h2.css), so every hub page that draws this mark follows one value; kpop and anime get no class, so
// their markup is today's.
const TAIL_CLASS = wordmarkTailClass();

/**
 * The brand mark: the rabbit mascot, then the wordmark. DESIGN-SPEC 17.1 first
 * kept the live pink "K" tile; the owner asked on 2026-10-04 (F7b) for the rabbit of
 * the old version instead, the same art as the favicons and the old top bar
 * (public/mascot/mascot-default.png, used as is, not redrawn). Its white sticker
 * edge keeps the black rabbit visible on the dark ground. Same 28px box as the tile,
 * a fixed image with 1x and 2x candidates, loaded with the page (no priority hint
 * needed: it is small and in the first paint either way).
 * The link is Home (16.5: logo = Home).
 */
export function UxBrand({ href = '/', label = `${SITE.brand.name} home` }: { href?: string | null; label?: string }): React.ReactElement {
  const inner = (
    <>
      {/* Run O1 (H2a, owner 2026-10-25): the rabbit is the mark of the three sites, then the wordmark of the site: it replaces the letter tile
          (F, O) of the hub and the anime site. */}
      <Image src={`${BASE_PATH}/mascot/mascot-default.png`} alt="" width={28} height={28} loading="eager" className="ux-brand-rabbit" aria-hidden="true" />
      <span>{brandWordmark().head}<b className={TAIL_CLASS}>{brandWordmark().tail}</b></span>
    </>
  );
  if (href === null) return <span className="ux-brand">{inner}</span>;
  return <Link href={href} className="ux-brand" aria-label={label}>{inner}</Link>;
}
