import Link from 'next/link';

/** Cover gradient keys (a0.css `--ux-th-<key>`). `kpdh` is dark in both themes. */
export type ThemeCover = 'hits26' | 'hits25' | 'gen5' | 'gen4' | 'viral' | 'kpdh' | 'title';

interface ThemeCardProps {
  /** The themed playlist page (`/blindtest/<slug>`): a real link. */
  href: string;
  /** Playlist name: on the cover and as the card title. */
  name: string;
  /** Small line on the cover: "300 songs", "Updated every week". Real counts only. */
  sub?: string | undefined;
  /** One sentence under the title. */
  lead?: string | undefined;
  cover: ThemeCover;
  /** Heading level of the title under the cover. */
  titleAs?: 'h2' | 'h3' | 'h4' | undefined;
  lang?: string | undefined;
  className?: string | undefined;
}

/**
 * v12 theme card (prototype `.thm`): a typographic 4:3 cover (gradient, three
 * equalizer bars, the name and a sub line, never a picture), then the name as a
 * heading and one sentence. The whole card is one link. The name on the cover
 * repeats the title, so that copy is hidden from assistive tech; the sub line
 * stays readable. Server-safe.
 */
export function ThemeCard({ href, name, sub, lead, cover, titleAs: T = 'h3', lang, className }: ThemeCardProps): React.ReactElement {
  return (
    <Link href={href} className={['ux-thm', className ?? ''].filter(Boolean).join(' ')} lang={lang} prefetch={false}>
      <span className={`ux-thm-cv ux-th-${cover}${cover === 'kpdh' ? ' is-dark' : ''}`}>
        <span className="ux-eq" aria-hidden="true"><i /><i /><i /></span>
        <b aria-hidden="true">{name}</b>
        {sub ? <small>{sub}</small> : null}
      </span>
      <T className="ux-thm-t">{name}</T>
      {lead ? <p className="ux-thm-d">{lead}</p> : null}
    </Link>
  );
}

/** The rail of theme cards: 6 columns, 3 from 1100px down. */
export function ThemeRail({ children, className, id }: { children: React.ReactNode; className?: string | undefined; id?: string | undefined }): React.ReactElement {
  return <div id={id} className={['ux-thrail', className ?? ''].filter(Boolean).join(' ')}>{children}</div>;
}
