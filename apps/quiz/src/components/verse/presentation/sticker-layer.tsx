import { houseStickerArt } from './house-stickers';
import { spaceAssetUrl } from '@/lib/verse/presentation/asset-url';

import type { Space } from '@/lib/verse/space';
import type { StickerPlacement, StickerSlot } from '@/lib/verse/presentation/types';

// W-CUSTOM step 8 - render placed stickers at a slot. All decorative: aria-hidden,
// lazy-loaded (asset imgs), width/height set (no CLS). Transforms: scale 0.5-2,
// rotate -30..30, flip. House art is inline SVG; asset:N resolves to an uploaded
// png/webp from the public bucket. Slot positioning is the caller's job.
const BASE = 40;

function One({ s, assetMap }: { s: StickerPlacement; assetMap: Record<number, string | null> }): React.ReactElement | null {
  const size = Math.round(BASE * Math.min(Math.max(s.scale ?? 1, 0.5), 2));
  const transform = `rotate(${s.rotate ?? 0}deg) scaleX(${s.flip ? -1 : 1})`;
  const wrap: React.CSSProperties = { display: 'inline-block', width: size, height: size, transform, transformOrigin: 'center', pointerEvents: 'none' };

  if (s.id.startsWith('house:')) {
    const art = houseStickerArt(s.id);
    return art ? <span style={wrap} aria-hidden>{art}</span> : null;
  }
  const m = s.id.match(/^asset:(\d+)$/);
  if (m) {
    const url = assetMap[Number(m[1])];
    if (!url) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} loading="lazy" aria-hidden style={{ ...wrap, objectFit: 'contain' }} />;
  }
  return null;
}

export function StickerLayer({ space, slot, anchorIndex = 0 }: { space: Space; slot: StickerSlot; anchorIndex?: number }): React.ReactElement | null {
  const stickers = (space.presentation.stickers ?? []).filter((s) => s.slot === slot && (s.anchorIndex ?? 0) === anchorIndex);
  if (!stickers.length) return null;
  const assetMap: Record<number, string | null> = {};
  for (const a of space.stickerAssets) assetMap[a.id] = spaceAssetUrl(a.path);
  return <>{stickers.map((s, i) => <One key={i} s={s} assetMap={assetMap} />)}</>;
}

// Banner corners: absolutely positioned in each hero corner. Small on mobile.
const CORNERS: Record<string, React.CSSProperties> = {
  'banner-tl': { top: 8, left: 8 }, 'banner-tr': { top: 8, right: 8 },
  'banner-bl': { bottom: 8, left: 8 }, 'banner-br': { bottom: 8, right: 8 },
};
export function BannerStickers({ space }: { space: Space }): React.ReactElement | null {
  const any = (space.presentation.stickers ?? []).some((s) => s.slot.startsWith('banner-'));
  if (!any) return null;
  return (
    <>
      {(Object.keys(CORNERS) as StickerSlot[]).map((slot) => (
        <div key={slot} className="verse-sticker-corner absolute z-10" style={CORNERS[slot]} aria-hidden>
          <StickerLayer space={space} slot={slot} />
        </div>
      ))}
    </>
  );
}
