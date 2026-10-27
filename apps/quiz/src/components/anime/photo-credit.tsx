import { seriesPhotoOf } from '@/lib/anime/series-images';

import type { SeriesImage } from '@/lib/anime/series-images';

interface PhotoCreditProps {
  /** The slug of the series whose photo is shown. */
  readonly slug: string;
  /** The generated map by default; a test passes its own. */
  readonly map?: Readonly<Record<string, SeriesImage>> | undefined;
}

/**
 * The credit line of a series photo whose licence asks for one (CC BY, CC BY-SA): "Photo: <author>, <licence>", the author linked
 * to the page of the photo and the licence to its text. Nothing when the series shows the title card or a photo under a licence
 * that asks for no credit (Unsplash, Pexels, CC0, public domain: those are listed on /credits). Server component, no hooks.
 */
export function PhotoCredit({ slug, map }: PhotoCreditProps): React.ReactElement | null {
  const photo = map ? seriesPhotoOf(slug, '', map) : seriesPhotoOf(slug);
  const a = photo?.attribution;
  if (!a) return null;
  return (
    <p className="anime-o2-photo-credit" data-testid="photo-credit">
      Photo: <a href={a.sourceUrl} rel="noopener noreferrer" target="_blank">{a.author}</a>, <a href={a.licenseUrl} rel="noopener noreferrer" target="_blank">{a.license}</a>
    </p>
  );
}
