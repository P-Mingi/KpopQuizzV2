import type { OwnerPicture } from '@/lib/anime/entity-images-rules';

export interface PortraitCreditItem {
  readonly name: string;
  readonly credit: NonNullable<OwnerPicture['credit']>;
}

/**
 * The credit lines of the character portraits that ask for one (CC BY, CC BY-SA), for a page that shows a portrait only after the
 * reader acts (the result of a Which character are you quiz). Nothing when no portrait asks for a credit. The other licences are credited
 * on /credits. Server component, no hooks.
 */
export function PortraitCredits({ items }: { readonly items: readonly PortraitCreditItem[] }): React.ReactElement | null {
  if (items.length === 0) return null;
  return (
    <details className="anime-adm-credits-box" data-testid="portrait-credits">
      <summary>Picture credits</summary>
      <ul className="anime-adm-credits-list">
        {items.map((i) => (
          <li key={i.name}>
            {i.name}: <a href={i.credit.sourceUrl} rel="noopener noreferrer" target="_blank">Photo: {i.credit.author}</a>, <a href={i.credit.licenseUrl} rel="noopener noreferrer" target="_blank">{i.credit.license}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** The portraits of the results that ask for a credit: the results come from the page's view, the pictures from the database. */
export function portraitCreditItems(
  results: readonly { readonly id: string; readonly name: string }[] | undefined,
  pictures: Readonly<Record<string, OwnerPicture>>,
): PortraitCreditItem[] {
  return (results ?? []).flatMap((r) => {
    const credit = Object.prototype.hasOwnProperty.call(pictures, r.id) ? pictures[r.id]?.credit : null;
    return credit ? [{ name: r.name, credit }] : [];
  });
}
