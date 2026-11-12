// Bunnyverse Cards, lane U: the credit of a card, printed under the card on its page (never behind a flip): the photo's number for that
// idol, the author, the licence and the source page, each a link, what was changed, "This card is shared under CC BY-SA" when it is, and
// "Report a photo". Server component. A card with no photo says its art is drawn.
import { SOURCE_NAMES } from '@/lib/cards/rules';
import { reportHref, safeHref, shareAlikeName } from '@/lib/cards/ui-credit';

import type { UiPhoto } from '@/lib/cards/ui-types';

export function CreditBlock({ photo, num }: { photo: UiPhoto | null; num: string }): React.ReactElement {
  if (!photo) {
    return <p className="credit" data-testid="card-credit">The art of this card is drawn. No photo is used on it. <a href={reportHref({ num })}>Report a problem</a></p>;
  }
  const author = safeHref(photo.authorUrl);
  const source = safeHref(photo.sourcePage);
  const lic = safeHref(photo.licenceUrl);
  const sa = shareAlikeName(photo.licence, photo.shareAlike);
  return (
    <p className="credit" data-testid="card-credit">
      <b>Photo {photo.slot} of this idol:</b>{' '}
      {author ? <a href={author} rel="noopener noreferrer nofollow" target="_blank">{photo.author}</a> : photo.author}
      {' · '}
      {lic ? <a href={lic} rel="noopener noreferrer" target="_blank">{photo.licence}</a> : photo.licence}
      {' · '}
      {source ? <a href={source} rel="noopener noreferrer nofollow" target="_blank">{SOURCE_NAMES[photo.source]}</a> : SOURCE_NAMES[photo.source]}
      {' · '}{photo.modified}
      {sa ? <span className="sa">This card is shared under {sa}.</span> : null}
      <span className="sa"><a href={reportHref({ num, photoId: photo.id })}>Report a photo</a></span>
    </p>
  );
}
