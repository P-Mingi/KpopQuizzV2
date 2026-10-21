import Image from 'next/image';
import Link from 'next/link';

import { SITE } from '@/lib/site/registry';
import { brandWordmark } from '@/lib/site/brand';

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
      {SITE.id === 'kpop' ? (
        <Image src="/mascot/mascot-default.png" alt="" width={28} height={28} loading="eager" className="ux-brand-rabbit" aria-hidden="true" />
      ) : (
        // Run C1: the rabbit is the mascot of the kpop site and the brand files of anime and hub (public/brand/<site>/) are not there yet,
        // so another site shows the letter tile of its wordmark (the tile of DESIGN-SPEC 17.1).
        <span className="ux-brand-mk" aria-hidden="true">{brandWordmark().head.charAt(0).toUpperCase()}</span>
      )}
      <span>{brandWordmark().head}<b>{brandWordmark().tail}</b></span>
    </>
  );
  if (href === null) return <span className="ux-brand">{inner}</span>;
  return <Link href={href} className="ux-brand" aria-label={label}>{inner}</Link>;
}
