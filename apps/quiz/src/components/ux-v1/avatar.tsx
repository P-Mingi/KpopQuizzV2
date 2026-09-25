interface AvatarProps {
  /** Display name or username: the initial is used when there is no image. */
  name: string;
  src?: string | null | undefined;
  size?: number | undefined;
  /** Legacy profile colours (profiles.avatar_bg / avatar_text). Neutral when absent (16.8). */
  bg?: string | null | undefined;
  fg?: string | null | undefined;
  className?: string | undefined;
}

/**
 * Round avatar: the real photo, else neutral initials (DESIGN-SPEC 16.8: "neutral
 * initials for avatars"). Decorative (alt="") because the name is always next to it.
 */
export function UxAvatar({ name, src, size = 32, bg, fg, className }: AvatarProps): React.ReactElement {
  const initial = (name || 'K').trim().charAt(0).toUpperCase() || 'K';
  const style: React.CSSProperties = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) };
  if (!src && bg) style.background = bg;
  if (!src && fg) style.color = fg;
  return (
    <span className={['ux-ava', className ?? ''].filter(Boolean).join(' ')} style={style} aria-hidden="true">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar hosts vary (OAuth, storage); tiny, lazy
        <img src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" />
      ) : initial}
    </span>
  );
}
