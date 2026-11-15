// The owner's stickers on a hub page (lib/photos/stickers.ts): a frame of the main column's width at the top of the column, each sticker
// at its place in it. Decoration only: hidden from assistive technology, no pointer events, hidden under 1240 px, no entrance motion
// when the visitor asks for less (styles/sites/hub/stickers.css). No hook: it renders the same in a server page and in a client board.
import { stickerStyle } from '@/lib/photos/stickers';

import type { PageSticker } from '@/lib/photos/stickers';

export function PageStickers({ stickers }: { stickers: readonly PageSticker[] }): React.ReactElement | null {
  if (!stickers.length) return null;
  return (
    <div aria-hidden="true" className="hub-stickers-frame">
      {stickers.map((k) => (
        // eslint-disable-next-line @next/next/no-img-element -- the owner's PNG, already made at its size in the admin
        <img key={k.key} src={k.src} alt="" width={k.settings.w} loading="lazy" decoding="async" className={k.settings.anim ? 'hub-stickers-img hub-stickers-enter' : 'hub-stickers-img'} style={stickerStyle(k.settings)} />
      ))}
    </div>
  );
}
