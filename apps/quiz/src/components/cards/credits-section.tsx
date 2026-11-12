// Bunnyverse Cards, lane U: the Cards section of the hub /credits (components/hub/credits/hub-credits.tsx draws the page and the rest of
// the sections). Every photo used by a card, once: a thumbnail, the cards that carry it, the author, the licence and the source page as
// links, what was changed, and "Report a photo" beside each. Same classes as the other sections (styles/sites/hub/credits.css).
// Server component, no hook; every link is an https address (safeHref).
import { SOURCE_NAMES, reportHref, safeHref, shareAlikeName } from '@/lib/cards/ui-credit';

import type { CardCreditRow } from '@/lib/cards/ui-credit';

export const CARDS_CREDITS_TITLE = 'Bunnyverse Cards';

export function CardsCreditsSection({ rows }: { rows: readonly CardCreditRow[] }): React.ReactElement {
  const p = 'hub-credits';
  return (
    <section id="cards" className={`${p}-section`} aria-labelledby="cr-cards" data-testid="cards-credits">
      <h2 id="cr-cards" className={`${p}-h2`}>{CARDS_CREDITS_TITLE}</h2>
      <p className={`${p}-meta`} style={{ marginBottom: 12 }}>
        The photos on the cards are free to reuse, cropped and framed for the game. Each is listed with the cards that use it. A photo shared under CC BY-SA makes its cards CC BY-SA.
      </p>
      <ul className={`${p}-list`}>
        {rows.map((r) => {
          const author = safeHref(r.photo.authorUrl);
          const lic = safeHref(r.photo.licenceUrl);
          const src = safeHref(r.photo.sourcePage);
          const sa = shareAlikeName(r.photo.licence, r.photo.shareAlike);
          return (
            <li key={r.photo.id} className={`${p}-item`}>
              {r.thumb ? (
                // A plain img: the stored photo, cropped by CSS to a square. Decorative, the names are printed beside it.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumb} alt="" width={48} height={48} loading="lazy" decoding="async" className={`${p}-thumb`} style={{ objectPosition: `${r.photo.focalX ?? 50}% ${r.photo.focalY ?? 25}%` }} />
              ) : null}
              <div className={`${p}-text`}>
                <h3 className={`${p}-name`}>{r.cards[0]?.name} <span className={`${p}-meta`}>(photo {r.photo.slot})</span></h3>
                <p>
                  Photo: {author ? <a href={author} rel="noopener noreferrer nofollow" target="_blank">{r.photo.author}</a> : r.photo.author},{' '}
                  {lic ? <a href={lic} rel="noopener noreferrer" target="_blank">{r.photo.licence}</a> : r.photo.licence}
                  {src ? <>, via <a href={src} rel="noopener noreferrer nofollow" target="_blank">{SOURCE_NAMES[r.photo.source]}</a></> : null}
                </p>
                <p className={`${p}-meta`}>Changed: {r.photo.modified}.{sa ? ` The cards are shared under ${sa}.` : ''}</p>
                <p className={`${p}-meta`}>
                  Cards: {r.cards.map((c, i) => <span key={c.num}>{i ? ', ' : ''}<a href={`/cards/c/${c.num}`}>{c.name} {c.edition}</a></span>)}
                </p>
                <p className={`${p}-meta`}><a href={reportHref({ photoId: r.photo.id })}>Report a photo</a></p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
