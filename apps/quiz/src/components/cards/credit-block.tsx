// Bunnyverse Cards, lane U: the credit of a card, printed under the card on its page (never behind a flip): the photo's number for that
// idol, the author, the licence and the source page, each a link, what was changed, "This card is shared under CC BY-SA" when it is, and
// "Report a photo" (at the end of the line, as in the prototype). Server component. A card with no photo says its art is drawn.
import { SOURCE_NAMES } from '@/lib/cards/rules';
import { reportHref, safeHref, shareAlikeName } from '@/lib/cards/ui-credit';

import type { UiPhoto } from '@/lib/cards/ui-types';

export function CreditBlock({ photo, num, kind = 'idol', soon = false }: { photo: UiPhoto | null; num: string; kind?: 'idol' | 'group' | 'event'; soon?: boolean }): React.ReactElement {
  // Owner decision 2026-11-18: a card whose photo left has no photo to credit: it says a new one is coming (no author, no licence, no Commons line).
  if (soon) {
    return <p className="credit" data-testid="card-credit">A new photo is coming for this card. It keeps its number and its place in your binder until then. <a href={reportHref({ num })}>Report a problem</a></p>;
  }
  if (!photo) {
    return <p className="credit" data-testid="card-credit">The art of this card is drawn. No photo is used on it. <a href={reportHref({ num })}>Report a problem</a></p>;
  }
  const author = safeHref(photo.authorUrl);
  const source = safeHref(photo.sourcePage);
  const lic = safeHref(photo.licenceUrl);
  const sa = shareAlikeName(photo.licence, photo.shareAlike);
  return (
    <p className="credit" data-testid="card-credit">
      <b>Photo {photo.slot} of this {kind}:</b>{' '}
      {author ? <a href={author} rel="noopener noreferrer nofollow" target="_blank">{photo.author}</a> : photo.author}
      {' · '}
      {lic ? <a href={lic} rel="noopener noreferrer" target="_blank">{photo.licence}</a> : photo.licence}
      {' · '}
      {source ? <a href={source} rel="noopener noreferrer nofollow" target="_blank">{SOURCE_NAMES[photo.source]}</a> : SOURCE_NAMES[photo.source]}
      {' · '}{photo.modified}
      {/* The report link ends the credit line, as the prototype's "· Report this photo" does; the share-alike notice follows on its own line. */}
      {' · '}<a href={reportHref({ num, photoId: photo.id })}>Report a photo</a>
      {sa ? <span className="sa">This card is shared under {sa}.</span> : null}
    </p>
  );
}
