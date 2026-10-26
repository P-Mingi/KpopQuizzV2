import Image from 'next/image';
import Link from 'next/link';

import { UxPage } from '@/components/ux-v1/page';
import { SERIES_IMAGE_CREDITS } from '@/lib/anime/series-images.generated';

import type { SeriesImageCredit } from '@/lib/anime/series-images';

export const CREDITS_PATH = '/credits';
export const CREDITS_TITLE = 'Photo credits';
export const CREDITS_DESCRIPTION = 'Where each series picture on OtakuQuiz comes from: the page of the photo, who took it, its licence and the day it was retrieved.';

interface CreditsPageProps {
  /** The generated credits by series slug; a test passes its own. */
  readonly credits?: Readonly<Record<string, SeriesImageCredit>> | undefined;
}

/**
 * /credits: every free photo shown on OtakuQuiz with its source page, its author, its licence (linked) and the day it was
 * retrieved. The photos under CC BY and CC BY-SA also carry their credit line on the series page; the others (Unsplash, Pexels,
 * CC0, public domain) are credited here only. A series without a photo shows a generated title card and is not listed.
 * Server component, no hooks.
 */
export function CreditsPage({ credits = SERIES_IMAGE_CREDITS }: CreditsPageProps): React.ReactElement {
  const rows = Object.entries(credits).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'en'));
  return (
    <UxPage width="text" className="anime-o2-credits">
      <h1 className="ux-h1">{CREDITS_TITLE}</h1>
      <p className="anime-o2-credits-lede">
        The pictures of the series on OtakuQuiz are free photos of real places and objects, never images of the works.
        Each one is listed here with the page it comes from, who took it, its licence and the day we retrieved it.
        Where a licence asks for a credit, the same line is printed on the page of the series.
      </p>
      {rows.length === 0 ? (
        <p className="anime-o2-credits-empty" data-testid="credits-empty">No series uses a photo yet: each one shows its title card.</p>
      ) : (
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
      )}
    </UxPage>
  );
}
