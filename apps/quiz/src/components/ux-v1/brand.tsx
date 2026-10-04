import Image from 'next/image';
import Link from 'next/link';

/**
 * The KpopQuiz mark: the rabbit mascot, then the wordmark. DESIGN-SPEC 17.1 first
 * kept the live pink "K" tile; the owner asked on 2026-10-04 (F7b) for the rabbit of
 * the old version instead, the same art as the favicons and the old top bar
 * (public/mascot/mascot-default.png, used as is, not redrawn). Its white sticker
 * edge keeps the black rabbit visible on the dark ground. Same 28px box as the tile,
 * a fixed image with 1x and 2x candidates, loaded with the page (no priority hint
 * needed: it is small and in the first paint either way).
 * The link is Home (16.5: logo = Home).
 */
export function UxBrand({ href = '/', label = 'KpopQuiz home' }: { href?: string | null; label?: string }): React.ReactElement {
  const inner = (
    <>
      <Image src="/mascot/mascot-default.png" alt="" width={28} height={28} loading="eager" className="ux-brand-rabbit" aria-hidden="true" />
      <span>Kpop<b>Quiz</b></span>
    </>
  );
  if (href === null) return <span className="ux-brand">{inner}</span>;
  return <Link href={href} className="ux-brand" aria-label={label}>{inner}</Link>;
}
