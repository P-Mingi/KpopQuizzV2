'use client';

import { useCallback, useState } from 'react';

import { isUxV12 } from '@/lib/ux-v12';

import { Icon } from './icon';

interface CoverImgProps {
  /** The picture (any host: Deezer album art, a local photo). Empty: the placeholder. */
  src: string | null | undefined;
  /** Read by assistive tech on the picture and on the placeholder. Never painted. */
  alt: string;
  /** The page's own class (size, radius, shadow): set on the picture and on the placeholder. */
  className?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  loading?: 'lazy' | 'eager' | undefined;
  decoding?: 'async' | 'sync' | 'auto' | undefined;
}

/**
 * F7a: an album cover that never shows its alt text. Firefox paints the alt text inside
 * an image that is still loading or failed to load, Chromium does not: the picture keeps
 * its alt for assistive tech but paints it transparent (a0.css `.ux-cover`), sits on the
 * placeholder ground while it loads, and a picture that fails (onError, or already broken
 * at hydration) is replaced by the placeholder: the theme gradient and a music note.
 * Flag off (NEXT_PUBLIC_UX_V12): the plain picture each page drew before, unchanged.
 */
export function CoverImg(props: CoverImgProps): React.ReactElement | null {
  if (!isUxV12()) {
    const { src, alt, className, width, height, loading, decoding } = props;
    // eslint-disable-next-line @next/next/no-img-element -- the v11 picture, as before
    return src ? <img className={className} src={src} alt={alt} width={width} height={height} loading={loading} decoding={decoding} /> : null;
  }
  return <V12Cover {...props} />;
}

function V12Cover({ src, alt, className, width, height, loading }: CoverImgProps): React.ReactElement {
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const cls = className ? ` ${className}` : '';
  // A server-rendered picture can fail before React listens: read its state on mount.
  const ref = useCallback((el: HTMLImageElement | null) => {
    if (!el || !el.complete) return;
    if (el.naturalWidth > 0) setLoaded(el.getAttribute('src'));
    else if (el.getAttribute('src')) setFailed(el.getAttribute('src'));
  }, []);

  if (!src || failed === src) {
    return (
      <span className={`ux-cover-ph${cls}`} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} data-cover="placeholder">
        <Icon name="music" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- album art from any host, any size
    <img
      ref={ref}
      className={`ux-cover${loaded === src ? '' : ' is-loading'}${cls}`}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      onLoad={() => setLoaded(src)}
      onError={() => setFailed(src)}
    />
  );
}
