interface StoryPreviewProps {
  /** Small uppercase line above the title: "KATSEYE quiz". */
  kicker?: string | undefined;
  /** The headline on the image. */
  title: string;
  /** Top right label: "New quiz". */
  tag?: string | undefined;
  /** White pill: "Play at kpopquiz.org". */
  cta?: string | undefined;
  /** Picture behind the text (a quiz cover or a photo from `public/idols/`). */
  image?: string | null | undefined;
  /** Two-colour ground when there is no picture (default: the share kit pink to violet). */
  gradient?: readonly [string, string] | undefined;
  /** The QR code node (an <svg> or <img>), shown bottom right on a white tile. */
  qr?: React.ReactNode;
  /** 9:16 story (default) or 1:1 square. */
  format?: 'story' | 'square' | undefined;
  /** Heading level of the title inside its sheet or page. */
  titleAs?: 'h3' | 'h4' | 'p' | undefined;
  className?: string | undefined;
}

const KIT_GRADIENT = ['#C93868', '#6B4FD8'] as const;

/**
 * v12 story image preview (prototype `.kit .story`): what the saved image looks
 * like, drawn in HTML. The PNG itself comes from `story-image.ts`
 * (`storyCardFile({ ..., format, kicker, tag, cta, gradient, qr })`), which takes
 * the same fields. Server-safe.
 */
export function StoryPreview({ kicker, title, tag, cta, image, gradient = KIT_GRADIENT, qr, format = 'story', titleAs: T = 'h4', className }: StoryPreviewProps): React.ReactElement {
  const background = image
    ? `#1F1B17 url(${JSON.stringify(image)}) center / cover`
    : `linear-gradient(160deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`;
  return (
    <div className={['ux-story', format === 'square' ? 'is-square' : '', className ?? ''].filter(Boolean).join(' ')} style={{ background }}>
      <div className="ux-story-top"><span>KpopQuiz</span>{tag ? <span>{tag}</span> : null}</div>
      {kicker ? <span className="ux-story-k">{kicker}</span> : null}
      <T className="ux-story-t">{title}</T>
      {cta ? <span className="ux-story-cta">{cta}</span> : null}
      {qr ? <div className="ux-story-qr">{qr}</div> : null}
    </div>
  );
}
