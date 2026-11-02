import Image from 'next/image';
import Link from 'next/link';

import { UxPage } from '@/components/ux-v1/page';
import { SERIES_IMAGE_CREDITS } from '@/lib/anime/series-images.generated';
import { withBasePath } from '@/lib/site/base-path';

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
 * /credits: the pictures shown on OtakuQuiz under a licence that asks for a credit (CC BY, CC BY-SA), with their source page, their author,
 * their licence (linked) and the day they were retrieved. CR-021 (owner decision of 2026-11-02): no credit is printed on a series page or
 * anywhere else, this page is the only place, and the page that calls this component lists those pictures only and answers a 404 when there
 * are none. A series without a photo shows a generated title card and is not listed. Server component, no hooks.
 */
export function CreditsPage({ credits = SERIES_IMAGE_CREDITS, owner = [] }: CreditsPageProps): React.ReactElement {
  // A bundled photo that the owner replaced is no longer shown anywhere, so it is no longer listed.
  const replaced = new Set(owner.filter((o) => o.kind === 'series').map((o) => o.slug));
  const rows = Object.entries(credits).filter(([slug]) => !replaced.has(slug)).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'en'));
  return (
    <UxPage width="text" className="anime-o2-credits">
      <h1 className="ux-h1">{CREDITS_TITLE}</h1>
      <p className="anime-o2-credits-lede">
        Some pictures on OtakuQuiz are shared under a Creative Commons licence that asks for a credit.
        Each one is listed here with the page it comes from, who made it, its licence and the day we retrieved it.
        {owner.length > 0 ? ' Pictures that the team added later, of series and of characters, are listed below the photos, each with its source, its author and its licence.' : ''}
      </p>
      {rows.length === 0 && owner.length === 0 ? (
        <p className="anime-o2-credits-empty" data-testid="credits-empty">No series uses a photo yet: each one shows its title card.</p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="anime-o2-credits-list" data-testid="credits-list">
          {rows.map(([slug, c]) => (
            <li key={slug} className="anime-o2-credits-item" data-slug={slug}>
              <span className="anime-o2-credits-thumb"><Image src={withBasePath(c.file)} alt={c.alt} width={72} height={96} sizes="72px" className="anime-o2-photo-img" /></span>
              <div className="anime-o2-credits-text">
                <h2 className="anime-o2-credits-name"><Link href={`/${slug}-quiz`}>{c.name}</Link></h2>
                <p>Photo: <a href={c.sourceUrl} rel="noopener noreferrer" target="_blank">{c.author}</a>, <a href={c.licenseUrl} rel="noopener noreferrer" target="_blank">{c.license}</a></p>
                <p className="anime-o2-credits-meta">
                  <a href={c.sourceUrl} rel="noopener noreferrer" target="_blank">Source page</a> · Retrieved <time dateTime={c.retrieved}>{c.retrieved}</time>
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
                  <p>Picture: {o.sourceUrl ? <a href={o.sourceUrl} rel="noopener noreferrer" target="_blank">{o.author}</a> : o.author}, {o.licenseUrl ? <a href={o.licenseUrl} rel="noopener noreferrer" target="_blank">{o.license}</a> : o.license}</p>
                  {o.note ? <p className="anime-o2-credits-meta">{o.note}</p> : null}
                  <p className="anime-o2-credits-meta">
                    {o.sourceUrl ? <><a href={o.sourceUrl} rel="noopener noreferrer" target="_blank">Source page</a> · </> : null}Added <time dateTime={o.retrieved}>{o.retrieved}</time>
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
