import Image from 'next/image';

import { seriesPhotoOf } from '@/lib/anime/series-images';
import { ART_BOX, ART_DISC_OPACITY, ART_PATTERN_OPACITY, artFor, artMonogram, fitArtText, slugOfTitle } from '@/lib/anime/series-art';

import type { ArtSize } from '@/lib/anime/series-art';

interface SeriesArtProps {
  /** The slug of the series: it picks the colour and the pattern. Default: the slug of the title. */
  readonly slug?: string | undefined;
  /** The series title: set in full on the card and the hub sizes, as a two letter monogram on the avatar. */
  readonly title: string;
  /** avatar: square, for rows, rails and chips; card: a strip for a quiz card; hub: the header of a series page. */
  readonly size: ArtSize;
  readonly className?: string | undefined;
  /** An accessible name. Without it the picture is decorative (the series name is always printed next to it). */
  readonly label?: string | undefined;
}

/**
 * The sizes of the photo of a series, as the kpop group photo has them where the same box is used: the quiz card (UxQuizCard) for
 * the strip, the hub photo column (GroupHubV11) for the header, and a fixed square for the rows, rails and chips.
 */
export const PHOTO_SIZES: Readonly<Record<ArtSize, string>> = {
  avatar: '64px',
  card: '(max-width: 760px) 72vw, (max-width: 1100px) 33vw, 262px',
  hub: '(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 50vw, 520px',
};

/**
 * The art of a series (lane O2): the free photo of the series when it has one (docs/anime/images, run O1 IMG), else a
 * deterministic SVG from the slug and the title: one colour of the curated palette, one geometric pattern, the title in the
 * display font. The photo is the picture alone: the title is the page's own (the h1, the card title), never written over it.
 * Fills the box it is put in. No hooks and no client code, so a server component and a client island share it.
 */
export function SeriesArt({ slug, title, size, className, label }: SeriesArtProps): React.ReactElement {
  const key = slug ?? slugOfTitle(title);
  const photo = seriesPhotoOf(key, title);
  if (photo) {
    const pcls = ['anime-o2-art', `anime-o2-art-${size}`, 'anime-o2-photo', className ?? ''].filter(Boolean).join(' ');
    return (
      <span className={pcls} data-photo={key}>
        <Image src={photo.file} alt={photo.alt} fill sizes={PHOTO_SIZES[size]} priority={size === 'hub'} className="anime-o2-photo-img" {...(photo.owner ? { style: { objectPosition: photo.owner.position } } : {})} />
      </span>
    );
  }
  const a = artFor(key);
  const { w, h, unit } = ART_BOX[size];
  const ink = a.color.text;
  const cls = ['anime-o2-art', `anime-o2-art-${size}`, className ?? ''].filter(Boolean).join(' ');
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  return (
    <svg className={cls} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" focusable="false" data-art={a.color.name} data-pattern={a.pattern.key} {...a11y}>
      <rect width={w} height={h} fill={a.color.bg} />
      <circle cx={size === 'avatar' ? w : w * 0.94} cy={size === 'avatar' ? 0 : h * 0.06} r={size === 'card' ? h * 0.9 : Math.round(h * 0.72)} fill={ink} opacity={ART_DISC_OPACITY} />
      <path d={a.pattern.d(w, h, unit)} fill="none" stroke={ink} strokeOpacity={ART_PATTERN_OPACITY} strokeWidth={Math.max(1, Math.round(unit * a.pattern.weight * 10) / 10)} strokeLinecap="round" strokeLinejoin="round" />
      {size === 'avatar' ? (
        <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" className="anime-o2-art-text" fill={ink} fontSize={26}>{artMonogram(title)}</text>
      ) : size === 'card' ? (
        <CardTitle title={title} ink={ink} />
      ) : (
        <HubTitle title={title} ink={ink} />
      )}
    </svg>
  );
}

function CardTitle({ title, ink }: { title: string; ink: string }): React.ReactElement {
  const { w, h } = ART_BOX.card;
  const t = fitArtText(title, w - 40, h - 28, 2, 28, 14);
  const top = h / 2 - ((t.lines.length - 1) * t.lineHeight) / 2;
  return (
    <text className="anime-o2-art-text" fill={ink} fontSize={t.fontSize}>
      {t.lines.map((line, i) => <tspan key={i} x={20} y={top + i * t.lineHeight} dominantBaseline="central">{line}</tspan>)}
    </text>
  );
}

function HubTitle({ title, ink }: { title: string; ink: string }): React.ReactElement {
  const { w, h } = ART_BOX.hub;
  const t = fitArtText(title, w - 64, h - 84, 3, 40, 16);
  const top = h / 2 - 8 - ((t.lines.length - 1) * t.lineHeight) / 2;
  return (
    <>
      <rect x="9" y="9" width={w - 18} height={h - 18} rx="12" fill="none" stroke={ink} strokeOpacity="0.3" strokeWidth="1.5" />
      <text textAnchor="middle" className="anime-o2-art-text" fill={ink} fontSize={t.fontSize}>
        {t.lines.map((line, i) => <tspan key={i} x={w / 2} y={top + i * t.lineHeight} dominantBaseline="central">{line}</tspan>)}
      </text>
      <rect x={w / 2 - 18} y={h - 40} width="36" height="3" rx="1.5" fill={ink} opacity="0.7" />
    </>
  );
}
