import Image from 'next/image';
import Link from 'next/link';

import { UxPage } from '@/components/ux-v1/page';
import { SERIES_IMAGE_CREDITS } from '@/lib/anime/series-images.generated';

import type { OwnerCreditRow } from '@/lib/anime/entity-images-rules';
import type { SeriesImageCredit } from '@/lib/anime/series-images';

export const CREDITS_PATH = '/credits';
export const CREDITS_TITLE = 'Photo credits';
export const CREDITS_DESCRIPTION = 'Where each series picture on OtakuQuiz comes from: the page of the photo, who took it, its licence and the day it was retrieved.';

interface CreditsPageProps {
  /** The generated credits by series slug; a test passes its own. */
  readonly credits?: Readonly<Record<string, SeriesImageCredit>> | undefined;
  /** The images the owner uploaded (run O1, ADM), series and characters, with their licences; the read of the page passes them. */
  readonly owner?: readonly OwnerCreditRow[] | undefined;
}

/**
 * /credits: every free photo shown on OtakuQuiz with its source page, its author, its licence (linked) and the day it was
 * retrieved. The photos under CC BY and CC BY-SA also carry their credit line on the series page; the others (Unsplash, Pexels,
 * CC0, public domain) are credited here only. A series without a photo shows a generated title card and is not listed.
 * Server component, no hooks.
 */
export function CreditsPage({ credits = SERIES_IMAGE_CREDITS, owner = [] }: CreditsPageProps): React.ReactElement {
  // A bundled photo that the owner replaced is no longer shown anywhere, so it is no longer listed.
  const replaced = new Set(owner.filter((o) => o.kind === 'series').map((o) => o.slug));
  const rows = Object.entries(credits).filter(([slug]) => !replaced.has(slug)).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'en'));
  return (
    <UxPage width="text" className="anime-o2-credits">
      <h1 className="ux-h1">{CREDITS_TITLE}</h1>
      <p className="anime-o2-credits-lede">
        The pictures of the series on OtakuQuiz are free photos of real places and objects, never images of the works.
        Each one is listed here with the page it comes from, who took it, its licence and the day we retrieved it.
        Where a licence asks for a credit, the same line is printed on the page of the series.
        {owner.length > 0 ? ' Pictures that the team added later, of series and of characters, are listed below the photos, each with its source, its author and its licence.' : ''}
      </p>
      {rows.length === 0 && owner.length === 0 ? (
        <p className="anime-o2-credits-empty" data-testid="credits-empty">No series uses a photo yet: each one shows its title card.</p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="anime-o2-credits-list" data-testid="credits-list">
          {rows.map(([slug, c]) => (
            <li key={slug} className="anime-o2-credits-item" data-slug={slug}>
              <span className="anime-o2-credits-thumb"><Image src={c.file} alt={c.alt} width={72} height={96} sizes="72px" className="anime-o2-photo-img" /></span>
              <div className="anime-o2-credits-text">
                <h2 className="anime-o2-credits-name"><Link href={`/${slug}-quiz`}>{c.name}</Link></h2>
                <p>Photo: <a href={c.sourceUrl} rel="noopener noreferrer" target="_blank">{c.author}</a>, <a href={c.licenseUrl} rel="noopener noreferrer" target="_blank">{c.license}</a></p>
                <p className="anime-o2-credits-meta">
                  <a href={c.sourceUrl} rel="noopener noreferrer" target="_blank">Source page</a> · Retrieved <time dateTime={c.retrieved}>{c.retrieved}</time>
                  {c.attributionRequired ? ' · Credit shown on the series page' : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {owner.length > 0 ? (
        <>
          <h2 className="anime-adm-credits-h">Pictures added by the team</h2>
          <ul className="anime-o2-credits-list" data-testid="credits-owner-list">
            {owner.map((o, i) => (
              <li key={`${o.kind}-${o.slug}-${i}`} className="anime-o2-credits-item" data-slug={o.slug} data-kind={o.kind}>
                {o.locked ? null : (
                  <span className="anime-o2-credits-thumb">
                    <Image src={o.src} alt="" width={72} height={96} sizes="72px" className="anime-o2-photo-img" style={{ objectPosition: o.position }} />
                  </span>
                )}
                <div className="anime-o2-credits-text">
                  <h3 className="anime-o2-credits-name">{o.locked ? o.name : <Link href={o.href}>{o.name}</Link>}</h3>
                  <p>Picture: <a href={o.sourceUrl} rel="noopener noreferrer" target="_blank">{o.author}</a>, {o.licenseUrl ? <a href={o.licenseUrl} rel="noopener noreferrer" target="_blank">{o.license}</a> : o.license}</p>
                  {o.note ? <p className="anime-o2-credits-meta">{o.note}</p> : null}
                  <p className="anime-o2-credits-meta">
                    <a href={o.sourceUrl} rel="noopener noreferrer" target="_blank">Source page</a> · Added <time dateTime={o.retrieved}>{o.retrieved}</time>
                    {o.credited ? ' · Credit shown under the picture' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </UxPage>
  );
}
