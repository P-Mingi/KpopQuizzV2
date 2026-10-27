import { SeriesArt } from './series-art';

interface TitleCardProps {
  readonly title: string;
  /** The slug of the series, which picks its colour and pattern (default: the slug of the title). */
  readonly slug?: string | undefined;
  /** 'wide' is the hub header, with the title set in full; 'mono' is the avatar of a row. */
  readonly variant?: 'wide' | 'mono';
}

/**
 * A7: the typographic title card of a series, where kpop shows a group logo or photo (the hub hero, the row avatars, the
 * trivia hero). Since lane O2 it is the series art (series-art.tsx): a colour and a pattern picked by the slug, the title
 * in the display font. No image of the work is used. Decorative: the title is always printed next to it, so the SVG is
 * hidden from assistive technology. Hooks-free (server or client).
 */
export function TitleCard({ title, slug, variant = 'wide' }: TitleCardProps): React.ReactElement {
  const mono = variant === 'mono';
  return <SeriesArt slug={slug} title={title} size={mono ? 'avatar' : 'hub'} className={mono ? 'anime-o2-card anime-o2-card-sm' : 'anime-o2-card'} />;
}
