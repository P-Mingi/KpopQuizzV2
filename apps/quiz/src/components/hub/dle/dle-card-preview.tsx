'use client';

// Otakudle, the owner's private preview on the card of the result (dle-card.tsx). The preview pictures are small (most about 160 x 240) and the
// card can be more than 800 px wide: covering it, they blur. Once the picture has loaded, this part compares its natural width with the card's
// rendered width (and again when the card is resized): narrower than half the card, the picture is shown at most twice its natural size,
// centred, over a blurred and darkened copy of itself that fills the card; otherwise it covers the card as before. The name and the series stay
// on top (dle-card.tsx). Nothing here is drawn for anyone but the owner: the preview address only exists in the owner's session.
import { useCallback, useEffect, useRef, useState } from 'react';

import { smallPreviewSize } from './dle-card-fit';

type Fit = { kind: 'wait' } | { kind: 'cover' } | { kind: 'small'; width: number; height: number };

export function DleCardPreview({ src }: { readonly src: string }): React.ReactElement {
  const img = useRef<HTMLImageElement | null>(null);
  const [fit, setFit] = useState<Fit>({ kind: 'wait' });

  const measure = useCallback((): void => {
    const el = img.current;
    const card = el?.closest('.hub-dle-card');
    if (!el || !card || !el.complete || el.naturalWidth === 0) return;
    const size = smallPreviewSize(el.naturalWidth, el.naturalHeight, card.clientWidth, card.clientHeight);
    setFit((prev) => {
      if (!size) return prev.kind === 'cover' ? prev : { kind: 'cover' };
      return prev.kind === 'small' && prev.width === size.width && prev.height === size.height ? prev : { kind: 'small', ...size };
    });
  }, []);

  useEffect(() => {
    // A picture already in the cache can finish loading before the page is interactive: measure it here as well.
    measure();
    const card = img.current?.closest('.hub-dle-card');
    if (!card || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(card);
    return () => ro.disconnect();
  }, [measure, src]);

  return (
    <span className="hub-dle-card-pv" data-fit={fit.kind}>
      {fit.kind === 'small' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="hub-dle-card-pv-bg" decoding="async" />
      ) : null}
      {/* A plain img: the owner's preview route, never the image optimiser. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img}
        src={src}
        alt=""
        className="hub-dle-card-img"
        decoding="async"
        onLoad={measure}
        onError={() => setFit({ kind: 'cover' })}
        style={fit.kind === 'small' ? { width: fit.width, height: fit.height } : undefined}
      />
    </span>
  );
}
