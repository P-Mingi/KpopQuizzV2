// Lot 3 DLE (E3): the card of the result when there is no licensed picture of the answer. Series photo already in place on the anime pages (one of the
// free photos of objects and places) or, with none, the colours of the group with a pattern; the name set in type, the series or the group above it.
// Decorative for assistive technology: the name is the heading beside it. Pure: no hook, no client code, drawn on the server too.
import { tintOf } from './dle-avatar';

import type { AvatarLook } from './dle-avatar';

/** The size of the name by its length in characters, so a long name wraps on two lines and a short one fills the card. */
export function nameSize(name: string): number {
  const n = [...name].length;
  if (n <= 9) return 46;
  if (n <= 14) return 38;
  if (n <= 22) return 30;
  return 24;
}

interface CardProps {
  readonly name: string;
  /** What stands above the name: the series of the character, or the group of the idol. May be empty. */
  readonly sub: string;
  /** The name the colours follow (the group, or the series). */
  readonly tone: string;
  readonly look?: AvatarLook | undefined;
  /** The words of the small label on a private preview. */
  readonly previewLabel?: string;
}

export function DleCard({ name, sub, tone, look, previewLabel = 'Owner preview' }: CardProps): React.ReactElement {
  const [a, b] = tintOf(tone || name);
  const image = look?.preview ?? look?.art ?? null;
  return (
    <div
      aria-hidden="true"
      className={`hub-dle-card ${image ? 'hub-dle-card-art' : 'hub-dle-card-pat'}`}
      style={{ '--dle-a': a, '--dle-b': b } as React.CSSProperties}
    >
      {image ? (
        // A plain img: a bundled file, or the owner's preview route; never the image optimiser.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="hub-dle-card-img" loading="lazy" decoding="async" />
      ) : <span className="hub-dle-card-dots" />}
      <span className="hub-dle-card-scrim" />
      {look?.preview ? <span className="hub-dle-card-chip">{previewLabel}</span> : null}
      <span className="hub-dle-card-text">
        {sub ? <small>{sub}</small> : null}
        <strong style={{ fontSize: nameSize(name) }}>{name}</strong>
      </span>
    </div>
  );
}
