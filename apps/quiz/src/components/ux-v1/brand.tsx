import Link from 'next/link';

/**
 * The KpopQuiz mark as DESIGN-SPEC 17.1 fixes it: "Logo: unchanged (pink K tile +
 * KpopQuiz). Do not redraw." 28px pink-fill tile with the K, then the wordmark.
 * The link is Home (16.5: logo = Home).
 */
export function UxBrand({ href = '/', label = 'KpopQuiz home' }: { href?: string | null; label?: string }): React.ReactElement {
  const inner = (
    <>
      <span className="ux-brand-mk" aria-hidden="true">K</span>
      <span>Kpop<b>Quiz</b></span>
    </>
  );
  if (href === null) return <span className="ux-brand">{inner}</span>;
  return <Link href={href} className="ux-brand" aria-label={label}>{inner}</Link>;
}
