import Image from 'next/image';

/** One tile of the members row: a face (photo or two-letter monogram) and a label. */
export interface MemberTile {
  /** React key; the name by default. */
  readonly key?: string | undefined;
  readonly name: string;
  /** A local path (next/image), an absolute URL (plain img), or none (a monogram). */
  readonly photoUrl?: string | null | undefined;
  /** Two or three letters to print on the monogram instead of the first two of the name. */
  readonly monogram?: string | undefined;
  /** Extra class of the <li> and of the face; a site passes its own, the default tile has none. */
  readonly className?: string | undefined;
  readonly faceClass?: string | undefined;
  /** Before the face (a button laid over the tile) and after the name inside the label (a second line). */
  readonly lead?: React.ReactNode;
  readonly note?: React.ReactNode;
}

interface MemberTilesProps {
  /** Accessible name of the row, e.g. "<Group> members". */
  readonly label: string;
  /** The group name, for the photo alt text ("<member> of <group>"). */
  readonly groupName: string;
  readonly tiles: readonly MemberTile[];
}

/**
 * The scroll row of member tiles of the group hub (X2-004: one row of prototype tiles in p3.css). A scroll container
 * must be keyboard reachable, so the list is focusable (arrow keys scroll it). Hooks-free: the hub renders it on
 * the server, and a site's islands (the characters row of a series) render it on the client with their own tiles.
 */
export function MemberTiles({ label, groupName, tiles }: MemberTilesProps): React.ReactElement {
  return (
    <ul className="p3-members" aria-label={label} tabIndex={0}>
      {tiles.map((m) => (
        <li key={m.key ?? m.name} className={m.className}>
          {m.lead}
          {m.photoUrl && m.photoUrl.startsWith('/') ? (
            <Image className="p3-member-face" src={m.photoUrl} alt={`${m.name} of ${groupName}`} width={80} height={80} sizes="80px" />
          ) : m.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a non-local roster photo keeps today's plain img
            <img className="p3-member-face" src={m.photoUrl} alt={`${m.name} of ${groupName}`} width={80} height={80} loading="lazy" />
          ) : (
            <span className={m.faceClass ? `p3-member-face is-ini ${m.faceClass}` : 'p3-member-face is-ini'} aria-hidden="true">{m.monogram ?? m.name.slice(0, 2).toUpperCase()}</span>
          )}
          <span>{m.name}{m.note}</span>
        </li>
      ))}
    </ul>
  );
}
